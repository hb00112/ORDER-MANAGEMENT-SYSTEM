// Ensure the DOM is fully loaded before initializing


// Google Apps Script Web App URL
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzUbeIwfJedhnNCFZBQpKcOXu-Ga8uo1HlbmLcljOWrico8_GFg-WSItCyawVM2uLxY/exec';


document.addEventListener('DOMContentLoaded', function() {
    
    checkAndDeleteExpiredOrders();
    initializeDB()
        .then(() => {  
            console.log("IndexedDB initialized");
            initializeUI();
            loadPendingOrders(); // This will now also load archived orders
            startSyncCycle();
        checkAndMoveExpiredOrders(); // Add this line
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
const SYNC_INTERVAL = 15 * 60 * 1000; // 5 minutes in milliseconds

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
            // Filter orders based on quantity and current filters
            // Remove the status filter as we're not distinguishing between pending and archived
            orders = orders.filter(order => 
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
            loadDeletedOrders();
  
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
  
    // Sort orders by date (newest first)
    orders.sort((a, b) => {
        const dateA = new Date(a.dateTime || 0);
        const dateB = new Date(b.dateTime || 0);
        return dateB - dateA;
    });

    // Add CSS styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .stock-full {
            background-color: #FFFACD !important;
        }
        .stock-partial {
            background-color: #E3F2FD !important;
        }
        .status-icon {
            cursor: pointer;
            margin-left: 8px;
            font-size: 1em;
            display: inline-block;
            vertical-align: middle;
        }
        .status-cross {
            color: #dc3545;
        }
        .status-tick {
            color: #28a745;
        }
        .order-number-line {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
        }
        .order-details {
            margin-top: 4px;
        }
        .three-dot-menu {
            position: absolute;
            right: 15px;
            top: 10px;
        }
        .order-header {
            position: relative;
            padding-right: 40px;
        }
        .expiry-indicator {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }
        .expiry-indicator::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.1;
            background: currentColor;
        }
        .expiry-indicator .icon {
            margin-right: 4px;
            font-size: 14px;
        }
        .expiry-normal {
            background-color: #e8f5e9;
            color: #2e7d32;
            border-left: 3px solid #2e7d32;
        }
        .expiry-warning {
            background-color: #fff8e1;
            color: #ff8f00;
            border-left: 3px solid #ff8f00;
        }
        .expiry-critical {
            background-color: #ffebee;
            color: #c62828;
            border-left: 3px solid #c62828;
            animation: pulse 2s infinite;
        }
        .expiry-expired {
            background-color: #f5f5f5;
            color: #616161;
            border-left: 3px solid #616161;
        }
        .expiry-progress {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
            background: #f5f5f5;
            margin-top: 4px;
        }
        .expiry-progress-bar {
            height: 100%;
            transition: width 0.3s ease;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        .multi-export-checkbox {
            margin-right: 8px;
            cursor: pointer;
            width: 18px;
            height: 18px;
        }
        .dropdown-menu {
            display: none;
            position: absolute;
            right: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 1000;
            min-width: 180px;
        }
        .dropdown-menu.show {
            display: block;
        }
        .dropdown-item {
            padding: 8px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            text-decoration: none;
            color: #333;
        }
        .dropdown-item:hover {
            background-color: #f5f5f5;
        }
        #multiExportBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
    `;
    document.head.appendChild(styleElement);
  
    // Get stock data from IndexedDB
    getStockData().then(stockData => {
        getExportStatusFromFirebase((exportStatus) => {
            orders.forEach(order => {
                const orderDate = new Date(order.dateTime).toLocaleDateString();
                const orderDiv = document.createElement('div');
                orderDiv.className = 'order-container mb-4';
                orderDiv.dataset.orderId = order.id;
                
                const isExported = exportStatus[order.id] || false;
                const statusIcon = isExported ? '✓' : '✕';
                const statusClass = isExported ? 'status-tick' : 'status-cross';
                
                orderDiv.innerHTML = `
                    <div class="order-header mb-2">
                        <div class="order-number-line">
                            <strong>Order No. ${order.orderNumber || 'N/A'}</strong>
                            <span class="status-icon ${statusClass}" id="status-${order.id}">${statusIcon}</span>
                        </div>
                        <div class="order-details">
                            Party Name: ${order.partyName || 'N/A'}<br>
                            Date: ${orderDate}
                        </div>
                        <div class="three-dot-menu">
                            <button class="btn btn-sm btn-link dropdown-toggle" type="button" id="dropdownMenuButton-${order.id}">
                                &#8942;
                            </button>
                            <div class="dropdown-menu" id="dropdown-${order.id}">
                                <a class="dropdown-item delete-order" href="#" data-order-id="${order.id}">Delete</a>
                                <a class="dropdown-item export-order" href="#" data-order-id="${order.id}">Export</a>
                                <a class="dropdown-item" href="#" onclick="return false;">
                                    <input type="checkbox" class="multi-export-checkbox" data-order-id="${order.id}">
                                    <span>Multiple Export</span>
                                </a>
                            </div>
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
                            ${generateOrderItemRowsWithStock(order.items, order.id, stockData)}
                        </tbody>
                    </table>
                    <div class="order-actions mt-2 text-right">
                        <button class="btn btn-sm btn-primary done-order" data-order-id="${order.id}" style="display: none;">Done</button>
                    </div>
                    <hr>
                `;
  
                container.appendChild(orderDiv);
  
                // Event listeners
                const dropdownToggle = orderDiv.querySelector(`#dropdownMenuButton-${order.id}`);
                const dropdownMenu = orderDiv.querySelector(`#dropdown-${order.id}`);
  
                dropdownToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.toggle('show');
                });
  
                const deleteButton = orderDiv.querySelector('.delete-order');
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDeleteModal1(order.id);
                    dropdownMenu.classList.remove('show');
                });
  
                const exportButton = orderDiv.querySelector('.export-order');
                exportButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    exportOrderToExcel(order);
                    dropdownMenu.classList.remove('show');
                });

                // Multi-export checkbox handler
                const checkbox = orderDiv.querySelector('.multi-export-checkbox');
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                checkbox.addEventListener('change', (e) => {
                    handleMultiExportCheckbox(order.id, e.target.checked);
                });
  
                document.addEventListener('click', () => {
                    dropdownMenu.classList.remove('show');
                });
  
                if (currentOrders[order.id]) {
                    updateDetailedView(order.id);
                }
            });
  
            initializeSRQInputs(container);
            $('[data-bs-toggle="tooltip"]').tooltip({
                boundary: 'window',
                trigger: 'hover focus'
            });
        });
    });
}

// Global variable to track selected orders
window.selectedOrdersForExport = window.selectedOrdersForExport || new Set();

function handleMultiExportCheckbox(orderId, isChecked) {
    if (isChecked) {
        window.selectedOrdersForExport.add(orderId);
    } else {
        window.selectedOrdersForExport.delete(orderId);
    }
    updateMultiExportButton();
}

function updateMultiExportButton() {
    const count = window.selectedOrdersForExport.size;
    let btn = document.getElementById('multiExportBtn');
    
    if (count > 0) {
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'multiExportBtn';
            btn.className = 'btn btn-primary';
            document.body.appendChild(btn);
            
            btn.addEventListener('click', openMultiExportModal);
        }
        btn.textContent = `Export (${count}) Orders`;
        btn.style.display = 'block';
    } else {
        if (btn) {
            btn.style.display = 'none';
        }
    }
}

  
  function getExportStatusFromFirebase(callback) {
    try {
        firebase.database().ref('orderExportStatus').once('value', (snapshot) => {
            callback(snapshot.exists() ? snapshot.val() : {});
        }).catch((error) => {
            console.error('Error getting export status:', error);
            callback({});
        });
    } catch (error) {
        console.error('Error getting export status:', error);
        callback({});
    }
  }
  
  function updateExportStatus(orderId, isExported) {
    try {
        firebase.database().ref(`orderExportStatus/${orderId}`).set(isExported).then(() => {
            console.log('Export status updated successfully');
        }).catch((error) => {
            console.error('Error updating export status:', error);
        });
    } catch (error) {
      console.error('Error updating export status:', error);
    }
  }
// Function to get stock data from IndexedDB
function getStockData() {
    return new Promise((resolve, reject) => {
        const transaction = stockIndexedDB.transaction([STOCK_STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(STOCK_STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error("Error fetching stock data:", event.target.error);
            resolve([]); // Return empty array in case of error
        };
    });
}

function generateOrderItemRowsWithStock(items, orderId, stockData) {
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
            
            // Check stock availability
            const stockItem = stockData.find(stock => 
                stock['item name'] === item.name && 
                stock.color === item.color && 
                stock.size === size
            );
            
            const stockQuantity = stockItem ? parseFloat(stockItem.quantity) : 0;
            let stockClass = '';
            
            // Determine row color based on stock availability
            if (stockQuantity >= quantity) {
                stockClass = 'stock-full';
            } else if (stockQuantity > 0) {
                stockClass = 'stock-partial';
            }

            return `
                <tr class="${stockClass}">
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
/**
 * Export order to Excel and upload to Google Drive
 * @param {Object} order - The order object containing items and details
 */
function exportOrderToExcel(order) {
    console.log('Exporting order:', order);
    
    const orderItems = [];

    order.items.forEach((item) => {
        if (item.quantities && typeof item.quantities === 'object') {
            Object.entries(item.quantities).forEach(([size, qty]) => {
                if (qty > 0) {
                    orderItems.push({
                        itemName: item.name,
                        color: item.color,
                        size: size,
                        quantity: qty
                    });
                }
            });
        }
    });

    if (orderItems.length === 0) {
        alert('No data to export. Please check the order details.');
        return;
    }

    const orderData = {
        orderNumber: order.orderNumber || 'N/A',
        partyName: order.partyName || 'N/A',
        orderDate: order.dateTime ? new Date(order.dateTime).toLocaleDateString() : new Date().toLocaleDateString(),
        items: orderItems
    };

    uploadOrderToGoogleDrive(orderData, [order.id]);
}

function uploadOrderToGoogleDrive(orderData, orderIds) {
    console.log('Uploading order to Google Drive');
    
    showUploadStatus('📤 Uploading order to Google Drive...', 'info', true);

    try {
        const jsonString = JSON.stringify(orderData);
        const base64Json = btoa(unescape(encodeURIComponent(jsonString)));
        
        const formData = new URLSearchParams();
        formData.append("jsonData", base64Json);
        
        fetch(GAS_WEBAPP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        })
        .then(() => {
            console.log('Upload request sent successfully');
            
            showUploadStatus(
                `✅ Order uploaded successfully!\n📧 Processing ${orderData.items.length} items...\nCheck your email for completion notification`,
                'success',
                false
            );
            
            // Update UI for all orders
            orderIds.forEach(orderId => {
                updateExportStatus(orderId, true);
                const statusIcon = document.querySelector(`#status-${orderId}`);
                if (statusIcon) {
                    statusIcon.textContent = '✓';
                    statusIcon.classList.remove('status-cross');
                    statusIcon.classList.add('status-tick');
                }
            });
            
            console.log('✅ Order uploaded and processing started');
        })
        .catch(err => {
            console.error('Upload failed:', err);
            showUploadStatus('❌ Upload failed: ' + err.message + '\nRetrying...', 'error', true);
            
            setTimeout(() => {
                retryUpload(orderData, orderIds);
            }, 2000);
        });
        
    } catch (err) {
        console.error('Upload setup failed:', err);
        showUploadStatus('❌ Upload failed: ' + err.message, 'error', false);
    }
}

