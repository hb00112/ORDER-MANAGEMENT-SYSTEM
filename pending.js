// Ensure the DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    initializeDB()
        .then(() => {
            console.log("IndexedDB initialized");
            initializeUI();
            loadPendingOrders(); // This will now also load archived orders
            startSyncCycle();
            loadDeletedOrders();
        })
        .catch(error => console.error("Error initializing IndexedDB:", error));
});
// IndexedDB setup
let db;
const DB_NAME = 'PendingOrdersDB';
const STORE_NAME = 'orders';

function initializeDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onerror = (event) => reject("IndexedDB error: " + event.target.error);
        
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            objectStore.createIndex("status", "status", { unique: false });
            objectStore.createIndex("partyName", "partyName", { unique: false });
        };
    });
}

function saveOrdersToIndexedDB(orders) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const objectStore = transaction.objectStore(STORE_NAME);
        
        orders.forEach(order => {
            objectStore.put(order);
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}
let lastSyncTime = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

function initializeUI() {
    // ... (existing code)

    // Initial sync
    syncWithFirebase();

    // Set up realtime listener for new pending orders
    setupRealtimeListener();
}

function syncWithFirebase() {
    const now = Date.now();
    if (now - lastSyncTime < SYNC_INTERVAL) {
        console.log("Sync skipped: Too soon since last sync");
        return Promise.resolve();
    }

    console.log("Syncing with Firebase...");
    lastSyncTime = now;

    return fetchOrdersFromFirebase()
        .then(firebaseOrders => {
            return updateIndexedDB(firebaseOrders);
        })
        .then(() => {
            console.log("Sync complete");
            loadPendingOrders(); // Reload the UI after sync
        })
        .catch(error => {
            console.error("Sync error:", error);
            lastSyncTime = 0; // Reset last sync time on error to allow immediate retry
        });
}

function setupRealtimeListener() {
    const ordersRef = firebase.database().ref('orders');
    ordersRef.on('child_added', (snapshot) => {
        const newOrder = snapshot.val();
        if (newOrder.status === 'Pending') {
            console.log("New pending order detected, requesting sync...");
            requestSync();
        }
    });
}

function requestSync() {
    const now = Date.now();
    if (now - lastSyncTime >= SYNC_INTERVAL) {
        syncWithFirebase();
    } else {
        const timeToNextSync = SYNC_INTERVAL - (now - lastSyncTime);
        console.log(`Sync requested, but it's too soon. Next sync in ${timeToNextSync / 1000} seconds`);
    }
}

// Call this function when the page loads or when you want to start the sync cycle
function startSyncCycle() {
    syncWithFirebase(); // Initial sync
    setInterval(requestSync, SYNC_INTERVAL); // Set up interval for future syncs
}

// Call startSyncCycle when your app initializes
document.addEventListener('DOMContentLoaded', function() {
    initializeDB()
        .then(() => {
            console.log("IndexedDB initialized");
            initializeUI();
            startSyncCycle();
        })
        .catch(error => console.error("Error initializing IndexedDB:", error));
});


function updateIndexedDB(firebaseOrders) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const objectStore = transaction.objectStore(STORE_NAME);

        // Clear existing data
        objectStore.clear();

        // Add new data
        firebaseOrders.forEach(order => {
            objectStore.add(order);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = event => reject(event.target.error);
    });
}





function getOrdersFromIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        const transaction = db.transaction([STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(STORE_NAME);
        const index = objectStore.index("status");
        const request = index.getAll("Pending");
        
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

function initializeUI() {
    const filterButton = document.getElementById('filterButton');
    const filterModal = document.getElementById('filterModal4');
    const closeBtn = filterModal.querySelector('.close4');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const saveFilterBtn = document.getElementById('saveFilterBtn');
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    const viewToggle = document.getElementById('viewToggle');

    filterButton.addEventListener('click', openFilterModal);
    closeBtn.addEventListener('click', () => closeFilterModal(false));
    selectAllBtn.addEventListener('click', selectAllPartyNames);
    deselectAllBtn.addEventListener('click', deselectAllPartyNames);
    saveFilterBtn.addEventListener('click', applyFilters);
    clearFiltersButton.addEventListener('click', clearFilters);
    viewToggle.addEventListener('change', handleViewToggle);

    window.addEventListener('click', function(event) {
        if (event.target == filterModal) {
            closeFilterModal(false);
        }
    });

    document.getElementById('pendingOrdersBody').addEventListener('click', handleOrderActions);
    updateClearFiltersButtonVisibility();

    setInterval(syncWithFirebase, 5 * 60 * 1000);
    syncWithFirebase();
    setupRealtimeListener();
    
    initializeModal();
    
    // Initial load of orders
    loadPendingOrders();
   
    document.getElementById('pendingOrdersBody').addEventListener('click', (e) => {
        if (e.target.classList.contains('done-order')) {
            openStockRemovalDetailedModal(e.target.dataset.orderId);
        }
    });
}

let currentFilters = [];



// Modify the loadPendingOrders function

let deletedOrders = {};

// Function to load pending orders
function loadPendingOrders() {
    const pendingOrdersBody = document.getElementById('pendingOrdersBody');
    const detailedHeader = document.getElementById('pendingOrdersHeadDetailed');
    const summarizedHeader = document.getElementById('pendingOrdersHeadSummarized');
    const isDetailed = document.getElementById('viewToggle').checked;
    
    console.log('View mode:', isDetailed ? 'Detailed' : 'Summarized');
    console.log('Current filters:', currentFilters);

    pendingOrdersBody.innerHTML = '<tr><td colspan="5">Loading orders...</td></tr>';
    detailedHeader.style.display = isDetailed ? '' : 'none';
    summarizedHeader.style.display = isDetailed ? 'none' : '';

    syncWithFirebase()
        .then(() => getOrdersFromIndexedDB())
        .then(orders => {
            // Filter orders based on status, quantity, and current filters
            orders = orders.filter(order => 
                order.status === 'Pending' && 
                calculateTotalQuantityForOrder(order) > 0 &&
                (currentFilters.length === 0 || currentFilters.includes(order.partyName))
            );

            if (!orders || orders.length === 0) {
                pendingOrdersBody.innerHTML = '<tr><td colspan="5">No orders found</td></tr>';
                return;
            }

            if (isDetailed) {
                displayDetailedOrders(orders, pendingOrdersBody);
            } else {
                displaySummarizedOrders(orders, pendingOrdersBody);
            }
        })
        .catch(error => {
            console.error("Error loading orders: ", error);
            pendingOrdersBody.innerHTML = '<tr><td colspan="5">Error loading orders. Please try again.</td></tr>';
        });
}
function displayOrders(orders, isDetailed) {
    console.log('Total orders:', orders.length);
    
    // Apply filters
    orders = orders.filter(order => 
        currentFilters.length === 0 || currentFilters.includes(order.partyName)
    );
    console.log('Orders after filtering:', orders.length);

    const pendingOrdersBody = document.getElementById('pendingOrdersBody');
    
    if (orders.length > 0) {
        if (isDetailed) {
            displayDetailedOrders(orders, pendingOrdersBody);
        } else {
            displaySummarizedOrders(orders, pendingOrdersBody);
        }
    } else {
        pendingOrdersBody.innerHTML = `<tr><td colspan="${isDetailed ? 5 : 3}">No pending orders found</td></tr>`;
    }
}



function fetchOrdersFromFirebase() {
    return firebase.database().ref('orders').orderByChild('status').equalTo('Pending').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                let orders = [];
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    order.id = childSnapshot.key;
                    // Process items to flatten the structure
                    if (order.items && Array.isArray(order.items)) {
                        order.items = order.items.flatMap(item => {
                            if (item.colors) {
                                return Object.entries(item.colors).map(([color, sizes]) => ({
                                    name: item.name,
                                    color: color,
                                    quantities: sizes
                                }));
                            } else {
                                return [{
                                    name: item.name,
                                    color: 'N/A',
                                    quantities: {}
                                }];
                            }
                        });
                    } else {
                        order.items = [];
                    }
                    orders.push(order);
                });
                console.log('Fetched and processed orders from Firebase:', orders);
                return orders;
            } else {
                console.log('No pending orders found in Firebase');
                return [];
            }
        })
        .catch(error => {
            console.error('Error fetching orders from Firebase:', error);
            throw error;
        });
}


