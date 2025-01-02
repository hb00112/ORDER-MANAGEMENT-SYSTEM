// Ensure the DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    initializeDB()
        .then(() => {
            console.log("IndexedDB initialized");
            initializeUI();
            loadPendingOrders(); // This will now also load archived orders
            startSyncCycle();
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
  
    // Add CSS styles for stock availability and status icon
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
    `;
    document.head.appendChild(styleElement);
  
    // Get stock data from IndexedDB
    getStockData().then(stockData => {
        // Get export status data from Firebase
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
  
                // Add existing event listeners
                const dropdownToggle = orderDiv.querySelector(`#dropdownMenuButton-${order.id}`);
                const dropdownMenu = orderDiv.querySelector(`#dropdown-${order.id}`);
  
                dropdownToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
                });
  
                const deleteButton = orderDiv.querySelector('.delete-order');
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Delete button clicked for order:', order.id);
                    openDeleteModal1(order.id);
                    dropdownMenu.style.display = 'none';
                });
  
                const exportButton = orderDiv.querySelector('.export-order');
                exportButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Export button clicked for order:', order.id);
                    exportOrderToExcel(order);
                    updateExportStatus(order.id, true);
                    const statusIcon = orderDiv.querySelector(`#status-${order.id}`);
                    statusIcon.textContent = '✓';
                    statusIcon.classList.remove('status-cross');
                    statusIcon.classList.add('status-tick');
                    dropdownMenu.style.display = 'none';
                });
  
                document.addEventListener('click', () => {
                    dropdownMenu.style.display = 'none';
                });
  
                if (currentOrders[order.id]) {
                    updateDetailedView(order.id);
                }
            });
  
            // Initialize SRQ inputs after adding content to the DOM
            initializeSRQInputs(container);
        });
    });
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
function exportOrderToExcel(order) {
    console.log('Exporting order:', order);
    const exportData = [];

    order.items.forEach((item) => {
        if (item.quantities && typeof item.quantities === 'object') {
            Object.entries(item.quantities).forEach(([size, qty]) => {
                if (qty > 0) {
                    exportData.push({
                        'Item Name': item.name,
                        'Color': item.color,
                        'Size': size,
                        'Quantity': qty
                    });
                }
            });
        } else {
            console.warn(`No quantities found for item: ${item.name}, color: ${item.color}`);
        }
    });

    if (exportData.length === 0) {
        console.error('No data to export');
        alert('No data to export. Please check the order details.');
        return;
    }

    // Create and download Excel file
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
        { wch: 30 }, // Item Name
        { wch: 15 }, // Color
        { wch: 10 }, // Size
        { wch: 10 }  // Quantity
    ];
    ws['!cols'] = colWidths;

    // Calculate the last row of data
    const lastRow = exportData.length + 1; // +1 for header row

    // Add empty row for spacing
    XLSX.utils.sheet_add_json(ws, [{}], { origin: lastRow + 1 });

    // Add instructions
    const instructions = [
        ["COPY THE ABOVE DATA (DONT COPY HEADER) AND PASTE IT IN THE MAIN ORDER FORMAT OF COMPANY FROM A5838"],
        ["THEN PRESS (Alt + F11) AND CREATE NEW MODULE AND PASTE THE BELOW CODE THERE AND RUN IT"],
        ["CODE:"],
        [`Sub UpdateQuantities()
    Dim lastRow As Long
    Dim formLastRow As Long
    Dim inputRow As Long
    Dim formRow As Long
    Dim ws As Worksheet
    Dim found As Boolean
    Dim unmatchedCount As Long
    
    Set ws = ActiveSheet
    
    ' Find last row of the form (searching up to row 5840)
    formLastRow = 5840
    
    ' Find last row of input data (starting from row 5842)
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    ' Clear any previous highlighting in the input area
    ws.Range("A5842:D" & lastRow).Interior.ColorIndex = xlNone
    
    unmatchedCount = 0
    
    ' Loop through each input row starting from 5842
    For inputRow = 5842 To lastRow
        found = False
        
        ' Get input values
        Dim inputStyle As String
        Dim inputColor As String
        Dim inputSize As String
        Dim inputQty As Variant
        
        inputStyle = ws.Cells(inputRow, 1).Value  ' Column A
        inputColor = ws.Cells(inputRow, 2).Value  ' Column B
        inputSize = ws.Cells(inputRow, 3).Value   ' Column C
        inputQty = ws.Cells(inputRow, 4).Value    ' Column D
        
        ' Skip empty rows
        If Trim(inputStyle) <> "" Then
            ' Loop through form rows to find matching entry
            For formRow = 1 To formLastRow
                ' Get form values
                Dim formStyle As String
                Dim formColor As String
                Dim formSize As String
                
                formStyle = ws.Cells(formRow, "D").Value   ' Style column (changed from C to D)
                formColor = ws.Cells(formRow, "F").Value   ' Color column (changed from E to F)
                formSize = ws.Cells(formRow, "J").Value    ' Size column (changed from I to J)
                
                ' Check if all criteria match
                If formStyle = inputStyle And _
                   formColor = inputColor And _
                   formSize = inputSize Then
                    
                    ' Update quantity in column M
                    ws.Cells(formRow, "M").Value = inputQty
                    found = True
                    Exit For
                End If
            Next formRow
            
            ' Highlight unmatched entries in red
            If Not found Then
                ' Highlight entire row in light red
                With ws.Range("A" & inputRow & ":D" & inputRow).Interior
                    .Color = RGB(255, 200, 200)  ' Light red color
                End With
                unmatchedCount = unmatchedCount + 1
                
                ' Log unmatched entry details
                Debug.Print "No match found for: Style=" & inputStyle & _
                           ", Color=" & inputColor & _
                           ", Size=" & inputSize
            End If
        End If
    Next inputRow
    
    ' Show completion message with count of unmatched entries
    If unmatchedCount > 0 Then
        MsgBox "Update complete!" & vbNewLine & _
               unmatchedCount & " unmatched entries were found and highlighted in red.", _
               vbInformation
    Else
        MsgBox "Update complete! All entries were successfully matched.", _
               vbInformation
    End If
End Sub`]
    ];

    // Add instructions to worksheet starting from the row after the data plus spacing
    instructions.forEach((row, index) => {
        XLSX.utils.sheet_add_json(ws, [{ 'Item Name': row[0] }], {
            origin: lastRow + 2 + index,
            skipHeader: true
        });
    });
    
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
    XLSX.writeFile(wb, `purchase_order_${order.orderNumber || 'export'}.xlsx`);

    // Email functionality remains the same
    setTimeout(() => {
        const to = 'vishalkulkarni@modenik.in';
        const cc = 'chandra.niwas@modenik.in,MANJUNATH.AVAROLKAR@modenik.in';
        const subject = 'ENAMOR ORDER - KAMBESHWAR AGENCIES';
        const body = `Dear Modenik Lifestyle Pvt Ltd (Enamor Division),

I hope this email finds you well. Please find the attached Enamor order to this email.

Thank you for your attention to this matter.

Best regards,
Kambeshwar Agencies`;

        const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.open(gmailComposeUrl, '_blank');
    }, 1000);
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

