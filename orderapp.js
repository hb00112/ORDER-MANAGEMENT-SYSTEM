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

/**
 * Approves an order and updates indicators
 * @param {string} orderId - ID of the order to approve
 */
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
                    
                    // Send approval notification
                    sendApprovalNotification(orderData, currentUser);
                    
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

// Function to send approval notification
function sendApprovalNotification(orderData, approvedBy) {
    const message = `Order ${orderData.referenceNumber} from ${orderData.partyName} has been approved by ${approvedBy}`;
    
    // Telegram notification
    const telegramToken = "7401966895:AAFu7gNrOPhMXJQNJTRk4CkK4TjRr09pxUs";
    const chatId = "-4527298165";
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => console.log("Telegram approval notification sent:", data))
        .catch(error => console.error("Error sending Telegram approval notification:", error));
}

// Function to monitor new unapproved orders and send notifications
function monitorUnapprovedOrders() {
    unapprovedOrdersRef.orderByChild('status').equalTo('Approval Pending').on('child_added', (snapshot) => {
        const orderData = snapshot.val();
        if (orderData) {
            // Send WebPushr notification
            sendNewOrderNotification(orderData);
            
            // Send Telegram notification
            const telegramToken = "7401966895:AAFu7gNrOPhMXJQNJTRk4CkK4TjRr09pxUs";
            const chatId = "-4527298165";
            const message = `New order requires approval:\nParty: ${orderData.partyName}\nItems: ${orderData.totalQuantity}\nRef: ${orderData.referenceNumber}`;
            const url = `https://api.telegram.org/bot${telegramToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
            
            fetch(url)
                .then(response => response.json())
                .then(data => console.log("Telegram new order notification sent:", data))
                .catch(error => console.error("Error sending Telegram new order notification:", error));
        }
    });
}


/**
 * Rejects an order and updates indicators
 * @param {string} orderId - ID of the order to reject
 */
function rejectOrder(orderId) {
    const currentUser = getCurrentUsername();
    const currentDateTime = getCurrentDateTime();

    unapprovedOrdersRef.child(orderId).update({
        status: 'Rejected',
        ardate: currentDateTime,
        approvedby: currentUser
    }).then(() => {
        console.log('Order rejected successfully:', orderId);
        // Update indicators after rejection
        updateUnapprovedOrderIndicators();
    }).catch((error) => {
        console.error("Error rejecting order:", error);
    });
}

function initWebPushr() {
  (function(w,d, s, id) {
    if(typeof(w.webpushr)!=='undefined') return;
    w.webpushr=w.webpushr||function(){(w.webpushr.q=w.webpushr.q||[]).push(arguments)};
    var js, fjs = d.getElementsByTagName(s)[0];
    js = d.createElement(s); js.id = id;
    js.async=1;js.src = "https://cdn.webpushr.com/app.min.js";
    fjs.parentNode.appendChild(js);
  })(window,document, 'script', 'webpushr-jssdk');
  
  webpushr('setup',{
    'key':'BJgL8_NTH55P5mh-yTMhQCDBYDOzxLKRmkIbbk-e8myTHe_Ldm0R1Ch3q7XVAxfq3wckcYszT9BSRT6liGt0Cug'
  });
}

/**
 * Initializes the order approval system
 */
function initOrderApprovalSystem() {
    // Set up event listeners
    document.addEventListener('DOMContentLoaded', function() {
        // Initial check for pending orders
        updateUnapprovedOrderIndicators();
          monitorUnapprovedOrders();
              initWebPushr();

        // Set up periodic checks (every 5 minutes)
        setInterval(updateUnapprovedOrderIndicators, 300000);
        
        // Also check when the menu is opened
        document.getElementById('menuToggle')?.addEventListener('click', function() {
            setTimeout(updateUnapprovedOrderIndicators, 500);
        });
    });
    
    // Make functions available globally
    window.approveOrder = approveOrder;
    window.rejectOrder = rejectOrder;
}

// Start the system
initOrderApprovalSystem();

/**
 * Checks for pending orders and updates UI indicators
 */
function updateUnapprovedOrderIndicators() {
    const unapprovedOrdersRef = firebase.database().ref('unapprovedorders');
    
    unapprovedOrdersRef.once('value').then((snapshot) => {
        let hasPendingOrders = false;
        
        // Check all orders for pending status
        snapshot.forEach((childSnapshot) => {
            const orderData = childSnapshot.val();
            if (orderData.status === 'Approval Pending') {
                hasPendingOrders = true;
                // Exit loop early if we find a pending order
                return true;
            }
        });
        
        updateSidebarIndicator(hasPendingOrders);
        updateMenuToggleIndicator(hasPendingOrders);
    }).catch((error) => {
        console.error("Error checking for pending orders:", error);
    });
}

/**
 * Updates the sidebar menu indicator
 * @param {boolean} showIndicator - Whether to show the indicator
 */
function updateSidebarIndicator(showIndicator) {
    const orderApproveLink = document.querySelector('.slide-menu a[data-section="orderapprove"]');
    
    if (!orderApproveLink) return;
    
    const existingIndicator = orderApproveLink.querySelector('.pending-order-indicator');
    
    if (showIndicator) {
        if (!existingIndicator) {
            const indicator = document.createElement('span');
            indicator.className = 'pending-order-indicator';
            indicator.innerHTML = '&nbsp;•';
            indicator.style.color = 'red';
            indicator.style.fontWeight = 'bold';
            orderApproveLink.appendChild(indicator);
        }
    } else {
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }
}

/**
 * Updates the menu toggle button indicator
 * @param {boolean} showIndicator - Whether to show the indicator
 */
function updateMenuToggleIndicator(showIndicator) {
    const menuToggleBtn = document.getElementById('menuToggle');
    
    if (!menuToggleBtn) return;
    
    const existingIndicator = menuToggleBtn.querySelector('.pending-order-indicator');
    
    if (showIndicator) {
        if (!existingIndicator) {
            const indicator = document.createElement('span');
            indicator.className = 'pending-order-indicator';
            indicator.style.position = 'absolute';
            indicator.style.top = '5px';
            indicator.style.right = '5px';
            indicator.style.width = '8px';
            indicator.style.height = '8px';
            indicator.style.backgroundColor = 'red';
            indicator.style.borderRadius = '50%';
            menuToggleBtn.style.position = 'relative';
            menuToggleBtn.appendChild(indicator);
        }
    } else {
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }
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