function displayDetailedOrders(orders, container) {
    console.log('Displaying detailed orders. Total orders:', orders.length);
    container.innerHTML = '';
    
    orders.forEach(order => {
        const orderDate = new Date(order.dateTime).toLocaleDateString();
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-container mb-4';
        orderDiv.dataset.orderId = order.id;
        
        orderDiv.innerHTML = `
            <div class="order-header mb-2 d-flex justify-content-between align-items-center">
                <div>
                    <strong>Order No. ${order.orderNumber || 'N/A'}</strong><br>
                    Party Name: ${order.partyName || 'N/A'}<br>
                    Date: ${orderDate}
                </div>
                <div class="dropdown">
                    <button class="btn btn-secondary dropdown-toggle" type="button" id="dropdownMenuButton-${order.id}" data-bs-toggle="dropdown" aria-expanded="false">
                        ⋮
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton-${order.id}">
                        <li><a class="dropdown-item delete-order" href="#" data-order-id="${order.id}">Delete</a></li>
                    </ul>
                </div>
            </div>
            <table class="table table-sm table-bordered">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Order</th>
                        <th>SRQ</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateOrderItemRows(order.items, order.id)}
                </tbody>
            </table>
            <div class="order-actions mt-2 text-right">
                <button class="btn btn-sm btn-primary done-order" data-order-id="${order.id}" style="display: none;">Done</button>
            </div>
            <hr>
        `;
        
        container.appendChild(orderDiv);

        // Sync with current state
        if (currentOrders[order.id]) {
            updateDetailedView(order.id);
        }
    });

    // Initialize SRQ inputs after adding content to the DOM
    initializeSRQInputs(container);
    initializeDeleteButtons();
}


