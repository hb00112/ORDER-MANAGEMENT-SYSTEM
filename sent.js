
function loadSentOrders() {
    const sentOrdersContainer = document.getElementById('sentOrdersContainer');
    if (!sentOrdersContainer) return;
    
    sentOrdersContainer.innerHTML = '<p>Loading orders...</p>';

    if (!firebase?.database) {
        sentOrdersContainer.innerHTML = '<p>Error: Firebase not initialized</p>';
        return;
    }

    firebase.database().ref('sentOrders').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const orders = [];
                try {
                    snapshot.forEach(childSnapshot => {
                        try {
                            const order = childSnapshot.val();
                            if (order && typeof order === 'object') {
                                // Normalize the order data to handle different formats
                                const normalizedOrder = normalizeOrderData(order, childSnapshot.key);
                                if (normalizedOrder) {
                                    orders.push(normalizedOrder);
                                }
                            }
                        } catch (orderError) {
                            console.error("Error processing individual order:", orderError, childSnapshot.key);
                        }
                    });
                    
                    // Sort orders by billing date in descending order
                    orders.sort((a, b) => {
                        const dateA = a.billingDate ? new Date(a.billingDate) : new Date(0);
                        const dateB = b.billingDate ? new Date(b.billingDate) : new Date(0);
                        return dateB - dateA;
                    });
                    
                    // Merge orders with same order number and bill date
                    const mergedOrders = mergeOrders(orders);
                    
                    if (mergedOrders.length === 0) {
                        sentOrdersContainer.innerHTML = '<p>No orders found</p>';
                        return;
                    }

                    sentOrdersContainer.innerHTML = ''; // Clear loading message
                    mergedOrders.forEach((order, index) => {
                        const orderElement = createSentOrderElement(order, index);
                        sentOrdersContainer.appendChild(orderElement);
                    });
                } catch (error) {
                    console.error("Error processing orders: ", error);
                    sentOrdersContainer.innerHTML = '<p>Error processing orders</p>';
                }
            } else {
                sentOrdersContainer.innerHTML = '<p>No sent orders</p>';
            }
        })
        .catch(error => {
            console.error("Error loading sent orders: ", error);
            sentOrdersContainer.innerHTML = '<p>Error loading sent orders: ' + error.message + '</p>';
        });
}
/*
function normalizeOrderData(order, key) {
    try {
        // Create a normalized order object that works with both old and new formats
        const normalized = {
            key: key,
            orderNumber: order.orderNumber || order.orderNo || 'N/A',
            dateTime: order.dateTime || order.orderDate || order.date || null,
            billingDate: order.billingDate || order.billDate || order.dateTime || order.orderDate || order.date || null,
            partyName: order.partyName || order.party || 'Unknown',
            billedQuantities: {}
        };

        // Handle different quantity formats
        if (order.billedQuantities) {
            // New format
            normalized.billedQuantities = order.billedQuantities;
        } else if (order.quantities) {
            // Old format with flat quantities
            normalized.billedQuantities = convertOldQuantityFormat(order.quantities);
        } else if (order.items) {
            // Alternative old format with items array
            normalized.billedQuantities = convertItemsArrayFormat(order.items);
        }

        // Ensure billingDate is in correct format
        if (normalized.billingDate) {
            const date = new Date(normalized.billingDate);
            if (!isNaN(date.getTime())) {
                normalized.billingDate = date.toISOString();
            }
        }

        return normalized;
    } catch (error) {
        console.error("Error normalizing order data:", error, order);
        return null;
    }
}*/

function convertOldQuantityFormat(quantities) {
    // Convert old flat quantities format to new nested format
    const converted = {};
    
    try {
        if (typeof quantities === 'object') {
            Object.entries(quantities).forEach(([key, quantity]) => {
                // Try to parse the key which might be in format "itemName_color_size"
                const parts = key.split('_');
                if (parts.length >= 3) {
                    const [itemName, color, size] = parts;
                    
                    if (!converted[itemName]) {
                        converted[itemName] = {};
                    }
                    if (!converted[itemName][color]) {
                        converted[itemName][color] = {};
                    }
                    converted[itemName][color][size] = parseInt(quantity) || 0;
                } else {
                    // Handle cases where the key format is different
                    if (!converted['Unknown Item']) {
                        converted['Unknown Item'] = {};
                    }
                    if (!converted['Unknown Item']['Default']) {
                        converted['Unknown Item']['Default'] = {};
                    }
                    converted['Unknown Item']['Default'][key] = parseInt(quantity) || 0;
                }
            });
        }
    } catch (error) {
        console.error("Error converting old quantity format:", error);
    }
    
    return converted;
}

