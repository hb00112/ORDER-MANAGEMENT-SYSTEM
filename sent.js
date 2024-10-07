function loadSentOrders() {
    const sentOrdersContainer = document.getElementById('sentOrdersContainer');
    sentOrdersContainer.innerHTML = '';

    firebase.database().ref('sentOrders').orderByChild('billingDate').limitToLast(10).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const orders = [];
                snapshot.forEach(childSnapshot => {
                    orders.push({ key: childSnapshot.key, ...childSnapshot.val() });
                });
                
                // Sort orders by billing date in descending order
                orders.sort((a, b) => {
                    const dateA = a.billingDate ? new Date(a.billingDate) : new Date(0);
                    const dateB = b.billingDate ? new Date(b.billingDate) : new Date(0);
                    return dateB - dateA;
                });
                
                // Merge orders with same order number and bill date
                const mergedOrders = mergeOrders(orders);
                
                mergedOrders.forEach((order, index) => {
                    const orderElement = createSentOrderElement(order, index);
                    sentOrdersContainer.appendChild(orderElement);
                });
            } else {
                sentOrdersContainer.innerHTML = '<p>No sent orders</p>';
            }
        })
        .catch(error => {
            console.error("Error loading sent orders: ", error);
            sentOrdersContainer.innerHTML = '<p>Error loading sent orders</p>';
        });
}

function mergeOrders(orders) {
    const mergedOrdersMap = new Map();

    orders.forEach(order => {
        const key = `${order.orderNumber}_${formatDateOnly(order.billingDate)}`;
        if (!mergedOrdersMap.has(key)) {
            mergedOrdersMap.set(key, { ...order, partyNames: new Set([order.partyName]) });
        } else {
            const existingOrder = mergedOrdersMap.get(key);
            existingOrder.partyNames.add(order.partyName);
            // Merge billedQuantities
            Object.entries(order.billedQuantities || {}).forEach(([item, colors]) => {
                if (!existingOrder.billedQuantities[item]) {
                    existingOrder.billedQuantities[item] = colors;
                } else {
                    Object.entries(colors).forEach(([color, sizes]) => {
                        if (!existingOrder.billedQuantities[item][color]) {
                            existingOrder.billedQuantities[item][color] = sizes;
                        } else {
                            Object.entries(sizes).forEach(([size, quantity]) => {
                                if (!existingOrder.billedQuantities[item][color][size]) {
                                    existingOrder.billedQuantities[item][color][size] = quantity;
                                } else {
                                    existingOrder.billedQuantities[item][color][size] += quantity;
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    return Array.from(mergedOrdersMap.values());
}


function createSentOrderElement(order, index) {
    const orderElement = document.createElement('div');
    orderElement.className = `sent-order ${index % 2 === 0 ? 'light-blue' : 'dark-blue'}`;
    
    const orderInfo = `
        <h5>Order No: ${order.orderNumber || 'N/A'}</h5>
        <p>Order Date: ${formatDate(order.dateTime) || 'N/A'}</p>
        <p>Bill Date: ${formatDate(order.billingDate) || 'N/A'}</p>
        <p>Party Name(s): ${Array.from(order.partyNames).join(', ') || 'N/A'}</p>
    `;
    
    const itemsTable = createItemsTable(order.billedQuantities);
    const totalQuantity = calculateTotalQuantity(order.billedQuantities);
    
    orderElement.innerHTML = orderInfo + itemsTable + `<p><strong>Total Quantity: ${totalQuantity}</strong></p>`;
    
    return orderElement;
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(); // You can customize this format as needed
}

function formatDateOnly(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(); // This will return only the date part
}

// Load sent orders when the page loads
document.addEventListener('DOMContentLoaded', loadSentOrders);

function createSentOrderRow(order) {
    const row = document.createElement('tr');
    
    let itemsText = 'No items';
    
    if (order && order.billedQuantities) {
        try {
            const itemDescriptions = [];
            
            Object.entries(order.billedQuantities).forEach(([itemName, colors]) => {
                if (colors && typeof colors === 'object') {
                    Object.entries(colors).forEach(([color, sizes]) => {
                        if (sizes && typeof sizes === 'object') {
                            Object.entries(sizes).forEach(([size, qty]) => {
                                if (qty > 0) {
                                    itemDescriptions.push(`${itemName} (${color}) ${size}/${qty}`);
                                }
                            });
                        }
                    });
                }
            });
            
            if (itemDescriptions.length > 0) {
                itemsText = itemDescriptions.join('; ');
            }
        } catch (error) {
            console.error("Error processing order items:", error);
            itemsText = 'Error processing items';
        }
    }

    row.innerHTML = `
        <td>${order.orderNumber || 'N/A'}</td>
        <td>${Array.from(order.partyNames).join(', ') || 'N/A'}</td>
        <td>${itemsText}</td>
        <td>
            <button class="btn btn-sm btn-info view-btn" data-order-id="${order.key || ''}">View</button>
        </td>
    `;
    
    return row;
}

// Utility function to safely get nested object properties
function getNestedValue(obj, ...args) {
    return args.reduce((obj, level) => obj && obj[level], obj);
}

document.getElementById('sentOrdersBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
});