function generateOrderItemRows(items, orderId) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<tr><td colspan="3">No items found for this order</td></tr>';
    }
    
    return items.flatMap(item => {
        if (!item || !item.quantities || typeof item.quantities !== 'object') {
            console.warn(`Invalid item structure for order ${orderId}:`, item);
            return '';
        }

        return Object.entries(item.quantities).map(([size, quantity]) => {
            const srqValue = item.srq && item.srq[size] ? item.srq[size] : 0;
            return `
                <tr>
                    <td>${item.name || 'Unknown'}(${item.color || 'N/A'})</td>
                    <td>${size}/${quantity}</td>
                    <td>
                        <div class="srq-input-group" data-max="${quantity}" data-item="${item.name || 'Unknown'}" data-color="${item.color || 'N/A'}" data-size="${size}">
                            <button class="btn btn-sm btn-outline-secondary srq-decrease">-</button>
                            <input type="number" class="form-control srq-input" value="${srqValue}" min="0" max="${quantity}">
                            <button class="btn btn-sm btn-outline-secondary srq-increase">+</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }).join('');
}
function generateOrderItemRows(items, orderId) {
    if (!items || !Array.isArray(items)) return '<tr><td colspan="3">No items</td></tr>';
    
    return items.flatMap(item => {
        return Object.entries(item.quantities || {}).map(([size, quantity]) => {
            const srqValue = item.srq && item.srq[size] ? item.srq[size] : 0;
            return `
                <tr>
                    <td>${item.name}(${item.color || 'N/A'})</td>
                    <td>${size}/${quantity}</td>
                    <td>
                        <div class="srq-input-group" data-max="${quantity}" data-item="${item.name}" data-color="${item.color}" data-size="${size}">
                            <button class="btn btn-sm btn-outline-secondary srq-decrease">-</button>
                            <input type="number" class="form-control srq-input" value="${srqValue}" min="0" max="${quantity}">
                            <button class="btn btn-sm btn-outline-secondary srq-increase">+</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }).join('');
}
function generateOrderItemRowsWithPending(items, orderId) {
    return items.flatMap(item => {
        return Object.entries(item.quantities || {}).map(([size, quantity]) => {
            const srqValue = item.srq && item.srq[size] ? item.srq[size] : 0;
            const pendingValue = quantity - srqValue;
            return `
                <tr>
                    <td>${item.name} (${item.color || 'N/A'})</td>
                    <td>${size}/${quantity}</td>
                    <td>
                        <div class="srq-input-group" data-max="${quantity}" data-item="${item.name}" data-color="${item.color}" data-size="${size}">
                            <button class="btn btn-sm btn-outline-secondary srq-decrease">-</button>
                            <input type="number" class="form-control srq-input" value="${srqValue}" min="0" max="${quantity}">
                            <button class="btn btn-sm btn-outline-secondary srq-increase">+</button>
                        </div>
                    </td>
                    <td class="pending-value">${pendingValue}</td>
                </tr>
            `;
        });
    }).join('');
}

function saveSRQValue(orderId, itemName, color, size, value) {
    // Update in IndexedDB
    getOrderById(orderId)
        .then(order => {
            const item = order.items.find(i => i.name === itemName && i.color === color);
            if (item) {
                if (!item.srq) item.srq = {};
                item.srq[size] = value;
                return saveOrdersToIndexedDB([order]);
            }
        })
        .then(() => {
            // Update in Firebase
            const orderRef = firebase.database().ref('orders').child(orderId);
            return orderRef.once('value')
                .then(snapshot => {
                    const firebaseOrder = snapshot.val();
                    const item = firebaseOrder.items.find(i => i.name === itemName && i.color === color);
                    if (item) {
                        if (!item.srq) item.srq = {};
                        item.srq[size] = value;
                        return orderRef.update({ items: firebaseOrder.items });
                    }
                });
        })
        .catch(error => console.error("Error saving SRQ value:", error));
}
function initializeSRQInputs(modal) {
    modal.querySelectorAll('.srq-input-group').forEach(group => {
        const input = group.querySelector('.srq-input');
        const decreaseBtn = group.querySelector('.srq-decrease');
        const increaseBtn = group.querySelector('.srq-increase');
        const max = parseInt(group.dataset.max);

        function updateSRQValue() {
            const value = parseInt(input.value);
            const orderId = modal.dataset.orderId;
            const itemName = group.dataset.item;
            const color = group.dataset.color;
            const size = group.dataset.size;
            updateOrderState(orderId, itemName, color, size, value);
            updateTotals(modal);
        }

        decreaseBtn.addEventListener('click', () => {
            if (parseInt(input.value) > 0) {
                input.value = parseInt(input.value) - 1;
                updateSRQValue();
            }
        });

        increaseBtn.addEventListener('click', () => {
            if (parseInt(input.value) < max) {
                input.value = parseInt(input.value) + 1;
                updateSRQValue();
            }
        });

        input.addEventListener('input', () => {
            let value = parseInt(input.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            if (value > max) value = max;
            input.value = value;
            updateSRQValue();
        });
    });
}
// Modified initializeSRQInputs function
function initializeSRQInputs(container = document) {
    container.querySelectorAll('.srq-input-group').forEach(group => {
        const input = group.querySelector('.srq-input');
        const decreaseBtn = group.querySelector('.srq-decrease');
        const increaseBtn = group.querySelector('.srq-increase');
        const max = parseInt(group.dataset.max);
        const itemName = group.dataset.item;
        const color = group.dataset.color;
        const size = group.dataset.size;
        const orderId = group.closest('[data-order-id]').dataset.orderId;

        function updateSRQValue() {
            const value = parseInt(input.value);
            updateOrderState(orderId, itemName, color, size, value);
            updateAllViews(orderId);
        }

        decreaseBtn.addEventListener('click', () => {
            if (parseInt(input.value) > 0) {
                input.value = parseInt(input.value) - 1;
                updateSRQValue();
            }
        });

        increaseBtn.addEventListener('click', () => {
            if (parseInt(input.value) < max) {
                input.value = parseInt(input.value) + 1;
                updateSRQValue();
            }
        });

        input.addEventListener('input', () => {
            let value = parseInt(input.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            if (value > max) value = max;
            input.value = value;
            updateSRQValue();
        });
    });
}
// Function to update all views
function updateAllViews(orderId) {
    updateDetailedView(orderId);
    updateStockRemovalDetailedModal(orderId);
}

// Function to update the detailed view
function updateDetailedView(orderId) {
    console.log(`Updating detailed view for order: ${orderId}`);
    const orderContainer = document.querySelector(`.order-container[data-order-id="${orderId}"]`);
    if (orderContainer) {
        const srqInputs = orderContainer.querySelectorAll('.srq-input');
        srqInputs.forEach(input => {
            const group = input.closest('.srq-input-group');
            const itemName = group.dataset.item;
            const color = group.dataset.color;
            const size = group.dataset.size;
            
            console.log(`Updating SRQ for: Item=${itemName}, Color=${color}, Size=${size}`);
            
            if (!currentOrders[orderId]) {
                console.warn(`No data for orderId: ${orderId} in currentOrders`);
                return;
            }
            if (!currentOrders[orderId][itemName]) {
                console.warn(`No data for itemName: ${itemName} in order ${orderId}`);
                return;
            }
            if (!currentOrders[orderId][itemName][color]) {
                console.warn(`No data for color: ${color} in item ${itemName} of order ${orderId}`);
                return;
            }
            
            const value = currentOrders[orderId][itemName][color][size] || 0;
            console.log(`Setting SRQ value to: ${value}`);
            input.value = value;
        });
        updateDoneButtonVisibility(orderContainer);
    } else {
        console.warn(`Order container not found for orderId: ${orderId}`);
    }
}

// Function to update the stock removal detailed modal
function updateStockRemovalDetailedModal(orderId) {
    const modal = document.querySelector('.stock-removal-detailed-modal');
    if (modal && modal.dataset.orderId === orderId) {
        const srqInputs = modal.querySelectorAll('.srq-input');
        srqInputs.forEach(input => {
            const group = input.closest('.srq-input-group');
            const itemName = group.dataset.item;
            const color = group.dataset.color;
            const size = group.dataset.size;
            const value = currentOrders[orderId][itemName][color][size] || 0;
            input.value = value;
        });
        updateTotals(modal);
    }
}



function updateDoneButtonVisibility(orderContainer) {
    const doneButton = orderContainer.querySelector('.done-order');
    const srqInputs = orderContainer.querySelectorAll('.srq-input');
    const hasNonZeroInput = Array.from(srqInputs).some(input => parseInt(input.value) > 0);
    doneButton.style.display = hasNonZeroInput ? 'inline-block' : 'none';
}

function getOrderById(orderId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }
        const transaction = db.transaction([STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(orderId);
        
        request.onsuccess = (event) => {
            const order = event.target.result;
            if (order) {
                resolve(order);
            } else {
                reject(new Error("Order not found"));
            }
        };
        request.onerror = (event) => reject(event.target.error);
    });
}
function openStockRemovalDetailedModal(orderId) {
    console.log('Opening detailed modal for order:', orderId);
    
    // Close any existing detailed modals
    const existingModal = document.querySelector('.stock-removal-detailed-modal');
    if (existingModal && existingModal.parentNode) {
        existingModal.parentNode.removeChild(existingModal);
    }

    // Initialize or reset the current order state
    if (!currentOrders[orderId]) {
        currentOrders[orderId] = {};
    }

    getOrderById(orderId)
        .then(order => {
            console.log('Retrieved order:', order);
            
            // Initialize the current order state
            order.items.forEach(item => {
                const itemName = item.name;
                const color = item.color || 'N/A';
                if (!currentOrders[orderId][itemName]) {
                    currentOrders[orderId][itemName] = {};
                }
                currentOrders[orderId][itemName][color] = {};
                Object.keys(item.quantities || {}).forEach(size => {
                    // Initialize with existing SRQ values if available
                    currentOrders[orderId][itemName][color][size] = 
                        item.srq && item.srq[size] ? item.srq[size] : 0;
                });
            });

            // Create modal element
            const modal = document.createElement('div');
            modal.className = 'stock-removal-detailed-modal';
            modal.dataset.orderId = orderId;
            
            const orderDate = new Date(order.dateTime).toLocaleDateString();
            const today = new Date();
            const daysSinceOrder = Math.ceil((today - new Date(order.dateTime)) / (1000 * 60 * 60 * 24));

            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">${order.partyName || 'N/A'}</h2>
                        <button type="button" class="close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="order-info">
                            <span class="order-date">Date: ${orderDate}</span>
                            <span class="order-number">Order No: ${order.orderNumber || 'N/A'}</span>
                            <span class="days-ago">${daysSinceOrder} days ago</span>
                        </div>
                        <div class="table-container" style="max-height: 60vh; overflow-y: auto;">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Order</th>
                                        <th>SRQ</th>
                                        <th>P</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${generateOrderItemRowsWithPending(order.items, orderId)}
                                </tbody>
                            </table>
                        </div>
                        <div class="total-section">
                            <div class="total-header">T O T A L</div>
                            <div class="total-row">
                                <div class="total-item">
                                    <span>Total Order</span>
                                    <span id="totalOrder">0pc</span>
                                </div>
                                <div class="total-item">
                                    <span>Total Removed</span>
                                    <span id="totalRemoved">0pc</span>
                                </div>
                                <div class="total-item">
                                    <span>Total Pending</span>
                                    <span id="totalPending">0pc</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary send-to-billing-btn">Send to Billing</button>
                    </div>
                </div>
            `;

            // Append modal to body
            document.body.appendChild(modal);

            // Initialize event listeners
            const closeBtn = modal.querySelector('.close');
            closeBtn.addEventListener('click', () => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });

            const sendToBillingBtn = modal.querySelector('.send-to-billing-btn');
            sendToBillingBtn.addEventListener('click', () => {
                sendToBilling(orderId);
            });

            // Initialize SRQ inputs and update totals
            initializeSRQInputs(modal);
            updateTotals(modal);

            // Update the UI to reflect current state
            order.items.forEach(item => {
                if (item.srq) {
                    Object.entries(item.srq).forEach(([size, value]) => {
                        const input = modal.querySelector(`.srq-input-group[data-item="${item.name}"][data-color="${item.color || 'N/A'}"][data-size="${size}"] .srq-input`);
                        if (input) {
                            input.value = value;
                        }
                    });
                }
            });

            // Final update of totals
            updateTotals(modal);
        })
        .catch(error => {
            console.error("Error opening stock removal detailed modal:", error);
            alert("Error opening stock removal detailed modal. Please try again.");
        });
}

let currentOrders = {};

function generateModalItemRows(items) {
    return items.flatMap(item => {
        return Object.entries(item.quantities || {}).map(([size, quantity]) => `
            <tr>
                <td>${item.name} (${item.color || 'N/A'})</td>
                <td>${size}/${quantity}</td>
                <td>
                    <div class="srq-input-group" data-max="${quantity}" data-item="${item.name}" data-color="${item.color}" data-size="${size}">
                        <button class="btn btn-sm btn-outline-secondary srq-decrease">-</button>
                        <input type="number" class="form-control srq-input" value="0" min="0" max="${quantity}">
                        <button class="btn btn-sm btn-outline-secondary srq-increase">+</button>
                    </div>
                </td>
            </tr>
        `);
    }).join('');
}

function enableSRQModification(modal) {
    const srqInputGroups = modal.querySelectorAll('.srq-input-group');
    srqInputGroups.forEach(group => {
        const input = group.querySelector('.srq-input');
        const decreaseBtn = group.querySelector('.srq-decrease');
        const increaseBtn = group.querySelector('.srq-increase');
        const max = parseInt(group.dataset.max);

        decreaseBtn.addEventListener('click', () => {
            if (input.value > 0) {
                input.value = parseInt(input.value) - 1;
                updateTotals(modal);
            }
        });

        increaseBtn.addEventListener('click', () => {
            if (parseInt(input.value) < max) {
                input.value = parseInt(input.value) + 1;
                updateTotals(modal);
            }
        });

        input.addEventListener('input', () => {
            let value = parseInt(input.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            if (value > max) value = max;
            input.value = value;
            updateTotals(modal);
        });
    });
}

function updateTotals(modal) {
    let totalOrder = 0;
    let totalRemoved = 0;
    let totalPending = 0;

    modal.querySelectorAll('.srq-input').forEach(input => {
        const row = input.closest('tr');
        const [, quantity] = row.querySelector('td:nth-child(2)').textContent.split('/');
        const srqValue = parseInt(input.value) || 0;
        const pendingValue = parseInt(quantity) - srqValue;

        totalOrder += parseInt(quantity);
        totalRemoved += srqValue;
        totalPending += pendingValue;

        row.querySelector('.pending-value').textContent = pendingValue;
    });

    modal.querySelector('#totalOrder').textContent = `${totalOrder}pc`;
    modal.querySelector('#totalRemoved').textContent = `${totalRemoved}pc`;
    modal.querySelector('#totalPending').textContent = `${totalPending}pc`;
}

function displaySummarizedOrders(orders, container) {
    console.log('Displaying summarized orders. Total orders:', orders.length);
    container.innerHTML = '';
    const groupedOrders = groupOrdersByParty(orders);
    console.log('Grouped orders:', groupedOrders);
    
    for (const [partyName, group] of Object.entries(groupedOrders)) {
        const totalQty = group.reduce((sum, order) => sum + calculateTotalQuantityForOrder(order), 0);
        const itemNames = getUniqueItemNames(group);
        
        console.log('Creating row for:', partyName, 'Total Quantity:', totalQty, 'Items:', itemNames);
        const row = document.createElement('tr');
        
        // Check if any order in the group has been sent to billing
        const sentToBilling = group.some(order => order.status === 'Sent to Billing');
        if (sentToBilling) {
            row.classList.add('sent-to-billing');
        }
        
        row.innerHTML = `
            <td>${partyName}</td>
            <td>
                <span class="item-names">${itemNames}</span>
            </td>
            <td>${totalQty}</td>
        `;
        row.addEventListener('click', () => {
            openStockRemovalModal(partyName, group);
        });
        container.appendChild(row);
    }
}
function openStockRemovalModal(partyName, orders) {
    console.log('Opening modal for party:', partyName);
    console.log('Orders:', orders);

    const modal = document.getElementById('stockRemovalModal');
    const modalContent = document.querySelector('#stockRemovalModal .modal-content');
    const modalBody = document.querySelector('#stockRemovalModal .modal-body');
    
    // Set modal title
    document.querySelector('#stockRemovalModal .modal-title').textContent = partyName;
    
    // Create content for each order
    let modalHTML = '';
    orders.forEach((order, index) => {
        const orderDate = new Date(order.dateTime);
        const today = new Date();
        const daysSinceOrder = Math.ceil((today - orderDate) / (1000 * 60 * 60 * 24));
        
        modalHTML += `
            <div class="order-header" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-size: 1.1em; color: #007bff;"> ${orderDate.toLocaleDateString()}</span>
                <span style="font-size: 1.1em; color: #28a745;"> ${order.orderNumber || 'N/A'}</span>
                <span style="font-size: 1.1em; color: #e73838;"> ${daysSinceOrder} days ago</span>
            </div>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Item Name & Color</th>
                        <th>Sizes</th>
                        <th>SRQ</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const sizesWithQuantities = Object.entries(item.quantities || {})
                    .map(([size, quantity]) => `${size}/${quantity}`)
                    .join(', ');
                const totalQuantity = Object.values(item.quantities || {}).reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
                
                modalHTML += `
                    <tr>
                        <td>${item.name}(${item.color || 'N/A'})</td>
                        <td class="sizes-cell">${sizesWithQuantities}</td>
                        <td>${totalQuantity}</td>
                    </tr>
                `;
            });
        } else {
            modalHTML += '<tr><td colspan="3">No items found or error in data structure</td></tr>';
        }
        
        modalHTML += `
                </tbody>
            </table>
        `;
        
        if (index < orders.length - 1) {
            modalHTML += '<hr>'; // Add a separator between orders
        }
    });
    
    modalBody.innerHTML = modalHTML;
    
    // Set modal to full screen with small margins
    modalContent.style.width = '98%';
    modalContent.style.height = '96%';
    modalContent.style.margin = '1% auto';
    
    modal.style.display = 'block';
}
function handleArchivedOrderBilling(orderId) {
    // Close the stock removal modal
    const stockRemovalModal = document.getElementById('stockRemovalModal');
    stockRemovalModal.style.display = 'none';
    
    // Open the detailed modal for billing
    openStockRemovalDetailedModal(orderId);
}