function retryUpload(orderData, orderIds) {
    console.log('Retrying upload...');
    showUploadStatus('🔄 Retrying upload...', 'info', true);
    
    try {
        const jsonString = JSON.stringify(orderData);
        const base64Json = btoa(unescape(encodeURIComponent(jsonString)));
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GAS_WEBAPP_URL;
        form.target = '_blank';
        form.style.display = 'none';
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'jsonData';
        input.value = base64Json;
        
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        
        showUploadStatus(
            '✅ Order submitted!\n📧 Check your email for confirmation',
            'success',
            false
        );
        
        // Update UI for all orders
        orderIds.forEach(orderId => {
            updateExportStatus(orderId, true);
            const statusIcon = document.querySelector(`#status-${orderId}`);
            if (statusIcon) {
                statusIcon.textContent = '✓';
                statusIcon.classList.remove('status-cross');
                statusIcon.classList.add('status-tick');
            }
        });
        
    } catch (err) {
        console.error('Retry failed:', err);
        showUploadStatus('❌ Upload failed after retry. Please try again.', 'error', false);
    }
}

function showUploadStatus(message, type = 'info', persistent = false) {
    let statusElement = document.getElementById('uploadStatus');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'uploadStatus';
        statusElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            font-weight: 500;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
            word-wrap: break-word;
            white-space: pre-wrap;
        `;
        document.body.appendChild(statusElement);
    }

    statusElement.textContent = message;
    statusElement.style.display = 'block';
    
    const colors = {
        'info': { color: '#0c5460', bg: '#d1ecf1' },
        'success': { color: '#155724', bg: '#d4edda' },
        'warning': { color: '#856404', bg: '#fff3cd' },
        'error': { color: '#721c24', bg: '#f8d7da' }
    };
    
    const c = colors[type] || colors['info'];
    statusElement.style.color = c.color;
    statusElement.style.backgroundColor = c.bg;
    statusElement.style.borderLeft = `4px solid ${c.color}`;
    statusElement.style.opacity = '1';
    statusElement.style.transition = 'none';

    // Clear any existing timeout
    if (statusElement.hideTimeout) {
        clearTimeout(statusElement.hideTimeout);
    }

    // Only auto-hide if not persistent and type is success
    if (!persistent && type === 'success') {
        statusElement.hideTimeout = setTimeout(() => {
            statusElement.style.opacity = '0';
            statusElement.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => {
                statusElement.style.display = 'none';
                statusElement.style.opacity = '1';
                statusElement.style.transition = 'none';
            }, 300);
        }, 6000);
    }
}

// Multi-export modal and functions
function openMultiExportModal() {
    const selectedIds = Array.from(window.selectedOrdersForExport);
    if (selectedIds.length === 0) return;
    
    // Get all orders data from IndexedDB - using PendingOrdersDB
    const dbRequest = indexedDB.open('PendingOrdersDB');
    
    dbRequest.onsuccess = function(event) {
        const db = event.target.result;
        
        // Check if the database has the correct object store
        if (!db.objectStoreNames.contains('orders')) {
            console.error('Object store "orders" not found');
            alert('Database error. Please refresh the page.');
            return;
        }
        
        const transaction = db.transaction(['orders'], 'readonly');
        const objectStore = transaction.objectStore('orders');
        const getAllRequest = objectStore.getAll();
        
        getAllRequest.onsuccess = function() {
            const allOrders = getAllRequest.result;
            const selectedOrders = allOrders.filter(order => selectedIds.includes(order.id));
            
            if (selectedOrders.length === 0) {
                alert('Selected orders not found in database.');
                return;
            }
            
            displayMultiExportModal(selectedOrders);
        };
        
        getAllRequest.onerror = function() {
            console.error('Error fetching orders from IndexedDB');
            alert('Error loading orders. Please try again.');
        };
    };
    
    dbRequest.onerror = function() {
        console.error('Error opening IndexedDB');
        alert('Error accessing database. Please try again.');
    };
}

function displayMultiExportModal(orders) {
    // Remove existing modal if any
    const existingModal = document.getElementById('multiExportModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create export data object to track modified quantities
    const exportData = {};
    
    // Calculate total quantities and initialize export data
    let totalQty = 0;
    const orderDetails = orders.map(order => {
        let orderQty = 0;
        const orderItemsData = [];
        
        order.items.forEach(item => {
            if (item.quantities && typeof item.quantities === 'object') {
                Object.entries(item.quantities).forEach(([size, qty]) => {
                    const itemQty = parseInt(qty) || 0;
                    if (itemQty > 0) {
                        orderQty += itemQty;
                        orderItemsData.push({
                            itemName: item.name,
                            color: item.color,
                            size: size,
                            quantity: itemQty,
                            originalQty: itemQty,
                            isSelected: true
                        });
                    }
                });
            }
        });
        
        totalQty += orderQty;
        
        // Initialize export data for this order
        exportData[order.id] = {
            items: orderItemsData,
            totalQty: orderQty
        };
        
        return {
            id: order.id,
            orderNumber: order.orderNumber || 'N/A',
            partyName: order.partyName || 'N/A',
            orderDate: new Date(order.dateTime).toLocaleDateString(),
            totalQty: orderQty,
            exportStatus: '✓',
            isExpanded: false
        };
    });
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'multiExportModal';
    modal.className = 'modal';
    modal.style.cssText = `
        display: block;
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0,0,0,0.4);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #fefefe;
        margin: 5% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 900px;
        border-radius: 8px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    // Add styles for expandable rows
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .order-row-main {
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .order-row-main:hover {
            background-color: #f0f0f0;
        }
        .order-row-main td {
            padding: 10px;
        }
        .expand-icon {
            cursor: pointer;
            user-select: none;
            font-weight: bold;
            display: inline-block;
            width: 20px;
            text-align: center;
        }
        .items-detail-row {
            display: none;
        }
        .items-detail-row.expanded {
            display: table-row;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .items-table td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .items-detail-container {
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 6px;
        }
        .item-row {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid #ddd;
            align-items: center;
            background-color: #fff;
            border-radius: 4px;
            margin-bottom: 5px;
        }
        .item-row:last-child {
            margin-bottom: 0;
        }
        .item-checkbox {
            margin: 0 10px 0 0;
            width: 18px;
            height: 18px;
            cursor: pointer;
            flex-shrink: 0;
        }
        .item-info {
            flex: 1.5;
            display: flex;
            flex-direction: column;
        }
        .item-info strong {
            font-weight: 600;
        }
        .item-meta {
            font-size: 12px;
            color: #666;
            margin-top: 2px;
        }
        .item-qty-display {
            flex: 0 0 100px;
            text-align: center;
            padding: 0 10px;
        }
        .item-qty-input {
            flex: 0 0 100px;
            padding: 6px 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            text-align: center;
            font-size: 14px;
        }
        .item-qty-input:disabled {
            background-color: #f0f0f0;
            cursor: not-allowed;
            color: #999;
        }
        .item-qty-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        .save-items-btn {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 10px;
            transition: background-color 0.2s;
        }
        .save-items-btn:hover {
            background-color: #218838;
        }
        .items-header {
            display: flex;
            font-weight: 600;
            padding: 10px;
            background-color: #e9ecef;
            border-radius: 4px;
            margin-bottom: 10px;
            border-bottom: 2px solid #dee2e6;
        }
        .items-header > div {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .items-header-checkbox {
            flex: 0 0 30px;
        }
        .items-header-name {
            flex: 1.5;
            justify-content: flex-start;
        }
        .items-header-color {
            flex: 0 0 100px;
        }
        .items-header-size {
            flex: 0 0 80px;
        }
        .items-header-orig {
            flex: 0 0 100px;
        }
        .items-header-export {
            flex: 0 0 100px;
        }
    `;
    document.head.appendChild(styleSheet);
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0;">Multiple Order Export</h3>
            <button id="closeMultiExportModal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <strong>Total Orders:</strong> ${orders.length}
                </div>
                <div>
                    <strong>Total Quantity:</strong> <span id="totalQtyDisplay">${totalQty}</span> pcs
                </div>
            </div>
        </div>
        
        <table class="table table-bordered" style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
            <thead style="background-color: #e9ecef;">
                <tr>
                    <th style="padding: 10px; text-align: center; width: 30px;"></th>
                    <th style="padding: 10px;">Select</th>
                    <th style="padding: 10px;">Order No.</th>
                    <th style="padding: 10px;">Party Name</th>
                    <th style="padding: 10px;">Order Date</th>
                    <th style="padding: 10px;">Export Status</th>
                    <th style="padding: 10px; text-align: right;">Total Qty</th>
                </tr>
            </thead>
            <tbody id="multiExportTableBody">
                ${orderDetails.map(order => `
                    <tr class="order-row-main" data-order-id="${order.id}">
                        <td style="padding: 10px; text-align: center;">
                            <span class="expand-icon" data-order-id="${order.id}">▶</span>
                        </td>
                        <td style="padding: 10px; text-align: center;">
                            <input type="checkbox" class="order-select-checkbox" data-order-id="${order.id}" checked>
                        </td>
                        <td style="padding: 10px;">${order.orderNumber}</td>
                        <td style="padding: 10px;">${order.partyName}</td>
                        <td style="padding: 10px;">${order.orderDate}</td>
                        <td style="padding: 10px; text-align: center;">${order.exportStatus}</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold;" class="order-qty-display" data-order-id="${order.id}">${order.totalQty}</td>
                    </tr>
                    <tr class="items-detail-row" data-order-id="${order.id}">
                        <td colspan="7">
                            <div class="items-detail-container">
                                <h5 style="margin-top: 0; margin-bottom: 15px;">Item Details for Order ${order.orderNumber}</h5>
                                <div id="items-container-${order.id}"></div>
                                <button class="save-items-btn" type="button" data-order-id="${order.id}">Save Changes</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div id="selectedCountDisplay">
                <strong>${orders.length} orders selected</strong>
            </div>
            <button id="sendForPunchingBtn" class="btn btn-primary" style="padding: 10px 30px; font-size: 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Send Order for Punching
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Event listeners - Close modal
    document.getElementById('closeMultiExportModal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Expand/Collapse functionality
    const expandIcons = modalContent.querySelectorAll('.expand-icon');
    expandIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderId = icon.dataset.orderId;
            const detailRow = modalContent.querySelector(`.items-detail-row[data-order-id="${orderId}"]`);
            const itemsContainer = document.getElementById(`items-container-${orderId}`);
            
            if (detailRow.classList.contains('expanded')) {
                detailRow.classList.remove('expanded');
                icon.textContent = '▶';
            } else {
                detailRow.classList.add('expanded');
                icon.textContent = '▼';
                renderItemsDetail(orderId, itemsContainer, exportData[orderId].items);
            }
        });
    });
    
    // Checkbox change handlers for orders
    const checkboxes = modalContent.querySelectorAll('.order-select-checkbox');
    let selectedModalOrders = new Set(orders.map(o => o.id));
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const orderId = e.target.dataset.orderId;
            if (e.target.checked) {
                selectedModalOrders.add(orderId);
            } else {
                selectedModalOrders.delete(orderId);
            }
            
            // Update display
            document.getElementById('selectedCountDisplay').innerHTML = 
                `<strong>${selectedModalOrders.size} orders selected</strong>`;
            
            // Update total quantity
            updateTotalQuantityDisplay(exportData, selectedModalOrders);
        });
    });
    
    // Save items changes button handlers - FIXED
    const saveButtons = modalContent.querySelectorAll('.save-items-btn');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const orderId = btn.dataset.orderId;
            console.log('Save button clicked for order:', orderId);
            saveItemsChanges(orderId, exportData, modalContent);
            
            // Update total quantity display
            updateTotalQuantityDisplay(exportData, selectedModalOrders);
        });
    });
    
    // Send for punching button
    document.getElementById('sendForPunchingBtn').addEventListener('click', () => {
        if (selectedModalOrders.size === 0) {
            alert('Please select at least one order');
            return;
        }
        
        const selectedOrdersData = orders.filter(o => selectedModalOrders.has(o.id));
        exportMultipleOrders(selectedOrdersData, exportData);
        modal.remove();
        
        // Clear selections
        window.selectedOrdersForExport.clear();
        updateMultiExportButton();
        
        // Uncheck all checkboxes in main view
        document.querySelectorAll('.multi-export-checkbox').forEach(cb => {
            cb.checked = false;
        });
    });
}

