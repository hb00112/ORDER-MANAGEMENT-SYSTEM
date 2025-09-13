// expiry.js - Expired Orders Management
document.addEventListener('DOMContentLoaded', function() {
    initializeExpirySection();
});

function initializeExpirySection() {
    // Set up refresh button
    document.getElementById('refreshExpiredBtn').addEventListener('click', loadExpiredOrders);
    
    // Load expired orders on page load
    loadExpiredOrders();
}

function loadExpiredOrders() {
    const container = document.querySelector('.expired-orders-container');
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading expired orders...</p>
        </div>
    `;
    
    // Reference to expiryOrders branch
    const expiryRef = firebase.database().ref('expiryOrders');
    
    expiryRef.once('value').then(snapshot => {
        container.innerHTML = ''; // Clear loading spinner
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="no-orders">No expired orders found.</p>';
            return;
        }
        
        const orders = [];
        snapshot.forEach(childSnapshot => {
            const order = childSnapshot.val();
            order.id = childSnapshot.key;
            orders.push(order);
        });
        
        // Display orders
        displayExpiredOrders(orders, container);
        
        // Check for orders that need to be permanently deleted (40 days old)
        checkForPermanentDeletion(orders);
    }).catch(error => {
        console.error("Error loading expired orders:", error);
        container.innerHTML = '<p class="error-msg">Error loading expired orders. Please try again.</p>';
    });
}

function displayExpiredOrders(orders, container) {
    // Sort orders by date (newest first)
    orders.sort((a, b) => {
        const dateA = new Date(a.dateTime || 0);
        const dateB = new Date(b.dateTime || 0);
        return dateB - dateA;
    });
    
    orders.forEach(order => {
        const orderDate = new Date(order.dateTime).toLocaleDateString();
        const daysSinceOrder = Math.floor((new Date() - new Date(order.dateTime)) / (1000 * 60 * 60 * 24));
        const daysUntilDeletion = 40 - daysSinceOrder;
        
        const orderElement = document.createElement('div');
        orderElement.className = 'expired-order-card';
        orderElement.innerHTML = `
            <div class="expired-order-header">
                <div class="order-title">
                    <h3>Order #${order.orderNumber || 'N/A'}</h3>
                    <span class="delete-countdown">Auto delete in ${daysUntilDeletion} days</span>
                </div>
                <div class="order-meta">
                    <div><strong>Party:</strong> ${order.partyName || 'N/A'}</div>
                    <div><strong>Date:</strong> ${orderDate}</div>
                </div>
            </div>
            <div class="order-items">
                <h4>Items:</h4>
                <div class="items-container">
                    ${generateExpiredOrderItems(order.items)}
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-delete-permanent" data-order-id="${order.id}">
                    <i class="fas fa-trash"></i> Delete Permanently
                </button>
            </div>
        `;
        
        container.appendChild(orderElement);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete-permanent').forEach(btn => {
        btn.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            deleteOrderPermanently(orderId);
        });
    });
}

function generateExpiredOrderItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<p class="no-items">No items in this order.</p>';
    }
    
    return items.map(item => {
        let itemsHtml = '';
        
        if (item.colors) {
            // Handle the colors structure with multiple colors
            itemsHtml = Object.entries(item.colors).map(([colorName, sizes]) => {
                const quantitiesHtml = Object.entries(sizes)
                    .map(([size, qty]) => `<span class="size-qty">${size}/${qty}</span>`)
                    .join('');
                
                return `
                    <div class="expired-item">
                        <div class="item-name">${item.name}</div>
                        <div class="item-color">Color: ${colorName}</div>
                        <div class="item-quantities">${quantitiesHtml}</div>
                    </div>
                `;
            }).join('');
        } else if (item.quantities) {
            // Handle the quantities structure (single color)
            const color = item.color || 'N/A';
            const quantitiesHtml = Object.entries(item.quantities)
                .map(([size, qty]) => `<span class="size-qty">${size}/${qty}</span>`)
                .join('');
            
            itemsHtml = `
                <div class="expired-item">
                    <div class="item-name">${item.name}</div>
                    <div class="item-color">Color: ${color}</div>
                    <div class="item-quantities">${quantitiesHtml}</div>
                </div>
            `;
        } else {
            // Fallback for items with no color/quantity data
            itemsHtml = `
                <div class="expired-item">
                    <div class="item-name">${item.name}</div>
                    <div class="item-color">Color: N/A</div>
                    <div class="item-quantities">No quantities specified</div>
                </div>
            `;
        }
        
        return itemsHtml;
    }).join('');
}

function checkForPermanentDeletion(orders) {
    const dueExpiryRef = firebase.database().ref('dueExpiryOrders');
    const updates = {};
    let movedCount = 0;
    
    orders.forEach(order => {
        if (order && order.dateTime) {
            const orderDate = new Date(order.dateTime);
            const daysSinceOrder = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceOrder >= 40) {
                // Move to dueExpiryOrders branch
                updates[`dueExpiryOrders/${order.id}`] = order;
                // Remove from expiryOrders
                updates[`expiryOrders/${order.id}`] = null;
                movedCount++;
            }
        }
    });
    
    // Execute all updates at once if there are orders to move
    if (movedCount > 0) {
        firebase.database().ref().update(updates)
            .then(() => {
                console.log(`Moved ${movedCount} orders to dueExpiryOrders for permanent deletion`);
                // Reload the expired orders list
                loadExpiredOrders();
            })
            .catch(error => {
                console.error("Error moving orders for permanent deletion:", error);
            });
    }
}

function deleteOrderPermanently(orderId) {
    if (confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
        // Reference to the order in expiryOrders
        const orderRef = firebase.database().ref('expiryOrders').child(orderId);
        
        orderRef.remove()
            .then(() => {
                console.log(`Order ${orderId} permanently deleted`);
                // Show success message
                showNotification('Order permanently deleted');
                // Reload the expired orders list
                loadExpiredOrders();
            })
            .catch(error => {
                console.error("Error permanently deleting order:", error);
                showNotification('Error deleting order. Please try again.', 'error');
            });
    }
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// CSS for the expiry orders section
const expiryStyles = `
.expired-orders-container {
    padding: 15px;
    max-height: 70vh;
    overflow-y: auto;
}

.loading-spinner {
    text-align: center;
    padding: 40px 0;
}

.spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #b60667;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.no-orders, .error-msg {
    text-align: center;
    padding: 30px;
    color: #666;
    font-style: italic;
}