function initializeModal() {
    const modal = document.getElementById('stockRemovalModal');
    if (!modal) {
        console.error('Stock removal modal not found in the DOM');
        return;
    }

    const closeBtn = modal.querySelector('.close');
    if (!closeBtn) {
        console.error('Close button not found in the stock removal modal');
        return;
    }
    
    closeBtn.onclick = function() {
        modal.style.display = "none";
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function createOrderRow(order, orderId, isDetailed) {
    const row = document.createElement('tr');
    
    // Add a class if the order has been sent to billing
    if (order.status === 'Sent to Billing') {
        row.classList.add('sent-to-billing');
    }
    
    if (isDetailed) {
        row.innerHTML = `
            <td>${order.orderNumber || 'N/A'}</td>
            <td>${order.partyName || 'N/A'}</td>
            <td class="order-items">${getItemsSummary(order.items)}</td>
            <td>${order.status || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary view-order" data-order-id="${orderId}">View</button>
                <button class="btn btn-sm btn-success complete-order" data-order-id="${orderId}">Mark for Billing</button>
            </td>
        `;
    } else {
        const orderDate = new Date(order.dateTime).toLocaleDateString();
        const totalQty = getTotalQuantity(order.items);
        
        row.innerHTML = `
            <td>${orderDate}</td>
            <td>${order.partyName || 'N/A'}</td>
            <td>${totalQty}</td>
        `;
    }
    
    return row;
}

function viewOrderDetails(orderId) {
    firebase.database().ref('orders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            console.log("Order details:", order);
            // Implement modal display logic here
        })
        .catch(error => {
            console.error("Error fetching order details: ", error);
        });
}


//___________BILLING OPERATION______________________
// First, let's modify the sendToBilling function to handle both detailed and archived orders consistently
function sendToBilling(orderId) {
    console.log('Sending to billing, orderId:', orderId);
    
    // Get current SRQ values from the modal
    const modal = document.querySelector(`.stock-removal-detailed-modal[data-order-id="${orderId}"]`);
    if (!modal) {
        console.error('Modal not found for orderId:', orderId);
        return;
    }

    const srqValues = {};
    modal.querySelectorAll('.srq-input-group').forEach(group => {
        const input = group.querySelector('.srq-input');
        const itemName = group.dataset.item;
        const color = group.dataset.color;
        const size = group.dataset.size;
        
        if (!srqValues[itemName]) srqValues[itemName] = {};
        if (!srqValues[itemName][color]) srqValues[itemName][color] = {};
        srqValues[itemName][color][size] = parseInt(input.value) || 0;
    });

    console.log('Collected SRQ values:', srqValues);

    // Fetch the order from Firebase and process it
    firebase.database().ref('orders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            if (!order) {
                throw new Error('Order not found');
            }

            // Ensure order has an ID
            order.id = order.id || orderId;

            console.log('Original order:', order);

            // Create the billing order
            const billingOrder = createBillingOrder(order, srqValues);
            console.log('Created billing order:', billingOrder);

            // Update the pending order
            const updatedPendingOrder = updatePendingOrder(order, srqValues);
            console.log('Updated pending order:', updatedPendingOrder);

            // Prepare the database updates
            const updates = {};
            
            // Generate a unique ID for the billing order
            const billingOrderId = `${orderId}_${Date.now()}`;
            
            // Only update the pending order if there are remaining items
            if (updatedPendingOrder.items.length > 0) {
                updates[`orders/${orderId}`] = updatedPendingOrder;
            } else {
                // If no items remain, remove the order from 'orders'
                updates[`orders/${orderId}`] = null;
            }

            // Always add to billingOrders
            updates[`billingOrders/${billingOrderId}`] = billingOrder;

            // Perform the database updates
            return firebase.database().ref().update(updates);
        })
        .then(() => {
            console.log(`Order ${orderId} sent to billing successfully`);
            
            // Safely close all modals
            closeAllModals();
            
            // Refresh the orders display
            loadPendingOrders();
            
           
        })
        .catch(error => {
            console.error("Error sending order to billing: ", error);
            alert("Error sending order to billing. Please try again.");
        });
}