function renderItemsDetail(orderId, container, itemsData) {
    container.innerHTML = `
        <div class="items-table">
            <div style="display: flex; font-weight: bold; padding: 10px 0; border-bottom: 2px solid #999;">
                <div style="flex: 0 0 30px; text-align: center;">✓</div>
                <div style="flex: 1;">Item Name</div>
                <div style="flex: 0 0 100px; text-align: center;">Color</div>
                <div style="flex: 0 0 80px; text-align: center;">Size</div>
                <div style="flex: 0 0 100px; text-align: center;">Original Qty</div>
                <div style="flex: 0 0 120px; text-align: center;">Export Qty</div>
            </div>
            
            ${itemsData.map((item, idx) => `
                <div class="item-row" data-item-index="${idx}">
                    <div style="flex: 0 0 30px; text-align: center;">
                        <input type="checkbox" class="item-checkbox" data-order-id="${orderId}" data-item-index="${idx}" ${item.isSelected ? 'checked' : ''}>
                    </div>
                    <div style="flex: 1;">
                        <div class="item-info">
                            <strong>${item.itemName}</strong>
                        </div>
                    </div>
                    <div style="flex: 0 0 100px; text-align: center;">${item.color}</div>
                    <div style="flex: 0 0 80px; text-align: center;">${item.size}</div>
                    <div style="flex: 0 0 100px; text-align: center;">${item.originalQty}</div>
                    <div style="flex: 0 0 120px; text-align: center;">
                        <input type="number" class="item-qty-input" data-order-id="${orderId}" data-item-index="${idx}" value="${item.quantity}" min="0" ${!item.isSelected ? 'disabled' : ''}>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add event listeners for checkboxes
    const itemCheckboxes = container.querySelectorAll('.item-checkbox');
    itemCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const orderId = e.target.dataset.orderId;
            const itemIndex = parseInt(e.target.dataset.itemIndex);
            const qtyInput = container.querySelector(`input[type="number"][data-item-index="${itemIndex}"]`);
            
            if (e.target.checked) {
                qtyInput.disabled = false;
                qtyInput.value = itemsData[itemIndex].originalQty;
            } else {
                qtyInput.disabled = true;
                qtyInput.value = 0;
            }
        });
    });
    
    // Add event listeners for quantity inputs
    const qtyInputs = container.querySelectorAll('.item-qty-input');
    qtyInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const value = parseInt(e.target.value) || 0;
            if (value < 0) {
                e.target.value = 0;
            }
        });
    });
}

function saveItemsChanges(orderId, exportData, modal) {
    console.log('saveItemsChanges called for orderId:', orderId);
    
    const container = document.getElementById(`items-container-${orderId}`);
    
    if (!container) {
        console.error('Container not found for orderId:', orderId);
        alert('Error: Could not find items container');
        return;
    }
    
    const checkboxes = container.querySelectorAll('.item-checkbox');
    const qtyInputs = container.querySelectorAll('.item-qty-input');
    
    console.log('Found checkboxes:', checkboxes.length, 'Found inputs:', qtyInputs.length);
    
    let totalOrderQty = 0;
    
    // Update export data based on current values
    exportData[orderId].items.forEach((item, idx) => {
        const checkbox = Array.from(checkboxes).find(cb => parseInt(cb.dataset.itemIndex) === idx);
        const qtyInput = Array.from(qtyInputs).find(qi => parseInt(qi.dataset.itemIndex) === idx);
        
        if (checkbox && qtyInput) {
            item.isSelected = checkbox.checked;
            item.quantity = checkbox.checked ? parseInt(qtyInput.value) || 0 : 0;
            totalOrderQty += item.quantity;
            
            console.log(`Item ${idx}: Selected=${item.isSelected}, Qty=${item.quantity}`);
        }
    });
    
    exportData[orderId].totalQty = totalOrderQty;
    
    console.log('Updated order total qty:', totalOrderQty);
    
    // Update the table display - multiple selectors to ensure we find it
    let qtyDisplay = modal.querySelector(`.order-qty-display[data-order-id="${orderId}"]`);
    if (!qtyDisplay) {
        qtyDisplay = modal.querySelector(`tr[data-order-id="${orderId}"] .order-qty-display`);
    }
    if (!qtyDisplay) {
        qtyDisplay = modal.querySelector(`tr[data-order-id="${orderId}"] td:last-child`);
    }
    
    if (qtyDisplay) {
        qtyDisplay.textContent = totalOrderQty;
        console.log('Updated display qty to:', totalOrderQty);
    } else {
        console.warn('Could not find qty display element');
    }
    
    // Close the expanded row
    const detailRow = modal.querySelector(`.items-detail-row[data-order-id="${orderId}"]`);
    const expandIcon = modal.querySelector(`.expand-icon[data-order-id="${orderId}"]`);
    if (detailRow && expandIcon) {
        detailRow.classList.remove('expanded');
        expandIcon.textContent = '▶';
        console.log('Collapsed detail row');
    }
    
    alert('Changes saved successfully!');
}

function updateTotalQuantityDisplay(exportData, selectedModalOrders) {
    let totalQty = 0;
    selectedModalOrders.forEach(orderId => {
        if (exportData[orderId]) {
            totalQty += exportData[orderId].totalQty;
        }
    });
    const totalDisplay = document.getElementById('totalQtyDisplay');
    if (totalDisplay) {
        totalDisplay.textContent = totalQty;
    }
}