// Add these helper functions





function displaySummarizedOrders(orders, container) {
    console.log('Displaying summarized orders. Total orders:', orders.length);
    container.innerHTML = '';
    const groupedOrders = groupOrdersByParty(orders);
    console.log('Grouped orders:', groupedOrders);
    
    for (const [partyName, group] of Object.entries(groupedOrders)) {
        // Get only items with non-zero SRQ
        const nonZeroItems = group.flatMap(order => 
            (order.items || []).filter(item => {
                const totalQuantity = Object.values(item.quantities || {})
                    .reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
                return totalQuantity > 0;
            })
        );
        
        // Calculate total quantity only for non-zero SRQ items
        const totalQty = nonZeroItems.reduce((sum, item) => {
            const itemTotal = Object.values(item.quantities || {})
                .reduce((itemSum, qty) => itemSum + parseInt(qty) || 0, 0);
            return sum + itemTotal;
        }, 0);

        // Get unique item codes (without color) only for items with non-zero SRQ
        const itemCodes = [...new Set(nonZeroItems.map(item => {
            // Extract just the item code part (before the parenthesis)
            const itemName = item.name;
            return itemName.split('(')[0];
        }))].join(', ');
        
        console.log('Creating row for:', partyName, 'Total Quantity:', totalQty, 'Items:', itemCodes);
        const row = document.createElement('tr');
        
        // Check if any order in the group has been sent to billing
        const sentToBilling = group.some(order => order.status === 'Sent to Billing');
        if (sentToBilling) {
            row.classList.add('sent-to-billing');
        }
        
        row.innerHTML = `
            <td>${partyName}</td>
            <td>
                <span class="item-names">${itemCodes}</span>
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
        
        // Check if order has any items with non-zero SRQ
        const hasNonZeroItems = order.items && Array.isArray(order.items) && 
            order.items.some(item => {
                const totalQuantity = Object.values(item.quantities || {})
                    .reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
                return totalQuantity > 0;
            });
            
        if (hasNonZeroItems) {
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
                // Filter and display only items with non-zero SRQ
                order.items.forEach(item => {
                    const totalQuantity = Object.values(item.quantities || {})
                        .reduce((sum, qty) => sum + parseInt(qty) || 0, 0);
                    
                    // Only create row if SRQ (totalQuantity) is greater than 0
                    if (totalQuantity > 0) {
                        const sizesWithQuantities = Object.entries(item.quantities || {})
                            .map(([size, quantity]) => `${size}/${quantity}`)
                            .join(', ');
                        
                        modalHTML += `
                            <tr>
                                <td>${item.name}(${item.color || 'N/A'})</td>
                                <td class="sizes-cell">${sizesWithQuantities}</td>
                                <td>${totalQuantity}</td>
                            </tr>
                        `;
                    }
                });
            }
            
            modalHTML += `
                    </tbody>
                </table>
            `;
            
            if (index < orders.length - 1) {
                modalHTML += '<hr>'; // Add a separator between orders
            }
        }
    });
    
    modalBody.innerHTML = modalHTML;
    
    // Set modal to full screen with small margins
    modalContent.style.width = '98%';
    modalContent.style.height = '96%';
    modalContent.style.margin = '1% auto';
    
    modal.style.display = 'block';
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

/*
document.addEventListener('DOMContentLoaded', function() {
    const allSections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const slideMenuLinks = document.querySelectorAll('.slide-menu a:not(.close-btn)');

    // Remove archived order button event listener
    // Remove hideArchivedOrderSection function

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Handle navigation without archived orders
        });
    });

    slideMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Handle navigation without archived orders
        });
    });
});*/





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
            <p>The order will remain in the Delete section for 20 days and then be automatically deleted.</p>
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
                    scheduledDeletionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString() // 20 days from now
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

    // Create a Set to store unique order IDs
    const displayedOrderIds = new Set();

    orders.forEach(order => {
        // Check if this order has already been displayed
        if (displayedOrderIds.has(order.id)) {
            console.warn(`Duplicate order detected: ${order.id}`);
            return; // Skip this iteration
        }

        // Add the order ID to the Set
        displayedOrderIds.add(order.id);

        const orderDiv = document.createElement('div');
        orderDiv.className = 'deleted-order-container mb-4';
        orderDiv.dataset.orderId = order.id;

        const deletionDate = new Date(order.scheduledDeletionDate);
        const daysUntilDeletion = Math.ceil((deletionDate - new Date()) / (1000 * 60 * 60 * 24));

        // Generate HTML for items
        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            itemsHtml = '<div class="order-items mt-2"><h5>Items:</h5>';
            order.items.forEach(item => {
                itemsHtml += `<div class="item-details">
                    <strong>${item.name}</strong><br>`;
                
                if (item.colors) {
                    Object.entries(item.colors).forEach(([color, sizes]) => {
                        itemsHtml += `<div class="color-details ms-3">
                            ${color}:<br>`;
                        Object.entries(sizes).forEach(([size, quantity]) => {
                            itemsHtml += `<span class="ms-4">${size}: ${quantity}</span><br>`;
                        });
                        itemsHtml += '</div>';
                    });
                }
                
                itemsHtml += '</div>';
            });
            itemsHtml += '</div>';
        }

        orderDiv.innerHTML = `
            <div class="order-header mb-2">
                <strong>Order No. ${order.orderNumber || 'N/A'}</strong><br>
                Party Name: ${order.partyName || 'N/A'}<br>
                Delete Reason: ${order.deleteReason || 'N/A'}<br>
                Deleted From: ${order.deletedFrom || 'Unknown'}<br>
                Days until permanent deletion: ${daysUntilDeletion}<br>
                Total Quantity: ${order.totalQuantity || 0}
            </div>
            ${itemsHtml}
            <div class="order-actions mt-2">
                <button class="btn btn-sm btn-danger permanent-delete" data-order-id="${order.id}">Permanently Delete</button>
                <button class="btn btn-sm btn-primary revert-to-pending" data-order-id="${order.id}">Revert to Pending</button>
            </div>
            <hr>
        `;

        container.appendChild(orderDiv);

        // Add event listeners for the buttons
        orderDiv.querySelector('.permanent-delete').addEventListener('click', () => permanentlyDeleteOrder(order.id));
        orderDiv.querySelector('.revert-to-pending').addEventListener('click', () => revertToPending(order.id));
    });

    // Log the number of unique orders displayed
    console.log(`Displayed ${displayedOrderIds.size} unique deleted orders`);
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