function convertItemsArrayFormat(items) {
    // Convert items array format to new nested format
    const converted = {};
    
    try {
        if (Array.isArray(items)) {
            items.forEach(item => {
                const itemName = item.name || 'Unknown Item';
                const color = item.color || 'Default';
                const size = item.size || 'One Size';
                const quantity = parseInt(item.quantity) || 0;
                
                if (!converted[itemName]) {
                    converted[itemName] = {};
                }
                if (!converted[itemName][color]) {
                    converted[itemName][color] = {};
                }
                if (!converted[itemName][color][size]) {
                    converted[itemName][color][size] = 0;
                }
                converted[itemName][color][size] += quantity;
            });
        }
    } catch (error) {
        console.error("Error converting items array format:", error);
    }
    
    return converted;
}
/*
function mergeOrders(orders) {
    const mergedOrdersMap = new Map();

    orders.forEach(order => {
        if (!order) return;
        
        try {
            const key = `${order.orderNumber}_${formatDateOnly(order.billingDate)}`;
            if (!mergedOrdersMap.has(key)) {
                mergedOrdersMap.set(key, { 
                    ...order, 
                    partyNames: new Set([order.partyName]),
                    billedQuantities: order.billedQuantities || {}
                });
            } else {
                const existingOrder = mergedOrdersMap.get(key);
                existingOrder.partyNames.add(order.partyName);
                
                // Safely merge billedQuantities
                if (order.billedQuantities && typeof order.billedQuantities === 'object') {
                    Object.entries(order.billedQuantities).forEach(([item, colors]) => {
                        if (!existingOrder.billedQuantities[item]) {
                            existingOrder.billedQuantities[item] = colors;
                        } else {
                            Object.entries(colors).forEach(([color, sizes]) => {
                                if (!existingOrder.billedQuantities[item][color]) {
                                    existingOrder.billedQuantities[item][color] = sizes;
                                } else {
                                    Object.entries(sizes).forEach(([size, quantity]) => {
                                        const existingQty = existingOrder.billedQuantities[item][color][size] || 0;
                                        existingOrder.billedQuantities[item][color][size] = existingQty + (quantity || 0);
                                    });
                                }
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error merging order:", error, order);
        }
    });

    return Array.from(mergedOrdersMap.values());
}*/
function createSentOrderElement(order, index) {
    const orderDiv = document.createElement('div');
    orderDiv.className = 'order-container mb-4 p-3 bg-pink-100 rounded';
    
    // Calculate total quantity
    const totalQuantity = order.billedItems.reduce((sum, item) => sum + item.quantity, 0);
    
    orderDiv.innerHTML = `
        <div class="order-header">
            <h5 class="font-bold">Order No: ${order.orderNumber}</h5>
            <p>Order Date: ${formatDate(order.date)}</p>
            <p>Bill Date: ${formatDate(order.billingDate)}</p>
            <p>Party Name(s): ${order.partyName}</p>
        </div>
        <div class="table-responsive mt-3">
            <table class="table table-bordered">
                <thead class="bg-pink-200">
                    <tr>
                        <th>Item</th>
                        <th>Color</th>
                        <th>Size</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    ${createSentOrderItemRows(order.billedItems)}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-right font-bold">Total Quantity:</td>
                        <td class="font-bold">${totalQuantity}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    return orderDiv;
}

function createSentOrderItemRows(items) {
    if (!items || !Array.isArray(items)) return '';
    
    return items.map(item => `
        <tr>
            <td>${item.name || 'N/A'}</td>
            <td>${item.color || 'N/A'}</td>
            <td>${item.size || 'N/A'}</td>
            <td>${item.quantity || 0}</td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Return original if invalid
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

function calculateTotalQuantity(billedQuantities) {
    if (!billedQuantities) return 0;

    let total = 0;
    for (const colors of Object.values(billedQuantities)) {
        for (const sizes of Object.values(colors)) {
            for (const quantity of Object.values(sizes)) {
                total += quantity;
            }
        }
    }
    return total;
}

function createItemsTable(billedQuantities) {
    if (!billedQuantities) return '<p>No items billed</p>';

    let tableHTML = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Color</th>
                    <th>Size</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const [item, colors] of Object.entries(billedQuantities)) {
        for (const [color, sizes] of Object.entries(colors)) {
            for (const [size, quantity] of Object.entries(sizes)) {
                tableHTML += `
                    <tr>
                        <td>${item}</td>
                        <td>${color}</td>
                        <td>${size}</td>
                        <td>${quantity}</td>
                    </tr>
                `;
            }
        }
    }

    tableHTML += `
            </tbody>
        </table>
    `;

    return tableHTML;
}



function formatDateOnly(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(); // This will return only the date part
}

// Load sent orders when the page loads
document.addEventListener('DOMContentLoaded', loadSentOrders);



// Utility function to safely get nested object properties
function getNestedValue(obj, ...args) {
    return args.reduce((obj, level) => obj && obj[level], obj);
}

document.getElementById('sentOrdersBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
});