function exportMultipleOrders(orders, exportData) {
    console.log('Exporting multiple orders with modified quantities:', orders, exportData);
    
    const orderNumbers = [];
    const partyNames = [];
    const orderDates = [];
    const allItems = [];
    
    orders.forEach(order => {
        orderNumbers.push(order.orderNumber || 'N/A');
        partyNames.push(order.partyName || 'N/A');
        orderDates.push(order.dateTime ? new Date(order.dateTime).toLocaleDateString() : 'N/A');
        
        // Use modified export data instead of original items
        if (exportData[order.id]) {
            exportData[order.id].items.forEach(item => {
                if (item.isSelected && item.quantity > 0) {
                    allItems.push({
                        itemName: item.itemName,
                        color: item.color,
                        size: item.size,
                        quantity: item.quantity
                    });
                }
            });
        }
    });
    
    if (allItems.length === 0) {
        alert('No data to export. Please check the order details.');
        return;
    }
    
    // Create combined order data with modified quantities
    const combinedOrderData = {
        orderNumber: orderNumbers.join(','),
        partyName: partyNames.join(','),
        orderDate: [...new Set(orderDates)].join(','),
        items: allItems
    };
    
    // Upload to Google Drive
    uploadOrderToGoogleDrive(combinedOrderData, orders.map(o => o.id));
}
function addExportDataRow(exportData, itemName, color, size, qty) {
    console.log(`Attempting to match: Style=${itemName}, Color=${color}, Size=${size}`);
    const matchingEntry = purchaseOrderData.find(entry => 
        entry.style.trim().toLowerCase() === itemName.trim().toLowerCase() &&
        entry.color.trim().toLowerCase() === color.trim().toLowerCase() &&
        entry.size.trim().toLowerCase() === size.trim().toLowerCase()
    );

    if (matchingEntry) {
        console.log('Matching entry found:', matchingEntry);
        exportData.push({
            'Material Code': matchingEntry.materialCode,
            'Category': matchingEntry.category,
            'Style': matchingEntry.style,
            'Description': matchingEntry.description,
            'Color': matchingEntry.color,
            'Color Name': matchingEntry.colorName,
            'Style-Color': matchingEntry.stylecol,
            'Size': matchingEntry.size,
            'MRP': matchingEntry.mrp,
            'Pack Size': matchingEntry.packsize,
            'Quantity': qty
        });
    } else {
        console.log('No matching entry found. Adding new entry.');
        exportData.push({
            'Material Code': 'N/A',
            'Category': 'N/A',
            'Style': itemName,
            'Description': 'N/A',
            'Color': color,
            'Color Name': 'N/A',
            'Style-Color': 'N/A',
            'Size': size,
            'MRP': 'N/A',
            'Pack Size': 'N/A',
            'Quantity': qty
        });
    }
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


/**
 * Initialize export button event listeners
 * Call this in your app initialization
 */
function initializeExportButton() {
    const exportButtons = document.querySelectorAll('.export-order');
    
    exportButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const orderId = button.dataset.orderId;
            const order = currentOrders[orderId];
            
            if (order) {
                console.log('Export button clicked for order:', orderId);
                exportOrderToExcel(order);
                updateExportStatus(orderId, true);
                
                // Update status icon
                const statusIcon = document.querySelector(`#status-${orderId}`);
                if (statusIcon) {
                    statusIcon.textContent = '✓';
                    statusIcon.classList.remove('status-cross');
                    statusIcon.classList.add('status-tick');
                }
            } else {
                alert('Order not found. Please refresh and try again.');
            }
        });
    });
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
    getOrderById(orderId)
        .then(order => {
            const modal = document.createElement('div');
            modal.className = 'stock-removal-detailed-modal';
            modal.dataset.orderId = orderId;
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">${order.partyName}</h2>
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="table-container" style="max-height: 60vh; overflow-y: auto;">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Sizes</th>
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

            document.body.appendChild(modal);

            const closeBtn = modal.querySelector('.close');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            modal.querySelector('.send-to-billing-btn').addEventListener('click', () => {
                sendToBilling(orderId);
                document.body.removeChild(modal);
            });

            // Close modal when clicking outside
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    document.body.removeChild(modal);
                }
            });

            // Calculate and update totals
            updateTotals(modal);

            // Initialize SRQ inputs
            initializeSRQInputs(modal);
        })
        .catch(error => {
            console.error("Error opening stock removal modal:", error);
            alert("Error opening stock removal modal. Please try again.");
        });
}


// Global variable to store the current state of orders
let currentOrders = {};

// Function to update the order state


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
    
    // Create a premium table structure
    const table = document.createElement('table');
    table.className = 'luxury-order-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th class="luxury-header">PARTY NAME</th>
                <th class="luxury-header">ORDER DETAILS</th>
                <th class="luxury-header">TOTAL QTY</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    container.appendChild(table);
    const tbody = table.querySelector('tbody');

    // Add luxury styling
    const style = document.createElement('style');
    style.textContent = `
        .luxury-order-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-family: "FKGroteskNeue", "Geist", "Inter", -apple-system,
    BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            border-radius: 12px;
            overflow: hidden;
            background: white;
        }
        
        .luxury-header {
            background: #b60667;
            color: white;
            padding: 18px 20px;
            text-align: left;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            font-size: 13px;
            border: none;
            position: sticky;
            top: 0;
        }
        
        .luxury-order-table td {
            padding: 20px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            vertical-align: middle;
            background: white;
            position: relative;
        }
        
        .luxury-order-table tbody tr {
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            cursor: pointer;
        }
        
        .luxury-order-table tbody tr:hover {
            background: linear-gradient(to right, rgba(250,250,252,1) 0%, rgba(255,255,255,1) 100%);
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.03);
        }
        
        .luxury-order-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .luxury-order-table tbody tr:after {
            content: "";
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 1px;
            background: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%);
        }
        
        .party-name {
            font-weight: 600;
            color: #2c3e50;
            font-size: 15px;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
        }
        
        .order-details {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .order-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        
        .order-label {
            font-size: 13px;
            color: #7f8c8d;
            font-weight: 500;
            text-align: right;
        }
        
        .order-colon {
            font-size: 13px;
            color: #7f8c8d;
            margin: 0 8px;
        }
        
        .order-number {
            font-size: 13px;
            color: #7f8c8d;
            font-weight: 500;
            text-align: left;
        }
        
        .order-date {
            font-size: 12px;
            color: #95a5a6;
            letter-spacing: 0.2px;
        }
        
        .item-names {
            display: block;
            line-height: 1.5;
            font-size: 13px;
            color: #34495e;
            font-weight: 400;
        }
        
        .item-list {
            margin: 0;
            padding: 0;
            list-style-type: none;
        }
        
        .item-list li {
            padding: 2px 0;
        }
        
        .total-quantity {
            font-weight: 700;
            color: #2c3e50;
            text-align: center;
            font-size: 15px;
            position: relative;
        }
        
        .total-quantity:after {
            content: "";
            position: absolute;
            right: -12px;
            top: 50%;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            background: #3498db;
            border-radius: 50%;
            opacity: 0.3;
        }
        
        /* Sent to billing indicator */
        .sent-to-billing td:first-child {
            border-left: 4px solid #27ae60;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .luxury-order-table {
                font-size: 13px;
            }
            
            .luxury-order-table td {
                padding: 15px 12px;
            }
            
            .luxury-header {
                padding: 15px 12px;
                font-size: 12px;
            }
        }
    `;
    document.head.appendChild(style);

    const groupedOrders = groupOrdersByParty(orders);
    
    for (const [partyName, group] of Object.entries(groupedOrders)) {
        // Sort group by date (newest first)
        group.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
        
        const newestOrder = group[0];
        const oldestOrder = group[group.length - 1];
        
        const nonZeroItems = group.flatMap(order => 
            (order.items || []).filter(item => {
                const totalQuantity = Object.values(item.quantities || {})
                    .reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
                return totalQuantity > 0;
            })
        );
        
        const totalQty = nonZeroItems.reduce((sum, item) => {
            const itemTotal = Object.values(item.quantities || {})
                .reduce((itemSum, qty) => itemSum + parseInt(qty) || 0, 0);
            return sum + itemTotal;
        }, 0);

        // Get unique item codes without truncation
        const uniqueItemCodes = [...new Set(nonZeroItems.map(item => 
            item.name.split('(')[0].trim()
        ))];
        
        // Create HTML list for items
        const itemListHTML = `
            <ul class="item-list">
                ${uniqueItemCodes.map(code => `<li>${code}</li>`).join('')}
            </ul>
        `;

        const newestOrderDate = new Date(newestOrder.dateTime);
        const oldestOrderDate = new Date(oldestOrder.dateTime);
        
        const dateRange = newestOrderDate.toLocaleDateString() === oldestOrderDate.toLocaleDateString() ? 
            newestOrderDate.toLocaleDateString() : 
            `${oldestOrderDate.toLocaleDateString()} - ${newestOrderDate.toLocaleDateString()}`;

        const row = document.createElement('tr');
        row.classList.toggle('sent-to-billing', group.some(o => o.status === 'Sent to Billing'));
        
        row.innerHTML = `
            <td>
                <div class="party-name">${partyName}</div>
                <div class="order-date">${dateRange}</div>
            </td>
            <td>
                <div class="order-details">
                   
                    <div class="item-names">${itemListHTML}</div>
                </div>
            </td>
            <td class="total-quantity">${totalQty}</td>
        `;
        
        // Add subtle animation on hover
        row.style.transition = 'all 0.3s ease';
        
        // Add click handler for the entire row
        row.addEventListener('click', () => {
            row.style.transform = 'scale(0.99)';
            setTimeout(() => {
                row.style.transform = '';
                openPremiumStockRemovalModal(partyName, group);
            }, 150);
        });
        
        tbody.appendChild(row);
    }
}
function openPremiumStockRemovalModal(partyName, orders) {
    console.log('Opening premium modal for party:', partyName);
    
    // Create modal container with glass morphism effect
    const modal = document.createElement('div');
    modal.className = 'premium-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'premium-modal-content';
    modalContent.style.cssText = `
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 24px;
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 25px 50px rgba(0,0,0,0.2);
       zoom: 90%;
        transform: translateY(20px);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    
    // Add header with party name as main heading
    const modalHeader = document.createElement('div');
    modalHeader.className = 'premium-modal-header';
    modalHeader.style.cssText = `
        padding: 20px 30px;
        background: #b60667;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = partyName;
    modalTitle.style.cssText = `
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 0.5px;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        transition: transform 0.2s ease;
    `;
    closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.transform = 'rotate(90deg)';
    });
    closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.transform = 'rotate(0)';
    });
    closeBtn.addEventListener('click', () => {
        modal.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    });
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    // Create modal body with tabs for each order
    const modalBody = document.createElement('div');
    modalBody.className = 'premium-modal-body';
    modalBody.style.cssText = `
        padding: 0;
        overflow-y: auto;
        max-height: calc(90vh - 70px);
    `;
    
    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = `
        display: flex;
        background: rgba(240,240,240,0.7);
        border-bottom: 1px solid rgba(0,0,0,0.05);
        padding: 0 20px;
    `;
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        padding: 20px 30px;
    `;
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    
    // Create tabs and content for each order
    orders.forEach((order, index) => {
        const orderDate = new Date(order.dateTime);
        const today = new Date();
        const daysSinceOrder = Math.ceil((today - orderDate) / (1000 * 60 * 60 * 24));
        
     
        // Create tab
        const tab = document.createElement('button');
        tab.className = 'premium-modal-tab';
        tab.textContent = `Order #${order.orderNumber || 'N/A'}`;
        tab.style.cssText = `
            padding: 12px 20px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            font-weight: 500;
            color: #7f8c8d;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        `;
        
        if (index === 0) {
            tab.style.borderBottomColor = '#3498db';
            tab.style.color = '#2c3e50';
            tab.style.fontWeight = '600';
        }
        
        tab.addEventListener('click', () => {
            // Update active tab
            document.querySelectorAll('.premium-modal-tab').forEach(t => {
                t.style.borderBottomColor = 'transparent';
                t.style.color = '#7f8c8d';
                t.style.fontWeight = '500';
            });
            tab.style.borderBottomColor = '#3498db';
            tab.style.color = '#2c3e50';
            tab.style.fontWeight = '600';
            
            // Show corresponding content
            document.querySelectorAll('.premium-order-content').forEach(c => {
                c.style.display = 'none';
            });
            document.getElementById(`order-content-${index}`).style.display = 'block';
        });
        
        tabsContainer.appendChild(tab);
        
        // Create content
        const orderContent = document.createElement('div');
        orderContent.className = 'premium-order-content';
        orderContent.id = `order-content-${index}`;
        orderContent.style.cssText = `
            display: ${index === 0 ? 'block' : 'none'};
        `;
        
        // Add order header
        const orderHeader = document.createElement('div');
        orderHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        `;
        
        const orderDateElement = document.createElement('div');
        orderDateElement.style.cssText = `
            font-size: 14px;
            color:rgb(118, 127, 128);
            display: flex;
            align-items: center;
        `;
        orderDateElement.innerHTML = `
        <span style="margin-right: 10px; font-size: 18px; display:inline-flex; vertical-align:middle;">
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
  <path fill-rule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clip-rule="evenodd"/>
