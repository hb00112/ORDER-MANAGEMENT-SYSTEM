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

function billOrder(orderId) {
    const orderContainer = document.querySelector(`[data-order-id="${orderId}"]`).closest('.order-container');
    const billQuantities = {};
    
    // Get all billed quantities
    orderContainer.querySelectorAll('.bill-quantity').forEach(input => {
        const item = input.getAttribute('data-item');
        const color = input.getAttribute('data-color');
        const size = input.getAttribute('data-size');
        const billedQty = parseInt(input.value);
        
        if (billedQty > 0) {
            if (!billQuantities[item]) billQuantities[item] = {};
            if (!billQuantities[item][color]) billQuantities[item][color] = {};
            billQuantities[item][color][size] = billedQty;
        }
    });

    // Get the original order from Firebase
    firebase.database().ref('billingOrders').child(orderId).once('value')
        .then(snapshot => {
            const originalOrder = snapshot.val();
            if (!originalOrder) throw new Error("Order not found");

            // Create the sent order object
            const sentOrder = {
                orderNumber: originalOrder.orderNumber || 'N/A',
                partyName: originalOrder.partyName || 'N/A',
                dateTime: originalOrder.dateTime || new Date().toISOString(),
                billingDate: new Date().toISOString(),
                status: 'sent',
                billedQuantities: billQuantities // Store the billed quantities directly
            };

            // Update the original order with remaining quantities
            const updatedBillingOrder = {...originalOrder};
            let hasRemainingItems = false;

            if (originalOrder.items) {
                updatedBillingOrder.items = originalOrder.items.map(item => {
                    const updatedItem = {...item};
                    if (billQuantities[item.name]) {
                        Object.entries(billQuantities[item.name]).forEach(([color, sizes]) => {
                            Object.entries(sizes).forEach(([size, billedQty]) => {
                                const originalQty = getNestedValue(item, 'colors', color, size) || 0;
                                const remainingQty = originalQty - billedQty;
                                
                                if (remainingQty > 0) {
                                    hasRemainingItems = true;
                                    if (!updatedItem.colors) updatedItem.colors = {};
                                    if (!updatedItem.colors[color]) updatedItem.colors[color] = {};
                                    updatedItem.colors[color][size] = remainingQty;
                                } else {
                                    if (updatedItem.colors && updatedItem.colors[color]) {
                                        delete updatedItem.colors[color][size];
                                        if (Object.keys(updatedItem.colors[color]).length === 0) {
                                            delete updatedItem.colors[color];
                                        }
                                    }
                                }
                            });
                        });
                    }
                    return updatedItem;
                }).filter(item => 
                    item.colors && Object.keys(item.colors).length > 0
                );
            }

            // Prepare database updates
            const updates = {};
            
            // Add to sent orders
            const sentOrderKey = `${orderId}_${Date.now()}`;
            updates[`/sentOrders/${sentOrderKey}`] = sentOrder;
            
            // Update or remove billing order
            if (hasRemainingItems) {
                updatedBillingOrder.lastModified = new Date().toISOString();
                updates[`/billingOrders/${orderId}`] = updatedBillingOrder;
            } else {
                updates[`/billingOrders/${orderId}`] = null;
            }

            // Perform the updates
            return firebase.database().ref().update(updates);
        })
        .then(() => {
            console.log("Order processed successfully");
            loadBillingOrders();
            loadSentOrders();
        })
        .catch(error => {
            console.error("Error processing order: ", error);
        });
}