// Add these new helper functions for modal handling
function closeAllModals() {
    // Close the stock removal detailed modal
    const detailedModal = document.querySelector('.stock-removal-detailed-modal');
    if (detailedModal && detailedModal.parentNode) {
        detailedModal.parentNode.removeChild(detailedModal);
    }
    
    // Close the stock removal modal
    const stockRemovalModal = document.getElementById('stockRemovalModal');
    if (stockRemovalModal) {
        stockRemovalModal.style.display = 'none';
    }
}

function createBillingOrder(order, srqValues) {
    const billingOrder = {
        ...order,
        id: `${order.id}_${Date.now()}`,
        status: 'billing',
        originalOrderId: order.id,  // Ensure this is set
        dateTime: new Date().toISOString(),
        billingDate: new Date().toISOString(),
        items: [],
        totalQuantity: 0
    };

    billingOrder.items = order.items
        .map(item => {
            const billingItem = {
                name: item.name,
                color: item.color || 'N/A',
                quantities: {},
                originalQuantities: {...item.quantities}
            };

            let itemHasQuantities = false;
            
            Object.keys(item.quantities || {}).forEach(size => {
                const srqValue = srqValues[item.name]?.[item.color || 'N/A']?.[size] || 0;
                if (srqValue > 0) {
                    billingItem.quantities[size] = srqValue;
                    billingOrder.totalQuantity += srqValue;
                    itemHasQuantities = true;
                }
            });

            return itemHasQuantities ? billingItem : null;
        })
        .filter(item => item !== null);

    return billingOrder;
}
// Update the updatePendingOrder function to correctly handle remaining quantities
function updatePendingOrder(order, srqValues) {
    const updatedOrder = {
        ...order,
        items: [],
        totalQuantity: 0
    };

    updatedOrder.items = order.items
        .map(item => {
            const updatedItem = {
                ...item,
                quantities: {...item.quantities}
            };
            
            let itemHasRemainingQuantities = false;
            
            Object.keys(item.quantities || {}).forEach(size => {
                const originalQty = item.quantities[size];
                const srqValue = srqValues[item.name]?.[item.color || 'N/A']?.[size] || 0;
                const remainingQty = originalQty - srqValue;
                
                if (remainingQty > 0) {
                    updatedItem.quantities[size] = remainingQty;
                    updatedOrder.totalQuantity += remainingQty;
                    itemHasRemainingQuantities = true;
                } else {
                    delete updatedItem.quantities[size];
                }
            });

            return itemHasRemainingQuantities ? updatedItem : null;
        })
        .filter(item => item !== null);

    return updatedOrder;
}