</svg>

        </span>
        ${orderDate.toLocaleDateString()} (${daysSinceOrder} days ago)
        
    `;
    
        
        const orderActions = document.createElement('div');
        orderActions.style.cssText = `
            display: flex;
            gap: 10px;
        `;
        
        const downloadImgBtn = document.createElement('button');
        downloadImgBtn.innerHTML = `
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
  <path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Zm.394 9.553a1 1 0 0 0-1.817.062l-2.5 6A1 1 0 0 0 8 19h8a1 1 0 0 0 .894-1.447l-2-4A1 1 0 0 0 13.2 13.4l-.53.706-1.276-2.553ZM13 9.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clip-rule="evenodd"/>
</svg>

        `;
        downloadImgBtn.style.cssText = `
            padding: 8px;
            background:#3498db;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
        `;
        downloadImgBtn.addEventListener('mouseover', () => {
            downloadImgBtn.style.background = '#2c80b4';
        });
        downloadImgBtn.addEventListener('mouseout', () => {
            downloadImgBtn.style.background = '#3498db';
        });
        downloadImgBtn.addEventListener('click', () => {
            pendingOrderImg(order.orderNumber, index);
        });
        
        const downloadPdfBtn = document.createElement('button');
        downloadPdfBtn.innerHTML = `
           <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
  <path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2 2h12a2 2 0 0 0 2-2 2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2V4a2 2 0 0 0-2-2h-7Zm-6 9a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-1h.5a2.5 2.5 0 0 0 0-5H5Zm1.5 3H6v-1h.5a.5.5 0 0 1 0 1Zm4.5-3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.376A2.626 2.626 0 0 0 15 15.375v-1.75A2.626 2.626 0 0 0 12.375 11H11Zm1 5v-3h.375a.626.626 0 0 1 .625.626v1.748a.625.625 0 0 1-.626.626H12Zm5-5a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-1v-1h1a1 1 0 1 0 0-2h-2Z" clip-rule="evenodd"/>