.expired-order-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 20px;
    overflow: hidden;
}

.expired-order-header {
    padding: 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
}

.order-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.order-title h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
}

.delete-countdown {
    background: #ffc107;
    color: #856404;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.order-meta {
    display: flex;
    gap: 15px;
    font-size: 14px;
    color: #666;
}

.order-meta div {
    display: flex;
    align-items: center;
}

.order-items {
    padding: 15px;
}

.order-items h4 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 16px;
}

.items-container {
    display: grid;
    gap: 10px;
}

.expired-item {
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
    border-left: 3px solid #b60667;
}

.item-name {
    font-weight: bold;
    margin-bottom: 5px;
}

.item-color {
    color: #666;
    font-size: 14px;
    margin-bottom: 5px;
}

.item-quantities {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.size-qty {
    background: white;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 12px;
    border: 1px solid #ddd;
}

.no-items {
    color: #999;
    font-style: italic;
    text-align: center;
    padding: 10px;
}

.order-actions {
    padding: 15px;
    border-top: 1px solid #e9ecef;
    text-align: right;
}

.btn-delete-permanent {
    background: #dc3545;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.btn-delete-permanent:hover {
    background: #c82333;
}

.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.notification.success {
    background: #28a745;
}

.notification.error {
    background: #dc3545;
}
`;

// Add styles to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = expiryStyles;
document.head.appendChild(styleSheet);