function markForBilling(orderId) {
    firebase.database().ref('orders').child(orderId).update({ status: 'Waiting for Billing' })
        .then(() => {
            console.log("Order marked for billing successfully");
            loadPendingOrders();
        })
        .catch(error => {
            console.error("Error marking order for billing: ", error);
        });
}

function getCurrentSRQValues(orderId) {
    // This function should return the current SRQ values from your UI
    // You'll need to implement this based on how you're storing the SRQ values in your UI
    // For example:
    const srqInputs = document.querySelectorAll(`[data-order-id="${orderId}"] .srq-input`);
    const srqValues = {};
    srqInputs.forEach(input => {
        const group = input.closest('.srq-input-group');
        const itemName = group.dataset.item;
        const color = group.dataset.color;
        const size = group.dataset.size;
        if (!srqValues[itemName]) srqValues[itemName] = {};
        if (!srqValues[itemName][color]) srqValues[itemName][color] = {};
        srqValues[itemName][color][size] = parseInt(input.value) || 0;
    });
    return srqValues;
}

//_____________Order Processing____________

function calculateTotalQuantityForOrder(order) {
    if (order.totalQuantity) return order.totalQuantity;
    
    return order.items ? order.items.reduce((total, item) => {
        return total + Object.values(item.quantities || {}).reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
    }, 0) : 0;
}
function calculateTotalOrder(items) {
    return items.reduce((total, item) => total + Object.values(item.quantities || {}).reduce((sum, qty) => sum + parseInt(qty), 0), 0);
}

function calculateTotalRemoved(items) {
    return items.reduce((total, item) => total + (item.srq || 0), 0);
}