</svg>

        `;
        downloadPdfBtn.style.cssText = `
            padding: 8px;
            background:#c0392b;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
        `;
        downloadPdfBtn.addEventListener('mouseover', () => {
            downloadPdfBtn.style.background = '#992d22';
        });
        downloadPdfBtn.addEventListener('mouseout', () => {
            downloadPdfBtn.style.background = '#c0392b';
        });
        downloadPdfBtn.addEventListener('click', () => {
            pendingOrderPdf(order.orderNumber, index);
        });
        
       
        
        orderActions.appendChild(downloadImgBtn);
        orderActions.appendChild(downloadPdfBtn);
        orderHeader.appendChild(orderDateElement);
        orderHeader.appendChild(orderActions);
        orderContent.appendChild(orderHeader);
        
        // Add items table
        if (order.items && Array.isArray(order.items)) {
            const table = document.createElement('table');
            table.style.cssText = `
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin-bottom: 20px;
            `;
            
            const thead = document.createElement('thead');
            thead.style.cssText = `
                background: rgba(240,240,240,0.7);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                position: sticky;
                top: 0;
            `;
            
            thead.innerHTML = `
                <tr>
                    <th style="padding: 15px; text-align: left; border-bottom: 2px solid rgba(0,0,0,0.1);">Item Name & Color</th>
                    <th style="padding: 15px; text-align: left; border-bottom: 2px solid rgba(0,0,0,0.1);">Sizes</th>
                    <th style="padding: 15px; text-align: right; border-bottom: 2px solid rgba(0,0,0,0.1);">Quantity</th>
                </tr>
            `;
            
            const tbody = document.createElement('tbody');
            
            order.items.forEach(item => {
                const sizesWithQuantities = Object.entries(item.quantities || {})
                    .map(([size, quantity]) => `${size}/${quantity}`)
                    .join(', ');
                const itemQty = Object.values(item.quantities || {}).reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
                
                const row = document.createElement('tr');
                row.style.cssText = `
                    transition: background-color 0.3s ease;
                `;
                row.addEventListener('mouseover', () => {
                    row.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
                });
                row.addEventListener('mouseout', () => {
                    row.style.backgroundColor = '';
                });
                
                row.innerHTML = `
                    <td style="padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                        <div style="font-weight: 500;">${item.name}</div>
                        <div style="font-size: 13px; color: #7f8c8d; margin-top: 5px;">
                            Color: ${item.color || 'N/A'}
                        </div>
                    </td>
                    <td style="padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                        ${sizesWithQuantities}
                    </td>
                    <td style="padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); text-align: right; font-weight: 500;">
                        ${itemQty}
                    </td>
                `;
                
                tbody.appendChild(row);
            });
            
            table.appendChild(thead);
            table.appendChild(tbody);
            orderContent.appendChild(table);
        } else {
            orderContent.innerHTML += '<p>No items found or error in data structure</p>';
        }
        
        contentContainer.appendChild(orderContent);
    });
    
    modalBody.appendChild(tabsContainer);
    modalBody.appendChild(contentContainer);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Animate modal in
    setTimeout(() => {
        modal.style.opacity = '1';
        modalContent.style.transform = 'translateY(0)';
    }, 10);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
    });
    
    // Store orders data in a global variable for access by download functions
    window.currentModalOrders = orders;
}

// Helper function to determine expiry status (should be defined elsewhere in your code)


function checkAndMoveExpiredOrders() {
    const ordersRef = firebase.database().ref('orders');
    const expiryRef = firebase.database().ref('expiryOrders');
    const now = Date.now();
    const twentyFiveDays = 25 * 24 * 60 * 60 * 1000; // 25 days in milliseconds

    ordersRef.once('value').then(snapshot => {
        const updates = {};
        
        snapshot.forEach(childSnapshot => {
            const order = childSnapshot.val();
            const orderDate = new Date(order.dateTime).getTime();
            
            if (now - orderDate > twentyFiveDays) {
                // Move to expiryOrders
                updates[`expiryOrders/${childSnapshot.key}`] = order;
                // Remove from orders
                updates[`orders/${childSnapshot.key}`] = null;
            }
        });
        
        // Execute all updates at once
        if (Object.keys(updates).length > 0) {
            return firebase.database().ref().update(updates);
        }
    }).catch(error => {
        console.error("Error moving expired orders: ", error);
    });
}


function setupOrderNumberInteractions() {
    const orderNumbers = document.querySelectorAll('.order-number');
    let pressTimer;
    
    orderNumbers.forEach(orderNumber => {
        // Double click handler
        orderNumber.addEventListener('dblclick', function(e) {
            e.preventDefault();
            showDownloadButtons(this);
        });
        
        // Long press handler
        orderNumber.addEventListener('mousedown', function() {
            pressTimer = window.setTimeout(() => {
                showDownloadButtons(this);
            }, 3000); // 3 seconds long press
        });
        
        // Touch events for mobile
        orderNumber.addEventListener('touchstart', function(e) {
            pressTimer = window.setTimeout(() => {
                showDownloadButtons(this);
            }, 3000); // 3 seconds long press
        });
        
        orderNumber.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
        });
        
        orderNumber.addEventListener('mouseup', function() {
            clearTimeout(pressTimer);
        });
        
        orderNumber.addEventListener('mouseleave', function() {
            clearTimeout(pressTimer);
        });
    });
}

function showDownloadButtons(orderNumberElement) {
    const downloadButtons = orderNumberElement.querySelector('.download-buttons');
    if (downloadButtons) {
        // Hide any other visible download buttons first
        document.querySelectorAll('.download-buttons').forEach(btn => {
            if (btn !== downloadButtons) {
                btn.style.display = 'none';
            }
        });
        
        downloadButtons.style.display = 'block';
        
        // Setup download button event handlers - we do this here to ensure we have the latest data
        const imgBtn = downloadButtons.querySelector('.download-img-btn');
        const pdfBtn = downloadButtons.querySelector('.download-pdf-btn');
        const orderIndex = orderNumberElement.getAttribute('data-order-index');
        const orderId = orderNumberElement.getAttribute('data-order-id');
        
        if (imgBtn) {
            // Remove any existing event listeners
            imgBtn.replaceWith(imgBtn.cloneNode(true));
            const newImgBtn = downloadButtons.querySelector('.download-img-btn');
            newImgBtn.addEventListener('click', function() {
                pendingOrderImg(orderId, parseInt(orderIndex));
            });
        }
        
        if (pdfBtn) {
            // Remove any existing event listeners
            pdfBtn.replaceWith(pdfBtn.cloneNode(true));
            const newPdfBtn = downloadButtons.querySelector('.download-pdf-btn');
            newPdfBtn.addEventListener('click', function() {
                pendingOrderPdf(orderId, parseInt(orderIndex));
            });
        }
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            downloadButtons.style.display = 'none';
        }, 4000);
    }
}
function pendingOrderImg(orderId, orderIndex) {
    console.log(`Generating image for order: ${orderId} at index ${orderIndex}`);
    
    if (!window.currentModalOrders || !window.currentModalOrders[orderIndex]) {
        console.error('Order data not found');
        return;
    }
    
    const order = window.currentModalOrders[orderIndex];
    const partyName = document.querySelector('#stockRemovalModal .modal-title').textContent;
    const orderDate = new Date(order.dateTime);
    
    // Create a temporary div for the order content
    const tempDiv = document.createElement('div');
    tempDiv.style.width = '375px'; // Mobile-friendly width
    tempDiv.style.padding = '15px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    // Create order header with party name as main heading
    tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <h2 style="color: #333; margin-bottom: 5px; font-size: 18px;">${partyName}</h2>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Order #${order.orderNumber || 'N/A'}</p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Date: ${orderDate.toLocaleDateString()}</p>
        </div>
    `;
    
    // Add table with proper styling
    tempDiv.innerHTML += `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 45%;">Item Name & Color</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 40%;">Sizes</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 15%;">Qty</th>
                </tr>
            </thead>
            <tbody id="order-items">
            </tbody>
        </table>
    `;
    
    // Append the temporary div to the body (hidden)
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    // Get the tbody element to add rows
    const tbody = tempDiv.querySelector('#order-items');
    
    // Variables for totals
    let totalItems = 0;
    let totalQuantity = 0;
    
    // Add order items - process all at once without splitting
    if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
            const sizesWithQuantities = Object.entries(item.quantities || {})
                .map(([size, quantity]) => `${size}/${quantity}`)
                .join(', ');
            const itemQty = Object.values(item.quantities || {}).reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
            
            totalQuantity += itemQty;
            totalItems++;
            
            // Create row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 12px; word-wrap: break-word;">${item.name} (${item.color || 'N/A'})</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 12px; word-wrap: break-word;">${sizesWithQuantities}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 12px;">${itemQty}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Add totals at the end - only once
        const totalsDiv = document.createElement('div');
        totalsDiv.style.textAlign = 'right';
        totalsDiv.style.marginTop = '15px';
        totalsDiv.innerHTML = `
            <p style="font-weight: bold; margin: 5px 0;">Total Items: ${totalItems}</p>
            <p style="font-weight: bold; margin: 5px 0;">Total Quantity: ${totalQuantity}</p>
        `;
        tempDiv.appendChild(totalsDiv);
        
        // Generate single image from the complete element
        generateImageFromElement(tempDiv).then(imgData => {
            // Download single image
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `Order-${orderId}.png`;
            link.click();
            
            // Remove temporary element
            setTimeout(() => {
                document.body.removeChild(tempDiv);
            }, 1000);
        }).catch(error => {
            console.error('Error generating image:', error);
            document.body.removeChild(tempDiv);
        });
    } else {
        // No items, generate single image
        const noItemsRow = document.createElement('tr');
        noItemsRow.innerHTML = '<td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center;">No items found</td>';
        tbody.appendChild(noItemsRow);
        
        generateImageFromElement(tempDiv).then(imgData => {
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `Order-${orderId}.png`;
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(tempDiv);
            }, 1000);
        }).catch(error => {
            console.error('Error generating image:', error);
            document.body.removeChild(tempDiv);
        });
    }
}
function generateImageFromElement(element) {
    return new Promise((resolve, reject) => {
        html2canvas(element, {
            scale: 2, // For better quality
            backgroundColor: 'white',
            logging: false,
            width: element.offsetWidth,
            height: element.offsetHeight
        }).then(canvas => {
            resolve(canvas.toDataURL('image/png'));
        }).catch(error => {
            // Try alternate method if html2canvas fails
            if (typeof domtoimage !== 'undefined') {
                domtoimage.toPng(element)
                    .then(function (dataUrl) {
                        resolve(dataUrl);
                    })
                    .catch(function (error) {
                        reject(error);
                    });
            } else {
                reject(error);
            }
        });
    });
}

function pendingOrderPdf(orderId, orderIndex) {
    console.log(`Generating PDF for order: ${orderId} at index ${orderIndex}`);
    
    if (!window.currentModalOrders || !window.currentModalOrders[orderIndex]) {
        console.error('Order data not found');
        return;
    }
    
    const order = window.currentModalOrders[orderIndex];
    
    // Check if jsPDF is available
    if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        // Fallback: try to dynamically load jsPDF if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = function() {
            generatePdf(order, orderId);
        };
        script.onerror = function() {
            alert('PDF generation requires jsPDF library. Please include it in your project.');
        };
        document.head.appendChild(script);
        return;
    }
    
    generatePdf(order, orderId);
}

