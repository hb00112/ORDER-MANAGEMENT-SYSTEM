function loadBillingOrders() {
    const billingOrdersContainer = document.getElementById('billingOrders');
    billingOrdersContainer.innerHTML = '';

    firebase.database().ref('billingOrders').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    const orderElement = createOrderElement(order, childSnapshot.key);
                    billingOrdersContainer.appendChild(orderElement);
                });
            } else {
                billingOrdersContainer.innerHTML = '<p>No orders waiting for billing</p>';
            }
        })
        .catch(error => {
            console.error("Error loading billing orders: ", error);
            billingOrdersContainer.innerHTML = '<p>Error loading billing orders</p>';
        });
}

function createOrderElement(order, orderId) {
    const orderDiv = document.createElement('div');
    orderDiv.className = 'order-container mb-4';
    
    orderDiv.innerHTML = `
        <div class="order-header">
            <h5>Order No: ${order.orderNumber || 'N/A'}</h5>
            <p>Party Name: ${order.partyName || 'N/A'}</p>
            <p>Date: ${order.date || new Date().toLocaleDateString()}</p>
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Order (Size/Qty)</th>
                        <th>Bill</th>
                    </tr>
                </thead>
                <tbody>
                    ${createOrderItemRows(order.items)}
                </tbody>
            </table>
        </div>
        <div class="order-actions mt-3">
            <button class="btn btn-success bill-btn" data-order-id="${orderId}">Bill</button>
        </div>
    `;

    return orderDiv;
}