function calculateTotalPending(items) {
    return calculateTotalOrder(items) - calculateTotalRemoved(items);
}
function getUniqueItems(orders) {
    console.log('Orders received:', orders);
    const uniqueItems = new Map();
    orders.forEach(order => {
        console.log('Processing order:', order);
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                console.log('Processing item:', item);
                const key = `${item.name}-${item.color || 'N/A'}`;
                if (!uniqueItems.has(key)) {
                    uniqueItems.set(key, {
                        name: item.name,
                        color: item.color || 'N/A',
                        sizes: new Set()
                    });
                }
                if (item.quantities) {
                    console.log('Item quantities:', item.quantities);
                    Object.keys(item.quantities).forEach(size => {
                        if (item.quantities[size] > 0) {
                            uniqueItems.get(key).sizes.add(size);
                        }
                    });
                } else {
                    console.warn('No quantities found for item:', item);
                }
            });
        } else {
            console.warn('No items array found in order:', order);
        }
    });
    const result = Array.from(uniqueItems.values()).map(item => ({
        ...item,
        sizes: Array.from(item.sizes).sort()
    }));
    console.log('Unique items result:', result);
    return result;
}
function getUniqueItemNames(orders) {
    const uniqueItems = new Set();
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                if (item.name) {
                    uniqueItems.add(item.name);
                }
            });
        }
    });
    return Array.from(uniqueItems).join(', ');
}
function groupOrdersBySummary(orders) {
    console.log('Grouping orders for summary');
    const groups = orders.reduce((groups, order) => {
        const date = new Date(order.dateTime).toLocaleDateString();
        const key = `${date}|${order.partyName}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(order);
        console.log('Added order to group:', key, 'Group size:', groups[key].length, 'Total Quantity:', order.totalQuantity);
        return groups;
    }, {});
    console.log('Grouping complete. Total groups:', Object.keys(groups).length);
    return groups;
}
function groupOrdersByParty(orders) {
    return orders.reduce((groups, order) => {
        if (!groups[order.partyName]) {
            groups[order.partyName] = [];
        }
        groups[order.partyName].push(order);
        return groups;
    }, {});
}
function getItemsSummary(items) {
    if (!items || !Array.isArray(items)) return 'No items';
    
    return items.map(item => 
        `${item.name} (${Object.entries(item.quantities || {}).map(([size, qty]) => `${size}/${qty}`).join(', ')})`
    ).join('; ');
}

function getTotalQuantity(items) {
    console.log('Calculating total quantity for items:', items);
    if (!items || !Array.isArray(items)) {
        console.warn('Invalid items array:', items);
        return 0;
    }
    
    return items.reduce((total, item, index) => {
        console.log(`Processing item ${index}:`, item);
        if (!item || typeof item !== 'object') {
            console.warn(`Invalid item at index ${index}:`, item);
            return total;
        }
        
        const itemTotal = Object.values(item.quantities || {}).reduce((sum, qty) => {
            const parsedQty = parseInt(qty);
            console.log(`Quantity: ${qty}, Parsed: ${parsedQty}`);
            return sum + (isNaN(parsedQty) ? 0 : parsedQty);
        }, 0);
        
        console.log(`Total quantity for item ${index}:`, itemTotal);
        return total + itemTotal;
    }, 0);
}
function updateOrderState(orderId, itemName, color, size, srqValue) {
    console.log(`Updating order state: Order=${orderId}, Item=${itemName}, Color=${color}, Size=${size}, SRQ=${srqValue}`);
    
    if (!currentOrders[orderId]) {
        currentOrders[orderId] = {};
    }
    if (!currentOrders[orderId][itemName]) {
        currentOrders[orderId][itemName] = {};
    }
    if (!currentOrders[orderId][itemName][color]) {
        currentOrders[orderId][itemName][color] = {};
    }
    currentOrders[orderId][itemName][color][size] = srqValue;

    console.log('Current state of order:', JSON.stringify(currentOrders[orderId], null, 2));

    // Update IndexedDB and Firebase
    saveSRQValue(orderId, itemName, color, size, srqValue);
}
//DELETE ORDER

// Function to initialize delete buttons
function initializeDeleteButtons() {
    document.querySelectorAll('.delete-order').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const orderId = this.dataset.orderId;
            deleteOrder(orderId);
        });
    });
}

// Function to delete an order
function deleteOrder(orderId) {
    const reason = prompt("Please enter the reason for deleting this order:");
    if (reason === null) return; // User cancelled

    const confirmed = confirm("Are you sure you want to delete this order?");
    if (!confirmed) return;

    firebase.database().ref('orders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            if (!order) throw new Error('Order not found');

            // Add deletion information
            order.deletionReason = reason;
            order.deletionDate = new Date().toISOString();

            // Move to deletedOrders in Firebase
            return firebase.database().ref('deletedOrders').child(orderId).set(order)
                .then(() => firebase.database().ref('orders').child(orderId).remove());
        })
        .then(() => {
            console.log(`Order ${orderId} deleted successfully`);
            loadPendingOrders(); // Refresh the orders list
            loadDeletedOrders(); // Refresh the deleted orders list
        })
        .catch(error => {
            console.error("Error deleting order: ", error);
            alert("Error deleting order. Please try again.");
        });
}

// Function to load deleted orders
function loadDeletedOrders() {
    const deletedOrdersContainer = document.getElementById('deletedOrders');
    deletedOrdersContainer.innerHTML = '<p>Loading deleted orders...</p>';

    firebase.database().ref('deletedOrders').once('value')
        .then(snapshot => {
            const orders = [];
            snapshot.forEach(childSnapshot => {
                const order = childSnapshot.val();
                order.id = childSnapshot.key;
                orders.push(order);
            });
            displayDeletedOrders(orders, deletedOrdersContainer);
        })
        .catch(error => {
            console.error("Error loading deleted orders: ", error);
            deletedOrdersContainer.innerHTML = '<p>Error loading deleted orders. Please try again.</p>';
        });
}

// Function to display deleted orders
function displayDeletedOrders(orders, container) {
    if (orders.length === 0) {
        container.innerHTML = '<p>No deleted orders found.</p>';
        return;
    }

    let html = '<table class="table"><thead><tr><th>Order No.</th><th>Party Name</th><th>Deletion Date</th><th>Reason</th><th>Actions</th></tr></thead><tbody>';
    
    orders.forEach(order => {
        const deletionDate = new Date(order.deletionDate);
        const daysUntilPermanentDeletion = 20 - Math.floor((new Date() - deletionDate) / (1000 * 60 * 60 * 24));
        
        html += `
            <tr>
                <td>${order.orderNumber || 'N/A'}</td>
                <td>${order.partyName || 'N/A'}</td>
                <td>${deletionDate.toLocaleDateString()}</td>
                <td>${order.deletionReason || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-danger permanent-delete" data-order-id="${order.id}">Permanently Delete</button>
                    <button class="btn btn-sm btn-primary restore-order" data-order-id="${order.id}">Restore to Pending</button>
                    <br><small>${daysUntilPermanentDeletion} days until permanent deletion</small>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Initialize buttons for deleted orders
    initializeDeletedOrderButtons();
}

// Function to initialize buttons for deleted orders
function initializeDeletedOrderButtons() {
    document.querySelectorAll('.permanent-delete').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.dataset.orderId;
            permanentlyDeleteOrder(orderId);
        });
    });

    document.querySelectorAll('.restore-order').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.dataset.orderId;
            restoreOrder(orderId);
        });
    });
}