function generatePdf(order, orderId) {
    // Initialize jsPDF
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Set font sizes
    const titleSize = 16;
    const subtitleSize = 12;
    const normalSize = 10;
    const smallSize = 8;
    
    // Set page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    
    // Get current date and time
    const orderDate = new Date(order.dateTime);
    const partyName = document.querySelector('#stockRemovalModal .modal-title').textContent;
    
    // Add header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(titleSize);
    doc.text(`Party: ${partyName}`, pageWidth / 2, margin, { align: 'center' });
   
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subtitleSize);
    doc.text(`Date: ${orderDate.toLocaleDateString()}`, pageWidth / 2, margin + 7, { align: 'center' });
    doc.text(`Order #${order.orderNumber || 'N/A'}`, pageWidth / 2, margin + 12, { align: 'center' });
    
    // Table header position
    let yPos = margin + 20;
    
    // Draw table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(normalSize);
    doc.text('Item Name & Color', margin + 2, yPos + 5);
    doc.text('Sizes', margin + contentWidth * 0.5, yPos + 5);
    doc.text('Qty', margin + contentWidth - 10, yPos + 5, { align: 'right' });
    
    // Draw horizontal line
    yPos += 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, margin + contentWidth, yPos);
    
    // Add items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(smallSize);
    
    if (order.items && Array.isArray(order.items)) {
        let totalQty = 0;
        
        order.items.forEach(item => {
            const sizesWithQuantities = Object.entries(item.quantities || {})
                .map(([size, quantity]) => `${size}/${quantity}`)
                .join(', ');
            const itemQty = Object.values(item.quantities || {}).reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
            totalQty += itemQty;
            
            // Check if we need a new page
            if (yPos > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                yPos = margin;
            }
            
            // Draw item row
            yPos += 5;
            doc.text(`${item.name} (${item.color || 'N/A'})`, margin + 2, yPos);
            doc.text(sizesWithQuantities, margin + contentWidth * 0.5, yPos);
            doc.text(itemQty.toString(), margin + contentWidth - 10, yPos, { align: 'right' });
            yPos += 3;
            
            // Draw horizontal line
            doc.line(margin, yPos, margin + contentWidth, yPos);
            yPos += 2;
        });
        
        // Add footer with totals
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Items: ${order.items.length}`, margin + contentWidth - 40, yPos);
        yPos += 5;
        doc.text(`Total Quantity: ${totalQty}`, margin + contentWidth - 40, yPos);
    } else {
        yPos += 5;
        doc.text('No items found', margin + 2, yPos);
    }
    
    // Save the PDF
    doc.save(`Order-${orderId}.pdf`);
}

// Check if required libraries are available and load them if not
function checkAndLoadRequiredLibraries() {
    // Check for html2canvas
    if (typeof html2canvas === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
    }
    
    // Check for jsPDF
    if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', checkAndLoadRequiredLibraries);


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
function sendToBilling(orderId) {
    firebase.database().ref('orders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            if (!order) {
                throw new Error('Order not found');
            }

            // Get the current SRQ values
            const srqValues = getCurrentSRQValues(orderId);

            // Check if there's an existing billing order with the same order number
            return firebase.database().ref('billingOrders').orderByChild('orderNumber').equalTo(order.orderNumber).once('value')
                .then(billingSnapshot => {
                    let billingOrder;
                    let billingOrderKey;

                    if (billingSnapshot.exists()) {
                        // An existing billing order was found
                        billingSnapshot.forEach(childSnapshot => {
                            billingOrder = childSnapshot.val();
                            billingOrderKey = childSnapshot.key;
                        });
                        billingOrder = mergeBillingOrders(billingOrder, order, srqValues);
                    } else {
                        // No existing billing order, create a new one
                        billingOrder = createBillingOrder(order, srqValues);
                        billingOrderKey = orderId;
                    }

                    // Update the pending order
                    const updatedPendingOrder = updatePendingOrder(order, srqValues);

                    // Perform the database updates
                    return firebase.database().ref().update({
                        [`billingOrders/${billingOrderKey}`]: billingOrder,
                        [`orders/${orderId}`]: updatedPendingOrder
                    });
                });
        })
        .then(() => {
            console.log(`Order ${orderId} sent to billing successfully`);
            showNotification('Order sent to billing successfully');
            
            // Set a flag in localStorage to indicate we want to show pending orders after refresh
            localStorage.setItem('showPendingOrders', 'true');

            // Refresh the page
            window.location.reload();
        })
        .catch(error => {
            console.error("Error sending order to billing: ", error);
            showNotification('Error sending order to billing. Please try again.');
        });
}

function mergeBillingOrders(existingBillingOrder, newOrder, srqValues) {
    // Create a deep copy of existing order to avoid mutations
    const mergedOrder = JSON.parse(JSON.stringify(existingBillingOrder));
    
    // Initialize totalQuantity if it doesn't exist
    mergedOrder.totalQuantity = mergedOrder.totalQuantity || 0;
    
    // Ensure items array exists
    mergedOrder.items = mergedOrder.items || [];

    // Process each item from the new order
    newOrder.items.forEach(newItem => {
        const itemName = newItem.name;
        const existingItem = mergedOrder.items.find(item => item.name === itemName);
        
        // Skip if no srqValues for this item
        if (!srqValues[itemName]) {
            console.warn(`No SRQ values found for item: ${itemName}`);
            return;
        }

        if (existingItem) {
            // Merge quantities for existing item
            existingItem.colors = existingItem.colors || {};
            existingItem.totalQuantity = existingItem.totalQuantity || 0;

            // Process each color in srqValues
            Object.entries(srqValues[itemName]).forEach(([color, sizes]) => {
                if (!existingItem.colors[color]) {
                    existingItem.colors[color] = {};
                }

                // Process each size for the current color
                Object.entries(sizes).forEach(([size, quantity]) => {
                    if (quantity > 0) {
                        existingItem.colors[color][size] = (existingItem.colors[color][size] || 0) + quantity;
                        existingItem.totalQuantity += quantity;
                        mergedOrder.totalQuantity += quantity;
                    }
                });
            });
        } else {
            // Create new item structure
            const newBillingItem = {
                name: itemName,
                colors: {},
                totalQuantity: 0
            };

            // Process srqValues for new item
            Object.entries(srqValues[itemName]).forEach(([color, sizes]) => {
                newBillingItem.colors[color] = {};
                
                Object.entries(sizes).forEach(([size, quantity]) => {
                    if (quantity > 0) {
                        newBillingItem.colors[color][size] = quantity;
                        newBillingItem.totalQuantity += quantity;
                        mergedOrder.totalQuantity += quantity;
                    }
                });
            });

            // Only add the item if it has any quantities
            if (newBillingItem.totalQuantity > 0) {
                mergedOrder.items.push(newBillingItem);
            }
        }
    });

    return mergedOrder;
}


// Add this function to your main JavaScript file or inline script
function checkAndShowPendingOrders() {
    if (localStorage.getItem('showPendingOrders') === 'true') {
        // Clear the flag
        localStorage.removeItem('showPendingOrders');

        // Show pending orders
        const pendingLink = document.querySelector('.nav-link[data-section="pending-orders"]');
        if (pendingLink) {
            pendingLink.click();
        } else if (typeof loadPendingOrders === 'function') {
            loadPendingOrders();
        }
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', checkAndShowPendingOrders);
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 1000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function createBillingItem(item, srqValues) {
    const billingItem = { ...item, colors: {}, totalQuantity: 0 };

    Object.keys(srqValues || {}).forEach(color => {
        Object.keys(srqValues[color] || {}).forEach(size => {
            const srqValue = srqValues[color][size] || 0;
            if (srqValue > 0) {
                if (!billingItem.colors[color]) {
                    billingItem.colors[color] = {};
                }
                billingItem.colors[color][size] = srqValue;
                billingItem.totalQuantity += srqValue;
            }
        });
    });

    return billingItem;
}

function createBillingOrder(order, srqValues) {
    const billingOrder = { ...order };
    billingOrder.status = 'billing';
    billingOrder.totalQuantity = 0;
    billingOrder.items = order.items.map(item => createBillingItem(item, srqValues[item.name]))
        .filter(item => item.totalQuantity > 0);
    billingOrder.totalQuantity = billingOrder.items.reduce((total, item) => total + item.totalQuantity, 0);
    return billingOrder;
}
function updatePendingOrder(order, srqValues) {
    const updatedOrder = {...order};
    updatedOrder.totalQuantity = 0;

    updatedOrder.items = order.items.map(item => {
        const updatedItem = {...item};
        updatedItem.colors = {};

        if (item.colors) {
            // Merged order structure
            Object.keys(item.colors).forEach(color => {
                if (srqValues[item.name] && srqValues[item.name][color]) {
                    updatedItem.colors[color] = {};
                    Object.keys(item.colors[color]).forEach(size => {
                        const originalQty = item.colors[color][size];
                        const srqValue = srqValues[item.name][color][size] || 0;
                        const remainingQty = originalQty - srqValue;
                        if (remainingQty > 0) {
                            updatedItem.colors[color][size] = remainingQty;
                            updatedOrder.totalQuantity += remainingQty;
                        }
                    });
                }
            });
        } else if (item.quantities) {
            // Normal order structure
            const color = item.color || 'N/A';
            updatedItem.colors[color] = {};
            Object.keys(item.quantities).forEach(size => {
                const originalQty = item.quantities[size];
                const srqValue = srqValues[item.name] && srqValues[item.name][color] && srqValues[item.name][color][size] || 0;
                const remainingQty = originalQty - srqValue;
                if (remainingQty > 0) {
                    updatedItem.colors[color][size] = remainingQty;
                    updatedOrder.totalQuantity += remainingQty;
                }
            });
        }

        return updatedItem;
    }).filter(item => Object.keys(item.colors).length > 0);

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


//DELETE
function openDeleteModal1(orderId) {
    console.log('openDeleteModal1 called with orderId:', orderId);
    const modalId = `deleteConfirmationDialog-${orderId}`;
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'delete-confirmation-dialog';
    
    const reasonGroupName = `deleteReason-${orderId}`;
    const customReasonId = `customDeleteReason-${orderId}`;
    const confirmDeleteId = `confirmDelete-${orderId}`;
    const cancelDeleteId = `cancelDelete-${orderId}`;

    modal.innerHTML = `
        <div class="delete-confirmation-dialog-content">
            <h2>Delete Order</h2>
            <p>Please select a reason for deleting this order:</p>
            <div class="quick-reasons">
                <label><input type="checkbox" name="${reasonGroupName}" value="Order placed by mistake"> Order placed by mistake</label>
                <label><input type="checkbox" name="${reasonGroupName}" value="Duplicate order"> Duplicate order</label>
                <label><input type="checkbox" name="${reasonGroupName}" value="Order cancelled by party"> Order cancelled by party</label>
                <label><input type="checkbox" name="${reasonGroupName}" value="Order cancelled due to no stock in company"> Order cancelled due to no stock in company</label>
            </div>
            <textarea id="${customReasonId}" placeholder="Or enter your own reason here"></textarea>
            <div class="modal-actions">
                <button id="${confirmDeleteId}">Delete</button>
                <button id="${cancelDeleteId}">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    console.log('Delete confirmation dialog appended to body:', modalId);

    // Make sure the modal is visible
    modal.classList.add('show');

    document.getElementById(confirmDeleteId).addEventListener('click', () => {
        console.log('Confirm delete clicked');
        const selectedReasons = Array.from(document.querySelectorAll(`input[name="${reasonGroupName}"]:checked`)).map(input => input.value);
        const customReason = document.getElementById(customReasonId).value;
        const deleteReason = selectedReasons.length > 0 ? selectedReasons.join(', ') : customReason;
        document.body.removeChild(modal);
        openDeleteModal2(orderId, deleteReason);
    });

    document.getElementById(cancelDeleteId).addEventListener('click', () => {
        console.log('Cancel delete clicked');
        document.body.removeChild(modal);
    });
}

