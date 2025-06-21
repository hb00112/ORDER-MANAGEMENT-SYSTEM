// Initialize expired orders array
let expiredOrders = [];
const EXPIRY_DAYS_PENDING = 40;  // Move to expired after 40 days
const EXPIRY_DAYS_DELETE = 50;   // Completely delete after 50 days
const REVERT_EXTENSION_DAYS = 10; // 10 day extension when reverting

document.addEventListener('DOMContentLoaded', function() {
    initializeExpiredOrdersSection();
    checkForExpiredOrders();
    setInterval(checkForExpiredOrders, 24 * 60 * 60 * 1000); // Check daily
});

function initializeExpiredOrdersSection() {
    const expiredSection = document.getElementById('expiredOrders');
    
    // Create premium UI structure
    expiredSection.innerHTML = `
        <div class="section-header">
            <h2><i class="fas fa-hourglass-end"></i> Expired Orders</h2>
            <div class="header-actions">
                <button id="refreshExpiredBtn" class="btn btn-refresh">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <div class="search-box">
                    <input type="text" id="expiredSearch" placeholder="Search expired orders...">
                    <i class="fas fa-search"></i>
                </div>
            </div>
        </div>
        
        <div class="expired-stats">
            <div class="stat-card">
                <div class="stat-value" id="totalExpiredCount">0</div>
                <div class="stat-label">Total Expired</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-value" id="expiringSoonCount">0</div>
                <div class="stat-label">Expiring Soon</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value" id="toBeDeletedCount">0</div>
                <div class="stat-label">To Be Deleted</div>
            </div>
        </div>
        
        <div class="expired-orders-container">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading expired orders...</p>
            </div>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('refreshExpiredBtn').addEventListener('click', loadExpiredOrders);
    document.getElementById('expiredSearch').addEventListener('input', filterExpiredOrders);
    
    // Add CSS styles
    addExpiredOrdersStyles();
}

function addExpiredOrdersStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Expired Orders Section Styles */
        #expiredOrders {
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            padding: 25px;
            margin-bottom: 30px;
        }
        
        #expiredOrders .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        #expiredOrders .section-header h2 {
            margin: 0;
            font-size: 22px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        #expiredOrders .section-header h2 i {
            color: #e74c3c;
        }
        
        #expiredOrders .header-actions {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        #expiredOrders .btn-refresh {
            background: #f8f9fa;
            border: 1px solid #ddd;
            color: #555;
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        #expiredOrders .btn-refresh:hover {
            background: #e9ecef;
        }
        
        #expiredOrders .search-box {
            position: relative;
            display: flex;
            align-items: center;
        }
        
        #expiredOrders .search-box input {
            padding: 8px 15px 8px 35px;
            border: 1px solid #ddd;
            border-radius: 6px;
            width: 250px;
            transition: all 0.3s ease;
        }
        
        #expiredOrders .search-box input:focus {
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            outline: none;
        }
        
        #expiredOrders .search-box i {
            position: absolute;
            left: 12px;
            color: #95a5a6;
        }
        
        /* Stats Cards */
        .expired-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: #ffffff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            text-align: center;
            border-top: 4px solid #3498db;
        }
        
        .stat-card.warning {
            border-top-color: #f39c12;
        }
        
        .stat-card.danger {
            border-top-color: #e74c3c;
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .stat-card.warning .stat-value {
            color: #f39c12;
        }
        
        .stat-card.danger .stat-value {
            color: #e74c3c;
        }
        
        .stat-label {
            font-size: 14px;
            color: #7f8c8d;
        }
        
        /* Orders Container */
        .expired-orders-container {
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .loading-spinner {
            padding: 30px;
            text-align: center;
            color: #7f8c8d;
        }
        
        .loading-spinner .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top: 4px solid #3498db;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Expired Order Cards */
        .expired-order-card {
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .expired-order-card:hover {
            background: rgba(0, 0, 0, 0.01);
        }
        
        .expired-order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .expired-order-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .expired-order-title .order-number {
            color: #3498db;
        }
        
        .expired-order-title .party-name {
            color: #e74c3c;
        }
        
        .expired-order-meta {
            display: flex;
            gap: 15px;
            font-size: 13px;
            color: #7f8c8d;
        }
        
        .expired-order-meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .expired-order-status {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #f8f9fa;
            color: #6c757d;
        }
        
        .expired-order-status.warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .expired-order-status.danger {
            background: #f8d7da;
            color: #721c24;
        }
        
        .expired-order-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 15px;
        }
        
        .expired-order-detail-group h4 {
            font-size: 14px;
            margin: 0 0 10px;
            color: #7f8c8d;
        }
        
        .expired-order-detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .expired-order-detail-label {
            color: #7f8c8d;
        }
        
        .expired-order-detail-value {
            font-weight: 500;
            color: #2c3e50;
        }
        
        .expired-order-items {
            margin-top: 15px;
        }
        
        .expired-order-items h4 {
            font-size: 14px;
            margin: 0 0 10px;
            color: #7f8c8d;
        }
        
        .expired-items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        
        .expired-items-table th {
            text-align: left;
            padding: 8px 12px;
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            color: #6c757d;
        }
        
        .expired-items-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .expired-items-table tr:last-child td {
            border-bottom: none;
        }
        
        .expired-order-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .btn-revert {
            background: #3498db;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-revert:hover {
            background: #2980b9;
        }
        
        .btn-delete {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-delete:hover {
            background: #c0392b;
        }
        
        /* Empty State */
        .empty-state {
            padding: 40px 20px;
            text-align: center;
            color: #95a5a6;
        }
        
        .empty-state i {
            font-size: 50px;
            margin-bottom: 15px;
            color: #bdc3c7;
        }
        
        .empty-state h3 {
            margin: 0 0 10px;
            color: #7f8c8d;
        }
        
        .empty-state p {
            margin: 0;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .expired-stats {
                grid-template-columns: 1fr;
            }
            
            .expired-order-details {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}

function checkForExpiredOrders() {
    const now = new Date();
    const fortyDaysAgo = new Date(now.getTime() - (EXPIRY_DAYS_PENDING * 24 * 60 * 60 * 1000));
    const fiftyDaysAgo = new Date(now.getTime() - (EXPIRY_DAYS_DELETE * 24 * 60 * 60 * 1000));
    
    console.log(`Checking for expired orders. 40 days ago: ${fortyDaysAgo}, 50 days ago: ${fiftyDaysAgo}`);

    // First check for orders to delete completely (50+ days old)
    return firebase.database().ref('orders').orderByChild('dateTime').endAt(fiftyDaysAgo.toISOString()).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                console.log(`Found ${snapshot.numChildren()} orders older than 50 days to delete`);
                const deletePromises = [];
                snapshot.forEach(childSnapshot => {
                    console.log(`Deleting order ${childSnapshot.key} (50+ days old)`);
                    deletePromises.push(
                        firebase.database().ref('orders').child(childSnapshot.key).remove()
                    );
                });
                return Promise.all(deletePromises);
            }
            return Promise.resolve();
        })
        .then(() => {
            console.log('Checking for orders to move to expired (40-49 days old)');
            // Then check for orders to move to expired (40-49 days old)
            return firebase.database().ref('orders').orderByChild('dateTime')
                .startAt(fiftyDaysAgo.toISOString())
                .endAt(fortyDaysAgo.toISOString())
                .once('value');
        })
        .then(snapshot => {
            if (snapshot.exists()) {
                console.log(`Found ${snapshot.numChildren()} orders between 40-49 days old to move to expired`);
                const movePromises = [];
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    
                    // Skip recently reverted orders
                    if (order.revertedAt) {
                        const revertedDate = new Date(order.revertedAt);
                        const daysSinceReverted = (now - revertedDate) / (1000 * 60 * 60 * 24);
                        if (daysSinceReverted < REVERT_EXTENSION_DAYS) {
                            console.log(`Skipping recently reverted order ${childSnapshot.key}`);
                            return;
                        }
                    }
                    
                    const expiryDate = new Date(new Date(order.dateTime).getTime() + (EXPIRY_DAYS_DELETE * 24 * 60 * 60 * 1000));
                    
                    console.log(`Moving order ${childSnapshot.key} to expiredOrders`);
                    
                    movePromises.push(
                        firebase.database().ref('expiredOrders').child(childSnapshot.key).set({
                            ...order,
                            originalExpiryDate: new Date(expiryDate).toISOString(),
                            expiryDate: new Date(expiryDate).toISOString(),
                            status: 'Expired',
                            expiredFrom: 'Pending'
                        }).then(() => {
                            return firebase.database().ref('orders').child(childSnapshot.key).remove();
                        })
                    );
                });
                return Promise.all(movePromises);
            }
            return Promise.resolve();
        })
        .then(() => {
            console.log('Checking for expired orders that need to be deleted (50+ days from expiry)');
            return firebase.database().ref('expiredOrders').once('value');
        })
        .then(snapshot => {
            if (snapshot.exists()) {
                console.log(`Checking ${snapshot.numChildren()} expired orders for final deletion`);
                const deletePromises = [];
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    const expiryDate = new Date(order.expiryDate);
                    if (expiryDate <= now) {
                        console.log(`Deleting expired order ${childSnapshot.key} (past final expiry)`);
                        deletePromises.push(
                            firebase.database().ref('expiredOrders').child(childSnapshot.key).remove()
                        );
                    }
                });
                return Promise.all(deletePromises);
            }
            return Promise.resolve();
        })
        .then(() => {
            console.log('Finished processing expired orders, loading expired orders for display');
            return loadExpiredOrders();
        })
        .catch(error => {
            console.error("Error processing expired orders: ", error);
            throw error;
        });
}

function loadExpiredOrders() {
    const container = document.querySelector('.expired-orders-container');
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading expired orders...</p></div>';
    
    firebase.database().ref('expiredOrders').once('value')
        .then(snapshot => {
            expiredOrders = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    order.id = childSnapshot.key;
                    expiredOrders.push(order);
                });
                displayExpiredOrders();
            } else {
                showEmptyState();
            }
        })
        .catch(error => {
            console.error("Error loading expired orders: ", error);
            container.innerHTML = '<div class="error-state">Error loading expired orders. Please try again.</div>';
        });
}

function displayExpiredOrders() {
    const container = document.querySelector('.expired-orders-container');
    const now = new Date();
    
    if (expiredOrders.length === 0) {
        showEmptyState();
        return;
    }
    
    // Sort by expiry date (closest to expiry first)
    expiredOrders.sort((a, b) => {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
    });
    
    // Calculate stats
    let totalExpired = expiredOrders.length;
    let expiringSoon = 0;
    let toBeDeleted = 0;
    
    expiredOrders.forEach(order => {
        const daysLeft = Math.ceil((new Date(order.expiryDate) - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 5) {
            toBeDeleted++;
        } else if (daysLeft <= 10) {
            expiringSoon++;
        }
    });
    
    // Update stats cards
    document.getElementById('totalExpiredCount').textContent = totalExpired;
    document.getElementById('expiringSoonCount').textContent = expiringSoon;
    document.getElementById('toBeDeletedCount').textContent = toBeDeleted;
    
    // Generate order cards
    container.innerHTML = '';
    expiredOrders.forEach(order => {
        const orderDate = new Date(order.dateTime);
        const expiryDate = new Date(order.expiryDate);
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        const statusClass = daysLeft <= 5 ? 'danger' : (daysLeft <= 10 ? 'warning' : '');
        const statusText = daysLeft <= 5 ? 'Final Expiry' : (daysLeft <= 10 ? 'Expiring Soon' : 'Expired');
        
        // Generate items table rows
        let itemsRows = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                if (item.colors) {
                    Object.keys(item.colors).forEach(color => {
                        const sizes = item.colors[color];
                        Object.keys(sizes).forEach(size => {
                            itemsRows += `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${color}</td>
                                    <td>${size}</td>
                                    <td>${sizes[size]}</td>
                                </tr>
                            `;
                        });
                    });
                } else if (item.quantities) {
                    Object.keys(item.quantities).forEach(size => {
                        itemsRows += `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.color || 'N/A'}</td>
                                <td>${size}</td>
                                <td>${item.quantities[size]}</td>
                            </tr>
                        `;
                    });
                }
            });
        }
        
        const orderCard = document.createElement('div');
        orderCard.className = 'expired-order-card';
        orderCard.innerHTML = `
            <div class="expired-order-header">
                <h3 class="expired-order-title">
                    <span class="order-number">Order #${order.orderNumber || 'N/A'}</span>
                    <span class="separator">|</span>
                    <span class="party-name">${order.partyName || 'N/A'}</span>
                </h3>
                <div class="expired-order-meta">
                    <div class="expired-order-meta-item">
                        <i class="far fa-calendar-alt"></i>
                        ${orderDate.toLocaleDateString()}
                    </div>
                    <span class="expired-order-status ${statusClass}">${statusText}</span>
                </div>
            </div>
            
            <div class="expired-order-details">
                <div class="expired-order-detail-group">
                    <h4>Order Details</h4>
                    <div class="expired-order-detail-item">
                        <span class="expired-order-detail-label">From:</span>
                        <span class="expired-order-detail-value">${order.expiredFrom || 'Unknown'}</span>
                    </div>
                    <div class="expired-order-detail-item">
                        <span class="expired-order-detail-label">Total Items:</span>
                        <span class="expired-order-detail-value">${order.items ? order.items.length : 0}</span>
                    </div>
                    <div class="expired-order-detail-item">
                        <span class="expired-order-detail-label">Total Quantity:</span>
                        <span class="expired-order-detail-value">${order.totalQuantity || 0}</span>
                    </div>
                </div>
                
                <div class="expired-order-detail-group">
                    <h4>Expiry Details</h4>
                    <div class="expired-order-detail-item">
                        <span class="expired-order-detail-label">Expires In:</span>
                        <span class="expired-order-detail-value">${daysLeft} days</span>
                    </div>
                    <div class="expired-order-detail-item">
                        <span class="expired-order-detail-label">Expiry Date:</span>
                        <span class="expired-order-detail-value">${expiryDate.toLocaleDateString()}</span>
                    </div>
                    <div class="expired-order-detail-item">
                        <span class="expired-order-detail-label">Status:</span>
                        <span class="expired-order-detail-value">${order.status || 'Expired'}</span>
                    </div>
                </div>
            </div>
            
            <div class="expired-order-items">
                <h4>Items</h4>
                <table class="expired-items-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Color</th>
                            <th>Size</th>
                            <th>Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows || '<tr><td colspan="4">No items found</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <div class="expired-order-actions">
                <button class="btn-revert" data-order-id="${order.id}">
                    <i class="fas fa-undo"></i> Revert to Pending
                </button>
                <button class="btn-delete" data-order-id="${order.id}">
                    <i class="fas fa-trash-alt"></i> Delete Permanently
                </button>
            </div>
        `;
        
        container.appendChild(orderCard);
    });
    
    // Add event listeners
    document.querySelectorAll('.btn-revert').forEach(btn => {
        btn.addEventListener('click', function() {
            revertExpiredOrder(this.getAttribute('data-order-id'));
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteExpiredOrder(this.getAttribute('data-order-id'));
        });
    });
}

function showEmptyState() {
    const container = document.querySelector('.expired-orders-container');
    container.innerHTML = `
        <div class="empty-state">
            <i class="far fa-hourglass"></i>
            <h3>No Expired Orders</h3>
            <p>There are currently no expired orders to display.</p>
        </div>
    `;
    
    // Reset stats
    document.getElementById('totalExpiredCount').textContent = '0';
    document.getElementById('expiringSoonCount').textContent = '0';
    document.getElementById('toBeDeletedCount').textContent = '0';
}

function filterExpiredOrders() {
    const searchTerm = document.getElementById('expiredSearch').value.toLowerCase();
    if (!searchTerm) {
        displayExpiredOrders();
        return;
    }
    
    const filteredOrders = expiredOrders.filter(order => {
        return (
            (order.orderNumber && order.orderNumber.toLowerCase().includes(searchTerm)) ||
            (order.partyName && order.partyName.toLowerCase().includes(searchTerm)) ||
            (order.items && order.items.some(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                (item.color && item.color.toLowerCase().includes(searchTerm))
        )));
    });
    
    if (filteredOrders.length === 0) {
        showEmptyState();
    } else {
        expiredOrders = filteredOrders;
        displayExpiredOrders();
    }
}

function revertExpiredOrder(orderId) {
    console.log(`Reverting order ${orderId} from expiredOrders to orders branch`);

    const expiredOrderRef = firebase.database().ref(`expiredOrders/${orderId}`);
    
    expiredOrderRef.once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                throw new Error(`Order ${orderId} not found in expiredOrders`);
            }

            const order = snapshot.val();
            console.log('Retrieved order from expiredOrders:', order);

            const now = new Date();
            const newExpiryDate = new Date(now.getTime() + (REVERT_EXTENSION_DAYS * 24 * 60 * 60 * 1000));
            
            const orderDataForOrdersBranch = {
                ...order,
                status: 'Pending',
                expiryDate: newExpiryDate.toISOString(),
                revertedAt: now.toISOString(), // Add this timestamp
                originalExpiryDate: null,
                expiredFrom: null,
                dateTime: order.dateTime || new Date().toISOString()
            };

            return firebase.database().ref(`orders/${orderId}`).once('value')
                .then(ordersSnapshot => {
                    if (ordersSnapshot.exists()) {
                        throw new Error(`Order ${orderId} already exists in orders branch`);
                    }

                    const updates = {};
                    updates[`/orders/${orderId}`] = orderDataForOrdersBranch;
                    updates[`/expiredOrders/${orderId}`] = null;

                    return firebase.database().ref().update(updates);
                });
        })
        .then(() => {
            console.log(`Successfully moved order ${orderId} to orders branch`);
            showNotification('Order successfully reverted to pending');
            expiredOrders = expiredOrders.filter(o => o.id !== orderId);
            loadExpiredOrders();
        })
        .catch(error => {
            console.error('Error reverting order:', error);
            showNotification(`Error: ${error.message}`);
        });
}

function deleteExpiredOrder(orderId) {
    if (confirm('Are you sure you want to permanently delete this expired order? This action cannot be undone.')) {
        firebase.database().ref('expiredOrders').child(orderId).remove()
            .then(() => {
                console.log(`Expired order ${orderId} permanently deleted`);
                showNotification('Expired order permanently deleted');
                loadExpiredOrders();
            })
            .catch(error => {
                console.error("Error deleting expired order: ", error);
                showNotification('Error deleting order. Please try again.');
            });
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
    
    // Add notification styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #2ecc71;
                color: white;
                padding: 15px 25px;
                border-radius: 5px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 1000;
            }
            
            .notification.show {
                transform: translateY(0);
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
}