// Function to permanently delete an order
function permanentlyDeleteOrder(orderId) {
    const confirmed = confirm("Are you sure you want to permanently delete this order? This action cannot be undone.");
    if (!confirmed) return;

    firebase.database().ref('deletedOrders').child(orderId).remove()
        .then(() => {
            console.log(`Order ${orderId} permanently deleted`);
            loadDeletedOrders(); // Refresh the deleted orders list
        })
        .catch(error => {
            console.error("Error permanently deleting order: ", error);
            alert("Error permanently deleting order. Please try again.");
        });
}

// Function to restore an order to pending
function restoreOrder(orderId) {
    firebase.database().ref('deletedOrders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            if (!order) throw new Error('Order not found');

            // Remove deletion information
            delete order.deletionReason;
            delete order.deletionDate;

            // Move back to orders in Firebase
            return firebase.database().ref('orders').child(orderId).set(order)
                .then(() => firebase.database().ref('deletedOrders').child(orderId).remove());
        })
        .then(() => {
            console.log(`Order ${orderId} restored to pending`);
            loadPendingOrders(); // Refresh the pending orders list
            loadDeletedOrders(); // Refresh the deleted orders list
        })
        .catch(error => {
            console.error("Error restoring order: ", error);
            alert("Error restoring order. Please try again.");
        });
}

// Function to automatically delete orders after 20 days
function cleanupDeletedOrders() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 20);

    firebase.database().ref('deletedOrders').once('value')
        .then(snapshot => {
            const updates = {};
            snapshot.forEach(childSnapshot => {
                const order = childSnapshot.val();
                const deletionDate = new Date(order.deletionDate);
                if (deletionDate < cutoffDate) {
                    updates[childSnapshot.key] = null;
                }
            });
            return firebase.database().ref('deletedOrders').update(updates);
        })
        .then(() => {
            console.log("Cleanup of old deleted orders complete");
        })
        .catch(error => {
            console.error("Error during cleanup of deleted orders: ", error);
        });
}

// Run cleanup function periodically (e.g., once a day)
setInterval(cleanupDeletedOrders, 24 * 60 * 60 * 1000);
//FILTER
function loadPartyNames() {
    const partyNameList = document.getElementById('partyNameList');
    partyNameList.innerHTML = '';

    getOrdersFromIndexedDB()
        .then(orders => {
            if (orders && orders.length > 0) {
                const partyNames = new Set();
                orders.forEach(order => {
                    if (order.status === 'Pending' && order.partyName && calculateTotalQuantityForOrder(order) > 0) {
                        partyNames.add(order.partyName);
                    }
                });
                
                if (partyNames.size > 0) {
                    partyNames.forEach(partyName => {
                        const button = document.createElement('button');
                        button.textContent = partyName;
                        button.classList.add('party-name-btn');
                        button.classList.toggle('selected', currentFilters.includes(partyName));
                        button.addEventListener('click', togglePartyNameSelection);
                        partyNameList.appendChild(button);
                    });
                } else {
                    partyNameList.innerHTML = '<p>No party names found for pending orders</p>';
                }
            } else {
                partyNameList.innerHTML = '<p>No orders found</p>';
            }
        })
        .catch(error => {
            console.error("Error loading party names: ", error);
            partyNameList.innerHTML = '<p>Error loading party names</p>';
        });
}

function togglePartyNameSelection(event) {
    event.target.classList.toggle('selected');
    updateSelectionCount();
}

function updateSelectionCount() {
    const selectedParties = document.querySelectorAll('.party-name-btn.selected');
    const selectionCountElement = document.getElementById('selectionCount');
    selectionCountElement.textContent = `${selectedParties.length} parties selected`;
}

function selectAllPartyNames() {
    const partyNameButtons = document.querySelectorAll('.party-name-btn');
    partyNameButtons.forEach(button => button.classList.add('selected'));
    updateSelectionCount();
}

function deselectAllPartyNames() {
    const partyNameButtons = document.querySelectorAll('.party-name-btn');
    partyNameButtons.forEach(button => button.classList.remove('selected'));
    updateSelectionCount();
}

function applyFilters() {
    currentFilters = Array.from(document.querySelectorAll('.party-name-btn.selected')).map(btn => btn.textContent);
    
    if (currentFilters.length === 0) {
        showMessage('No filter selected');
        return;
    }
    
    document.getElementById('filterButton').classList.toggle('active', currentFilters.length > 0);
    closeFilterModal(true);
    updateClearFiltersButtonVisibility();
    loadPendingOrders(); // Reload orders with new filters
}

function clearFilters() {
    currentFilters = [];
    document.getElementById('filterButton').classList.remove('active');
    const partyNameButtons = document.querySelectorAll('.party-name-btn');
    partyNameButtons.forEach(button => button.classList.remove('selected'));
    updateSelectionCount();
    updateClearFiltersButtonVisibility();
    loadPendingOrders(); // Reload orders without filters
}

function handleOrderActions(e) {
    if (e.target.classList.contains('complete-order')) {
        markForBilling(e.target.getAttribute('data-order-id'));
    } else if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
}

function openFilterModal() {
    const filterModal = document.getElementById('filterModal4');
    filterModal.style.display = 'block';
    loadPartyNames();
}

function closeFilterModal(applyFilter = false) {
    const filterModal = document.getElementById('filterModal4');
    filterModal.style.display = 'none';
    
    if (!applyFilter) {
        // Reset the UI to match currentFilters
        const partyNameButtons = document.querySelectorAll('.party-name-btn');
        partyNameButtons.forEach(button => {
            button.classList.toggle('selected', currentFilters.includes(button.textContent));
        });
    }
}



function showMessage(message) {
    const messageElement = document.getElementById('noFilterSelectedMessage');
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 2000);
}

function handleViewToggle() {
    loadPendingOrders();
}
// New function to update Clear Filters button visibility
function updateClearFiltersButtonVisibility() {
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    if (currentFilters.length > 0) {
        clearFiltersButton.style.display = 'inline-block';
    } else {
        clearFiltersButton.style.display = 'none';
    }
}