function openDeleteModal2(orderId, deleteReason) {
    const modalId = `deleteFinalConfirmationDialog-${orderId}`;
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'delete-confirmation-dialog';

    const confirmFinalDeleteId = `confirmFinalDelete-${orderId}`;
    const cancelFinalDeleteId = `cancelFinalDelete-${orderId}`;

    modal.innerHTML = `
        <div class="delete-confirmation-dialog-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this order?</p>
            <p>The order will remain in the Delete section for 30 days and then be automatically deleted.</p>
            <div class="modal-actions">
                <button id="${confirmFinalDeleteId}">Yes, Delete</button>
                <button id="${cancelFinalDeleteId}">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('show');

    document.getElementById(confirmFinalDeleteId).addEventListener('click', () => {
        deleteOrder(orderId, deleteReason);
        document.body.removeChild(modal);
        showDeleteConfirmation();
    });

    document.getElementById(cancelFinalDeleteId).addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}


function showDeleteConfirmation() {
    const modal = document.createElement('div');
    modal.id = 'deleteConfirmationModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Order Deleted</h2>
            <p>The order has been successfully deleted.</p>
            <button id="closeDeleteConfirmation">Close</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('closeDeleteConfirmation').addEventListener('click', () => {
        document.body.removeChild(modal);
        loadPendingOrders(); // Refresh the orders section
    });
}
function deleteOrder(orderId, deleteReason) {
    const orderRef = firebase.database().ref('orders').child(orderId);
    orderRef.once('value')
        .then(snapshot => {
            const order = snapshot.val();
            if (order) {
                const deletedOrderRef = firebase.database().ref('deletedOrders').child(orderId);
                return deletedOrderRef.set({
                    ...order,
                    deleteReason: deleteReason,
                    deleteDate: new Date().toISOString(),
                    deletedFrom: 'Pending',
                    scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
                }).then(() => {
                    return orderRef.remove();
                });
            }
        })
        .then(() => {
            console.log(`Order ${orderId} moved to deleted orders from pending section`);
            window.location.reload(); // Refresh the page after the order is deleted
        })
        .catch(error => {
            console.error("Error deleting order: ", error);
        });
}

// Add this function to check and delete expired orders automatically
function checkAndDeleteExpiredOrders() {
    const now = new Date();
    firebase.database().ref('deletedOrders').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const promises = [];
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    const deletionDate = new Date(order.scheduledDeletionDate);
                    if (deletionDate <= now) {
                        // Order has expired, delete it completely
                        promises.push(
                            firebase.database().ref('deletedOrders').child(childSnapshot.key).remove()
                                .then(() => {
                                    console.log(`Automatically deleted order ${childSnapshot.key} as it passed 30 days`);
                                })
                        );
                    }
                });
                return Promise.all(promises);
            }
        })
        .catch(error => {
            console.error("Error checking for expired orders: ", error);
        });
}


function loadDeletedOrders() {
    const deletedOrdersContainer = document.getElementById('deletedOrders');
    deletedOrdersContainer.innerHTML = '<h4>Deleted Orders</h4>';

    firebase.database().ref('deletedOrders').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const deletedOrders = [];
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    order.id = childSnapshot.key;
                    deletedOrders.push(order);
                });
                displayDeletedOrders(deletedOrders, deletedOrdersContainer);
            } else {
                deletedOrdersContainer.innerHTML += '<p>No deleted orders found.</p>';
            }
        })
        .catch(error => {
            console.error("Error loading deleted orders: ", error);
            deletedOrdersContainer.innerHTML += '<p>Error loading deleted orders. Please try again.</p>';
        });
}
function displayDeletedOrders(orders, container) {
    // Clear existing content
    container.innerHTML = '<h4>Deleted Orders</h4>';

    // Sort orders by deleteDate (newest first)
    orders.sort((a, b) => {
        const dateA = new Date(a.deleteDate || 0);
        const dateB = new Date(b.deleteDate || 0);
        return dateB - dateA;
    });

    const displayedOrderIds = new Set();

    orders.forEach(order => {
        if (displayedOrderIds.has(order.id)) {
            console.warn(`Duplicate order detected: ${order.id}`);
            return;
        }
        displayedOrderIds.add(order.id);

        const orderDiv = document.createElement('div');
        orderDiv.className = 'deleted-order-container mb-4 p-3 border rounded';
        orderDiv.dataset.orderId = order.id;

        const deletionDate = new Date(order.scheduledDeletionDate);
        const deleteDate = order.deleteDate ? new Date(order.deleteDate) : null;
        const daysUntilDeletion = Math.ceil((deletionDate - new Date()) / (1000 * 60 * 60 * 24));

        // Generate HTML for items in table format
        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            itemsHtml = `
            <div class="order-items mt-3">
                <h5 class="mb-3">Items:</h5>
                <div class="table-responsive">
                    <table class="table table-bordered table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>Item Name</th>
                                <th>Color</th>
                                <th>Size Quantities</th>
                            </tr>
                        </thead>
                        <tbody>`;

            order.items.forEach(item => {
                if (item.colors && Object.keys(item.colors).length > 0) {
                    const colors = Object.keys(item.colors);
                    let isFirstColor = true;
                    
                    colors.forEach(color => {
                        // Add separator line between colors of same item
                        if (!isFirstColor) {
                            itemsHtml += `
                            <tr class="color-separator">
                                <td colspan="3"><hr class="m-0"></td>
                            </tr>`;
                        }
                        isFirstColor = false;
                        
                        const sizes = item.colors[color];
                        const sizeQuantities = Object.entries(sizes).map(
                            ([size, qty]) => `<span class="size-qty">${size}:${qty}</span>`
                        ).join(' ');
                        
                        itemsHtml += `
                        <tr>
                            <td><strong>${item.name || 'N/A'}</strong></td>
                            <td>
                                <span class="color-badge" style="background-color: ${getColorHex(color)}">
                                    ${color}
                                </span>
                            </td>
                            <td>${sizeQuantities}</td>
                        </tr>`;
                    });
                } else {
                    itemsHtml += `
                    <tr>
                        <td><strong>${item.name || 'N/A'}</strong></td>
                        <td>N/A</td>
                        <td>N/A</td>
                    </tr>`;
                }
            });
            
            itemsHtml += `</tbody></table></div></div>`;
        }

        // Format the delete date for display
        const formattedDeleteDate = deleteDate ? 
            `${deleteDate.toLocaleDateString()} ${deleteDate.toLocaleTimeString()}` : 
            'Unknown deletion time';

        orderDiv.innerHTML = `
            <div class="order-header mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Order No. ${order.orderNumber || 'N/A'}</h5>
                    <span class="badge ${daysUntilDeletion <= 5 ? 'bg-danger' : 'bg-secondary'}">
                        Days Left: ${daysUntilDeletion}
                    </span>
                </div>
                <div class="order-meta mt-2">
                    <div><strong>Party:</strong> ${order.partyName || 'N/A'}</div>
                    <div><strong>Deleted From:</strong> ${order.deletedFrom || 'Unknown'}</div>
                    <div><strong>Deleted On:</strong> ${formattedDeleteDate}</div>
                    <div><strong>Reason:</strong> ${order.deleteReason || 'N/A'}</div>
                    <div><strong>Total Qty:</strong> ${order.totalQuantity || 0}</div>
                </div>
            </div>
            ${itemsHtml}
            <div class="order-actions mt-3 d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-outline-primary revert-to-pending" data-order-id="${order.id}">
                    <i class="bi bi-arrow-counterclockwise"></i> Revert
                </button>
                <button class="btn btn-sm btn-outline-danger permanent-delete" data-order-id="${order.id}">
                    <i class="bi bi-trash-fill"></i> Delete Permanently
                </button>
            </div>
            <style>
                .color-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    margin: 2px 0;
                    color: white;
                    font-weight: bold;
                    text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
                }
                .size-qty {
                    display: inline-block;
                    padding: 2px 6px;
                    margin: 2px;
                    border-radius: 4px;
                    border: 1px solid #dee2e6;
                }
                .color-separator hr {
                    border-top: 1px dashed #aaa;
                    margin: 3px 0;
                }
                .table th {
                    border-bottom-width: 2px;
                }
            </style>
        `;

        container.appendChild(orderDiv);

        // Add event listeners
        orderDiv.querySelector('.permanent-delete').addEventListener('click', () => permanentlyDeleteOrder(order.id));
        orderDiv.querySelector('.revert-to-pending').addEventListener('click', () => revertToPending(order.id));
    });

    console.log(`Displayed ${displayedOrderIds.size} unique deleted orders`);
}
// Helper function to get color hex codes (simplified version)
function getColorHex(colorName) {
    const colorMap = {
        'red': '#dc3545',
        'blue': '#0d6efd',
        'green': '#198754',
        'yellow': '#ffc107',
        'black': '#212529',
        'white': '#f8f9fa',
        'gray': '#6c757d',
        'pink': '#d63384',
        'orange': '#fd7e14',
        'purple': '#6f42c1'
    };
    return colorMap[colorName.toLowerCase()] || '#6c757d'; // Default to gray if not found
}
function permanentlyDeleteOrder(orderId) {
    if (confirm('Are you sure you want to permanently delete this order? This action cannot be undone.')) {
        firebase.database().ref('deletedOrders').child(orderId).remove()
            .then(() => {
                console.log(`Order ${orderId} permanently deleted`);
                loadDeletedOrders(); // Refresh the deleted orders section
            })
            .catch(error => {
                console.error("Error permanently deleting order: ", error);
            });
    }
}

function revertToPending(orderId) {
    const deletedOrderRef = firebase.database().ref('deletedOrders').child(orderId);
    deletedOrderRef.once('value')
        .then(snapshot => {
            const order = snapshot.val();
            if (order) {
                // Move the order back to the pending orders section
                const pendingOrderRef = firebase.database().ref('orders').child(orderId);
                return pendingOrderRef.set({
                    ...order,
                    status: 'Pending' // Ensure the status is set back to Pending
                }).then(() => {
                    // Remove the order from the deleted orders section
                    return deletedOrderRef.remove();
                });
            }
        })
        .then(() => {
            console.log(`Order ${orderId} reverted to pending`);
            loadDeletedOrders(); // Refresh the deleted orders section
            loadPendingOrders(); // Refresh the pending orders section
        })
        .catch(error => {
            console.error("Error reverting order to pending: ", error);
        });
}
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

function getExpiryStatus(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
        return {
            status: 'expired',
            class: 'expiry-expired',
            label: 'Expired',
            icon: '⏱️',
            days: 0,
            percentage: 0
        };
    } else if (daysRemaining <= 5) {
        const percentage = Math.min(100, Math.max(0, (daysRemaining / 5) * 100));
        return {
            status: 'critical',
            class: 'expiry-critical',
            label: `Critical (${daysRemaining}d)`,
            icon: '⚠️',
            days: daysRemaining,
            percentage: percentage
        };
    } else if (daysRemaining <= 10) {
        const percentage = Math.min(100, Math.max(0, (daysRemaining / 10) * 100));
        return {
            status: 'warning',
            class: 'expiry-warning',
            label: `Warning (${daysRemaining}d)`,
            icon: '🔔',
            days: daysRemaining,
            percentage: percentage
        };
    } else {
        const percentage = Math.min(100, Math.max(0, (daysRemaining / 30) * 100));
        return {
            status: 'normal',
            class: 'expiry-normal',
            label: `Normal (${daysRemaining}d)`,
            icon: '✅',
            days: daysRemaining,
            percentage: percentage
        };
    }
}