function createOrderItemRows(items) {
    if (!items || !Array.isArray(items)) return '';
    
    return items.flatMap(item => {
        return Object.entries(item.colors || {}).flatMap(([color, sizes]) => {
            return Object.entries(sizes).map(([size, qty]) => `
                <tr>
                    <td>${item.name} (${color})</td>
                    <td>${size}/${qty}</td>
                    <td>
                        <div class="quantity-control">
                            <button class="btn btn-sm btn-outline-secondary decrease">-</button>
                            <input type="number" class="form-control form-control-sm mx-2 bill-quantity" 
                                   value="${qty}" min="0" max="${qty}" 
                                   data-item="${item.name}" data-color="${color}" data-size="${size}">
                            <button class="btn btn-sm btn-outline-secondary increase">+</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        });
    }).join('');
}

// Event listeners for the quantity controls and buttons
document.getElementById('billingOrders').addEventListener('click', function(e) {
    if (e.target.classList.contains('decrease')) {
        const input = e.target.parentElement.querySelector('input');
        if (input.value > 0) input.value = parseInt(input.value) - 1;
    } else if (e.target.classList.contains('increase')) {
        const input = e.target.parentElement.querySelector('input');
        if (parseInt(input.value) < parseInt(input.max)) {
            input.value = parseInt(input.value) + 1;
        }
    } else if (e.target.classList.contains('bill-btn')) {
        const orderId = e.target.getAttribute('data-order-id');
        billOrder(orderId);
    }
});
// Function to update stock quantities after billing
// Add this function to stock.js to properly handle stock updates
// Enhanced billing system functions


// Helper function to merge billed items
function mergeOrderItems(existingItems, newItems) {
    const mergedItems = [...existingItems];

    newItems.forEach(newItem => {
        const existingItemIndex = mergedItems.findIndex(item =>
            item.name === newItem.name &&
            item.color === newItem.color &&
            item.size === newItem.size
        );

        if (existingItemIndex >= 0) {
            mergedItems[existingItemIndex].quantity += newItem.quantity;
        } else {
            mergedItems.push({ ...newItem });
        }
    });

    return mergedItems;
}

// Helper function to validate billing quantities
function validateBillingQuantity(quantity, maxQuantity) {
    const qty = parseInt(quantity);
    return qty > 0 && qty <= maxQuantity;
}

// Event listener for quantity input validation
function setupQuantityInputListeners() {
    document.querySelectorAll('.bill-quantity').forEach(input => {
        input.addEventListener('input', function(e) {
            const value = parseInt(this.value);
            const max = parseInt(this.getAttribute('max'));
            
            if (value < 0) this.value = 0;
            if (value > max) this.value = max;
        });
    });
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupQuantityInputListeners();
});
// Helper function to normalize order data

// Updated normalizeOrderData function to properly handle billedItems
async function billOrder(orderId) {
    try {
        const orderContainer = document.querySelector(`.order-container:has([data-order-id="${orderId}"])`);
        if (!orderContainer) {
            throw new Error("Order container not found");
        }

        // Get order details from Firebase first
        const orderSnapshot = await firebase.database().ref('billingOrders').child(orderId).once('value');
        const originalOrder = orderSnapshot.val();
        if (!originalOrder) {
            throw new Error("Order not found in database");
        }

        // Collect billed quantities with enhanced validation
        const billQuantities = {};
        const billedItems = [];
        let hasValidBilledItems = false;
        
        // Create a deep copy of original order items to track remaining quantities
        let remainingOrderItems = [];
        
        // Process each item in the order
        if (originalOrder.items && Array.isArray(originalOrder.items)) {
            remainingOrderItems = originalOrder.items.map(item => {
                const newItem = {
                    name: item.name,
                    colors: {}
                };

                if (item.colors) {
                    Object.entries(item.colors).forEach(([color, sizes]) => {
                        newItem.colors[color] = {};
                        Object.entries(sizes).forEach(([size, maxQty]) => {
                            // Find corresponding input in the DOM
                            const input = orderContainer.querySelector(
                                `.bill-quantity[data-item="${item.name}"][data-color="${color}"][data-size="${size}"]`
                            );
                            
                            const billedQty = input ? (parseInt(input.value) || 0) : 0;
                            if (billedQty > 0 && billedQty <= maxQty) {
                                hasValidBilledItems = true;
                                
                                // Initialize nested objects if they don't exist
                                if (!billQuantities[item.name]) billQuantities[item.name] = {};
                                if (!billQuantities[item.name][color]) billQuantities[item.name][color] = {};
                                
                                // Store the billed quantity
                                billQuantities[item.name][color][size] = billedQty;
                                
                                // Add to billedItems array
                                billedItems.push({
                                    name: item.name,
                                    color: color,
                                    size: size,
                                    quantity: billedQty
                                });

                                // Calculate remaining quantity
                                const remainingQty = maxQty - billedQty;
                                if (remainingQty > 0) {
                                    newItem.colors[color][size] = remainingQty;
                                }
                            } else {
                                // If not billed, keep original quantity
                                newItem.colors[color][size] = maxQty;
                            }
                        });
                        
                        // Remove color if no sizes have remaining quantity
                        if (Object.keys(newItem.colors[color]).length === 0) {
                            delete newItem.colors[color];
                        }
                    });
                }

                // Only return item if it has colors with remaining quantities
                if (Object.keys(newItem.colors).length > 0) {
                    return newItem;
                }
                return null;
            }).filter(item => item !== null); // Remove null items
        }

        if (!hasValidBilledItems) {
            throw new Error("Please enter valid billing quantities for at least one item");
        }

        // Start Firebase operations
        const db = firebase.database();

        // Create new sent order object
        const sentOrder = {
            orderNumber: originalOrder.orderNumber,
            partyName: originalOrder.partyName,
            date: originalOrder.dateTime,
            billingDate: new Date().toISOString(),
            billedItems: billedItems,
            status: 'completed'
        };

        // 1. Update stock quantities
        await updateStockQuantities(billQuantities);

        // 2. Add to sent orders
        const sentOrdersRef = db.ref('sentOrders');
        const newSentOrderRef = sentOrdersRef.push();
        await newSentOrderRef.set(sentOrder);

        // 3. Update or remove billing order based on remaining items
        if (remainingOrderItems.length > 0) {
            // Create updated order with remaining quantities
            const updatedOrder = {
                ...originalOrder,
                items: remainingOrderItems
            };
            await db.ref('billingOrders').child(orderId).set(updatedOrder);
        } else {
            // Remove order if fully billed
            await db.ref('billingOrders').child(orderId).remove();
        }

        // 4. Refresh displays
        await Promise.all([
            loadStockItemsFromFirebase(),
            loadBillingOrders(),
            loadSentOrders()
        ]);

        // Show success message
        const successMessage = `Order ${sentOrder.orderNumber} ${remainingOrderItems.length > 0 ? 'partially' : 'fully'} billed successfully!`;
        alert(successMessage);

    } catch (error) {
        console.error("Error in billOrder:", error);
        alert(`Error processing order: ${error.message}`);
    }
}

function normalizeOrderData(order, orderId) {
    if (!order) return null;
    
    // Ensure billedItems is properly formatted
    let billedItems = [];
    if (order.billedItems && Array.isArray(order.billedItems)) {
        billedItems = order.billedItems.map(item => ({
            name: item.name || '',
            color: item.color || '',
            size: item.size || '',
            quantity: parseInt(item.quantity) || 0
        })).filter(item => item.quantity > 0);
    }
    
    return {
        id: orderId,
        orderNumber: order.orderNumber || 'N/A',
        partyName: order.partyName || 'N/A',
        date: order.date || null,
        billingDate: order.billingDate || null,
        billedItems: billedItems,
        status: order.status || 'completed',
        deliveryStatus: order.deliveryStatus || 'Delivered' // Add delivery status with default value
    };
}

// Helper function to update delivery status in Firebase
function updateDeliveryStatus(orderId, newStatus) {
    return firebase.database().ref(`sentOrders/${orderId}`).update({
        deliveryStatus: newStatus
    }).catch(error => {
        console.error('Error updating delivery status:', error);
        throw error;
    });
}

function mergeOrders(orders) {
    const orderMap = new Map();
    
    orders.forEach(order => {
        if (!order) return;
        
        // Create key using orderNumber, partyName, and billingDate
        const billingDate = order.billingDate ? new Date(order.billingDate).toDateString() : '';
        const key = `${order.orderNumber}_${order.partyName}_${billingDate}`;
        
        if (!orderMap.has(key)) {
            orderMap.set(key, { ...order });
        } else {
            const existingOrder = orderMap.get(key);
            
            // Merge billedItems arrays
            const combinedItems = [...existingOrder.billedItems];
            
            order.billedItems.forEach(newItem => {
                const existingItemIndex = combinedItems.findIndex(item => 
                    item.name === newItem.name && 
                    item.color === newItem.color && 
                    item.size === newItem.size
                );
                
                if (existingItemIndex >= 0) {
                    combinedItems[existingItemIndex].quantity += newItem.quantity;
                } else {
                    combinedItems.push({ ...newItem });
                }
            });
            
            existingOrder.billedItems = combinedItems;
        }
    });
    
    return Array.from(orderMap.values());
}

async function updateStockQuantities(billedItems) {
    const db = firebase.database();
    const stockRef = db.ref('stock');
    
    try {
        const snapshot = await stockRef.once('value');
        let currentStock = snapshot.val() || [];
        
        if (!Array.isArray(currentStock)) {
            throw new Error("Invalid stock data format");
        }

        // Create a map for faster lookups
        const stockMap = new Map(
            currentStock.map(item => [
                `${item['item name']}_${item.color}_${item.size}`,
                item
            ])
        );

        // Update quantities
        Object.entries(billedItems).forEach(([itemName, colors]) => {
            Object.entries(colors).forEach(([color, sizes]) => {
                Object.entries(sizes).forEach(([size, billedQty]) => {
                    const key = `${itemName}_${color}_${size}`;
                    const stockItem = stockMap.get(key);
                    
                    if (stockItem) {
                        const currentQty = parseFloat(stockItem.quantity);
                        const newQty = Math.max(0, currentQty - billedQty);
                        stockItem.quantity = newQty.toFixed(3);
                    }
                });
            });
        });

        // Filter out items with zero quantity
        const updatedStock = Array.from(stockMap.values())
            .filter(item => parseFloat(item.quantity) > 0);

        // Update Firebase and IndexedDB
        await stockRef.set(updatedStock);
        await syncStockWithFirebase();

        console.log("Stock updated successfully");

    } catch (error) {
        console.error("Error in updateStockQuantities:", error);
        throw new Error(`Failed to update stock: ${error.message}`);
    }
}

// Helper function to load completed orders (add this if it doesn't exist)
function loadCompletedOrders() {
    return new Promise((resolve, reject) => {
        firebase.database().ref('completedOrders').once('value')
            .then(snapshot => {
                // Update UI for completed orders if needed
                resolve();
            })
            .catch(reject);
    });
}

// Enhanced error handling for stock sync
async function syncStockWithFirebase() {
    try {
        const db = firebase.database();
        const snapshot = await db.ref('stock').once('value');
        const stockData = snapshot.val();

        if (!stockData) {
            console.log("No stock data in Firebase");
            return;
        }

        // Clear and update IndexedDB
        await performDatabaseOperation(STOCK_STORE_NAME, 'clear', null, "readwrite");
        
        const transaction = stockIndexedDB.transaction([STOCK_STORE_NAME], "readwrite");
        const store = transaction.objectStore(STOCK_STORE_NAME);

        await Promise.all(stockData.map(item => {
            if (parseFloat(item.quantity) > 0) {
                const uniqueId = `${item['item name']}_${item.color}_${item.size}`
                    .replace(/\s+/g, '_')
                    .toLowerCase();
                const itemWithId = { ...item, id: uniqueId };
                return new Promise((resolve, reject) => {
                    const request = store.put(itemWithId);
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
            }
        }));

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

        console.log("Stock sync completed successfully");
        
    } catch (error) {
        console.error("Error during stock sync:", error);
        throw error;
    }
}
