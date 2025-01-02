// Initialize Firebase reference
const unapprovedOrdersRef = firebase.database().ref('unapprovedorders');
const ordersRef = firebase.database().ref('orders');

function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
}

function getCurrentDateTime() {
    return new Date().toISOString();
}

function createColorSizeHTML(colors) {
    let html = '<div class="oa-color-size-grid">';
    for (const [color, sizes] of Object.entries(colors)) {
        for (const [size, quantity] of Object.entries(sizes)) {
            html += `
                <div class="oa-color-size-item">
                    ${color} - ${size}: ${quantity}
                </div>
            `;
        }
    }
    html += '</div>';
    return html;
}

function createOrderCard(orderData, orderId) {
    const orderCard = document.createElement('div');
    orderCard.className = 'oa-order-card';
    orderCard.innerHTML = `
        <div class="oa-order-header">
            <h3 class="oa-party-name">${orderData.partyName}</h3>
        </div>
        <div class="oa-order-details">
            <div class="oa-detail-item">
                <span class="oa-detail-label">Date:</span>
                ${formatDateTime(orderData.dateTime)}
            </div>
            <div class="oa-detail-item">
                <span class="oa-detail-label">Reference Number:</span>
                ${orderData.referenceNumber}
            </div>
            <div class="oa-detail-item">
                <span class="oa-detail-label">Status:</span>
                ${orderData.status}
            </div>
            ${orderData.ardate ? `
                <div class="oa-detail-item">
                    <span class="oa-detail-label">Approval/Rejection Date:</span>
                    ${formatDateTime(orderData.ardate)}
                </div>
            ` : ''}
            ${orderData.approvedby ? `
                <div class="oa-detail-item">
                    <span class="oa-detail-label">Processed by:</span>
                    ${orderData.approvedby}
                </div>
            ` : ''}
        </div>
        
        <table class="oa-items-table">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Colors and Sizes</th>
                </tr>
            </thead>
            <tbody>
                ${orderData.items.map(item => `
                    <tr>
                        <td class="oa-item-name">${item.name}</td>
                        <td>${createColorSizeHTML(item.colors)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="oa-total-quantity">
            Total Quantity: ${orderData.totalQuantity}
        </div>
        
        <div class="oa-action-buttons">
            <button class="oa-btn oa-btn-approve" onclick="approveOrder('${orderId}')">Approve</button>
            <button class="oa-btn oa-btn-reject" onclick="rejectOrder('${orderId}')">Reject</button>
        </div>
    `;
    return orderCard;
}

function getCurrentUsername() {
    return localStorage.getItem('hcUsername') || 'Unknown User';
}

function approveOrder(orderId) {
    const currentUser = getCurrentUsername();
    const currentDateTime = getCurrentDateTime();

    // Get the order data
    unapprovedOrdersRef.child(orderId).once('value')
        .then((snapshot) => {
            const orderData = snapshot.val();
            if (!orderData) return;

            // Update status, date, and approver in unapprovedorders
            unapprovedOrdersRef.child(orderId).update({
                status: 'Approved',
                ardate: currentDateTime,
                approvedby: currentUser
            });

            // Format order data to match the structure in handlePlaceOrder
            const formattedOrder = {
                orderNumber: orderData.orderNumber || orderData.referenceNumber,
                partyName: orderData.partyName,
                dateTime: orderData.dateTime,
                items: orderData.items,
                status: 'Pending',
                totalQuantity: orderData.totalQuantity,
                orderNote: orderData.orderNote || '',
                key: orderId,
                approvedby: currentUser,
                ardate: currentDateTime
            };

            // Save to orders collection
            return saveOrderToFirebase(formattedOrder)
                .then(() => {
                    console.log('Order approved and moved to orders successfully:', orderId);
                    if (typeof loadPendingOrders === 'function') {
                        loadPendingOrders();
                    }
                })
                .catch((error) => {
                    console.error('Error saving approved order:', error);
                    throw error;
                });
        })
        .catch((error) => {
            console.error("Error approving order:", error);
        });
}

function rejectOrder(orderId) {
    const currentUser = getCurrentUsername();
    const currentDateTime = getCurrentDateTime();

    unapprovedOrdersRef.child(orderId).update({
        status: 'Rejected',
        ardate: currentDateTime,
        approvedby: currentUser
    }).then(() => {
        console.log('Order rejected successfully:', orderId);
    }).catch((error) => {
        console.error("Error rejecting order:", error);
    });
}

// Load and display unapproved orders
function loadUnapprovedOrders() {
    const ordersList = document.getElementById('unapprovedOrdersList');
    
    unapprovedOrdersRef.on('value', (snapshot) => {
        ordersList.innerHTML = ''; // Clear existing orders
        
        snapshot.forEach((childSnapshot) => {
            const orderId = childSnapshot.key;
            const orderData = childSnapshot.val();
            
            if (orderData.status === 'Approval Pending') {
                const orderCard = createOrderCard(orderData, orderId);
                ordersList.appendChild(orderCard);
            }
        });
    });
}

// Initialize the orders display
document.addEventListener('DOMContentLoaded', loadUnapprovedOrders);
document.addEventListener('DOMContentLoaded', function() {
    const orderApproveLink = document.querySelector('.slide-menu a[data-section="orderapprove"]');
    const orderApproveSection = document.getElementById('orderapprove');
    
    if (orderApproveSection) {
        orderApproveSection.style.display = 'none';
    }

    if (orderApproveLink) {
        orderApproveLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (orderApproveSection) {
                orderApproveSection.style.display = 'block';
                loadUnapprovedOrders();
            }
        });
    }

    const otherMenuLinks = document.querySelectorAll('.slide-menu a[data-section]:not([data-section="orderapprove"])');
    otherMenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (orderApproveSection) {
                orderApproveSection.style.display = 'none';
            }
        });
    });

    const navbarLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navbarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (orderApproveSection) {
                orderApproveSection.style.display = 'none';
            }
        });
    });
});