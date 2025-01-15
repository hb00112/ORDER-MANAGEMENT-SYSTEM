
//SENT.JS
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
                                const normalizedOrder = normalizeOrderData(order, childSnapshot.key);
                                if (normalizedOrder) {
                                    orders.push(normalizedOrder);
                                }
                            }
                        } catch (orderError) {
                            console.error("Error processing individual order:", orderError, childSnapshot.key);
                        }
                    });
                    
                    orders.sort((a, b) => {
                        const dateA = a.billingDate ? new Date(a.billingDate) : new Date(0);
                        const dateB = b.billingDate ? new Date(b.billingDate) : new Date(0);
                        return dateB - dateA;
                    });
                    
                    const mergedOrders = mergeOrders(orders);
                    
                    if (mergedOrders.length === 0) {
                        sentOrdersContainer.innerHTML = '<p>No orders found</p>';
                        return;
                    }

                    sentOrdersContainer.innerHTML = '';
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


function createSentOrderElement(order, index) {
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'order-wrapper position-relative mb-4';
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container position-absolute w-full';
    buttonsContainer.style.cssText = `
        display: none;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px;
        z-index: 100;
        bottom: 100%;
        left: 0;
        right: 0;
        background: transparent;
    `;
    
    const imgButton = document.createElement('button');
    imgButton.className = 'btn btn-primary btn-sm';
    imgButton.innerHTML = 'Download as Image';
    imgButton.onclick = () => downloadAsImage(orderDiv, `${order.partyName}_${formatDateForFile(order.billingDate)}`);

    const pdfButton = document.createElement('button');
    pdfButton.className = 'btn btn-secondary btn-sm';
    pdfButton.innerHTML = 'Download as PDF';
    pdfButton.onclick = () => downloadAsPDF(orderDiv, `${order.partyName}_${formatDateForFile(order.billingDate)}`);

    buttonsContainer.appendChild(imgButton);
    buttonsContainer.appendChild(pdfButton);

    const orderDiv = document.createElement('div');
    orderDiv.style.backgroundColor = index % 2 === 0 ? '#ffebee' : '#e3f2fd';
    orderDiv.className = 'order-container p-3 rounded';
    orderDiv.setAttribute('data-order-id', order.id);
    orderDiv.setAttribute('data-delivery-status', order.deliveryStatus);

    const totalQuantity = order.billedItems.reduce((sum, item) => sum + item.quantity, 0);
    const statusClass = order.deliveryStatus === 'Delivered' ? 'text-success' : 'text-danger';
    
    orderDiv.innerHTML = `
        <div class="order-header">
            <h5 class="font-bold">Order No: ${order.orderNumber} 
<span class="${statusClass}">
                    (${order.deliveryStatus})
                </span>
            </h5>
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

    // New click handler implementation
    let clickTimeout;
    let clickCount = 0;
    
    orderDiv.addEventListener('click', function(e) {
        clickCount++;
        
        if (clickCount === 1) {
            clickTimeout = setTimeout(() => {
                clickCount = 0;
            }, 500);
        }
        
        if (clickCount === 3) {
            clearTimeout(clickTimeout);
            clickCount = 0;
            
            const currentStatus = this.getAttribute('data-delivery-status');
            const newStatus = currentStatus === 'Delivered' ? 'Undelivered' : 'Delivered';
            
            updateDeliveryStatus(order.id, newStatus)
                .then(() => {
                    this.setAttribute('data-delivery-status', newStatus);
                    const statusSpan = this.querySelector('.order-header h5 span');
                    statusSpan.textContent = `(${newStatus})`;
                    statusSpan.className = newStatus === 'Delivered' ? 'text-success' : 'text-danger';
                })
                .catch(error => console.error('Error updating delivery status:', error));
        }
    });

    // Press/touch handling for download buttons
    let pressTimer;
    let hideTimer;
    let isPressing = false;

    const startPress = () => {
        isPressing = true;
        pressTimer = setTimeout(() => {
            if (isPressing) {
                buttonsContainer.style.display = 'flex';
                if (hideTimer) {
                    clearTimeout(hideTimer);
                }
                hideTimer = setTimeout(() => {
                    buttonsContainer.style.display = 'none';
                }, 10000);
            }
        }, 3000);
    };

    const endPress = () => {
        isPressing = false;
        clearTimeout(pressTimer);
    };

    orderDiv.addEventListener('mousedown', startPress);
    orderDiv.addEventListener('mouseup', endPress);
    orderDiv.addEventListener('mouseleave', endPress);
    orderDiv.addEventListener('touchstart', startPress);
    orderDiv.addEventListener('touchend', endPress);
    orderDiv.addEventListener('touchcancel', endPress);

    wrapperDiv.appendChild(buttonsContainer);
    wrapperDiv.appendChild(orderDiv);

    return wrapperDiv;
}

// Function to send daily undelivered orders notification

function getUndeliveredOrders() {
    return firebase.database().ref('sentOrders').once('value')
        .then(snapshot => {
            const undeliveredOrders = [];
            
            snapshot.forEach(childSnapshot => {
                const order = normalizeOrderData(childSnapshot.val(), childSnapshot.key);
                if (order && order.deliveryStatus === 'Undelivered') {
                    const totalQuantity = order.billedItems.reduce((sum, item) => sum + item.quantity, 0);
                    undeliveredOrders.push({
                        partyName: order.partyName,
                        totalQuantity: totalQuantity
                    });
                }
            });
            
            return undeliveredOrders;
        });
}
function sendDailyUndeliveredNotification() {
    getUndeliveredOrders()
        .then(undeliveredOrders => {
            if (undeliveredOrders.length > 0) {
                const message = undeliveredOrders
                    .map(order => `${order.partyName}-${order.totalQuantity}`)
                    .join('\n');
                
                const payload = {
                    badge: 'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png',
                    title: 'Dispatch Pending',
                    message: message,
                    target_url: 'https://ka-oms.netlify.app',
                    icon: 'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png'
                };

                return fetch('https://api.webpushr.com/v1/notification/send/all', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'webpushrKey': 'b285a62d89f9a1576f806016b692f5b4',
                        'webpushrAuthToken': '98413'
                    },
                    body: JSON.stringify(payload)
                });
            }
        })
        .then(response => response && response.json())
        .then(data => data && console.log('Notification sent:', data))
        .catch(error => console.error('Error in notification process:', error));
}
// Schedule daily notification at 8 AM
// Define delivery schedule by day
const DELIVERY_SCHEDULE = {
    'Monday': ['Panjim', 'Parvorim', 'Mapusa','PANJIM','MIRAMAR','Miramar'],
    'Tuesday': [],
    'Wednesday': ['Bicholim', 'Ponda', 'Phonda', 'Mapusa'],
    'Thursday': [],
    'Friday': ['Panjim', 'Parvorim', 'Vasco', 'Mapusa','PANJIM','MIRAMAR','Miramar'],
    'Saturday': ['Margao', 'Sanvordem','Needs','Collection ','canacona','Cancona'],
    'Sunday': ['Mapusa','emporium','SIOLIM']
};

function getAreaFromPartyName(partyName) {
    if (!partyName) return '';
    const parts = partyName.split(' ');
    return parts[parts.length - 1];
}
function showUndeliveredOrdersForDay(day) {
    const ordersList = document.getElementById('ordersList');
    const markDeliveredBtn = document.getElementById('markDeliveredBtn');
    
    if (!ordersList || !markDeliveredBtn) return;
    
    ordersList.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    firebase.database().ref('sentOrders').once('value')
        .then(snapshot => {
            const orders = [];
            
            snapshot.forEach(childSnapshot => {
                const order = childSnapshot.val();
                if (order && order.deliveryStatus === 'Undelivered') {
                    const area = getAreaFromPartyName(order.partyName);
                    const scheduledAreas = DELIVERY_SCHEDULE[day] || [];
                    
                    if (scheduledAreas.some(scheduledArea => 
                        area.toLowerCase() === scheduledArea.toLowerCase())) {
                        
                        const totalQuantity = order.billedItems?.reduce((sum, item) => 
                            sum + (parseInt(item.quantity) || 0), 0) || 0;
                        
                        orders.push({
                            id: childSnapshot.key,
                            partyName: order.partyName,
                            totalQuantity: totalQuantity,
                            area: area
                        });
                    }
                }
            });

            if (orders.length === 0) {
                ordersList.innerHTML = `
                    <div class="text-center text-muted mt-3">
                        <p>No undelivered orders for ${day}</p>
                    </div>`;
                markDeliveredBtn.style.display = 'none';
                return;
            }

            ordersList.innerHTML = `
                <div class="list-group">
                    ${orders.map(order => `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="form-check">
                                    <input class="form-check-input order-checkbox" 
                                           type="checkbox" 
                                           value="${order.id}" 
                                           id="order_${order.id}">
                                    <label class="form-check-label" for="order_${order.id}">
                                        ${order.partyName}
                                    </label>
                                </div>
                                <span class="badge bg-primary rounded-pill">${order.totalQuantity}</span>
                            </div>
                            <small class="text-muted ms-4">Area: ${order.area}</small>
                        </div>
                    `).join('')}
                </div>`;

            // Update mark delivered button visibility
            updateMarkDeliveredButton();

            // Add change event listeners to checkboxes
            const checkboxes = ordersList.querySelectorAll('.order-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateMarkDeliveredButton);
            });
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            ordersList.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error loading orders. Please try again.
                </div>`;
        });
}

function updateMarkDeliveredButton() {
    const markDeliveredBtn = document.getElementById('markDeliveredBtn');
    const checkboxes = document.querySelectorAll('.order-checkbox');
    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
    markDeliveredBtn.style.display = anyChecked ? 'block' : 'none';
}

function markOrdersAsDelivered() {
    const markDeliveredBtn = document.getElementById('markDeliveredBtn');
    const checkedOrders = document.querySelectorAll('.order-checkbox:checked');
    const updates = {};
    
    markDeliveredBtn.disabled = true;
    markDeliveredBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Updating...`;

    checkedOrders.forEach(checkbox => {
        updates[`sentOrders/${checkbox.value}/deliveryStatus`] = 'Delivered';
    });

    if (Object.keys(updates).length > 0) {
        firebase.database().ref().update(updates)
            .then(() => {
                // Refresh current day's orders
                const activeButton = document.querySelector('#dayButtons .active');
                if (activeButton) {
                    showUndeliveredOrdersForDay(activeButton.dataset.day);
                }
                // Refresh scrolling display
                loadUndeliveredOrdersScroll();
                
                // Show success message
                const ordersList = document.getElementById('ordersList');
                ordersList.insertAdjacentHTML('afterbegin', `
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        Orders marked as delivered successfully
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `);
            })
            .catch(error => {
                console.error('Error updating orders:', error);
                const ordersList = document.getElementById('ordersList');
                ordersList.insertAdjacentHTML('afterbegin', `
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        Error updating orders. Please try again.
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `);
            })
            .finally(() => {
                markDeliveredBtn.disabled = false;
                markDeliveredBtn.innerHTML = 'Mark Selected as Delivered';
            });
    }
}

function initializeModalHandlers() {
    const scrollContent = document.querySelector('.orders-scroll-content');
    if (scrollContent) {
        scrollContent.style.cursor = 'pointer';
        scrollContent.addEventListener('click', () => {
            const modal = createOrdersModal();
            modal.show();
            
            // Show Monday orders by default
            const mondayBtn = document.querySelector('[data-day="Monday"]');
            if (mondayBtn) {
                mondayBtn.classList.add('active');
                showUndeliveredOrdersForDay('Monday');
            }
        });
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initializeModalHandlers);
function getUndeliveredOrdersForDay(day) {
    const areasForDay = DELIVERY_SCHEDULE[day] || [];
    
    return firebase.database().ref('sentOrders').once('value')
        .then(snapshot => {
            const undeliveredOrders = [];
            const updates = {};
            
            snapshot.forEach(childSnapshot => {
                const order = normalizeOrderData(childSnapshot.val(), childSnapshot.key);
                if (order && order.deliveryStatus === 'Undelivered') {
                    const area = getAreaFromPartyName(order.partyName);
                    if (areasForDay.includes(area)) {
                        // Get notification count for this order
                        const notificationCount = order.notificationCount || 0;
                        
                        // Only include orders that haven't received 2 notifications yet
                        if (notificationCount < 2) {
                            const totalQuantity = order.billedItems.reduce((sum, item) => sum + item.quantity, 0);
                            undeliveredOrders.push({
                                id: childSnapshot.key,
                                partyName: order.partyName,
                                area: area,
                                totalQuantity: totalQuantity,
                                notificationCount: notificationCount
                            });
                            
                            // Increment notification count
                            updates[`sentOrders/${childSnapshot.key}/notificationCount`] = notificationCount + 1;
                            
                            // If this will be the second notification, schedule status update
                            if (notificationCount === 1) {
                                updates[`sentOrders/${childSnapshot.key}/deliveryStatus`] = 'Delivered';
                            }
                        }
                    }
                }
            });
            
            // Batch update the notification counts and status changes
            if (Object.keys(updates).length > 0) {
                firebase.database().ref().update(updates)
                    .catch(error => console.error('Error updating notification counts:', error));
            }
            
            return undeliveredOrders;
        });
}

/*notification stopped by admin
function checkAndSendNotification() {
    const now = new Date();
    const today8AM = new Date(now);
    today8AM.setHours(8, 0, 0, 0);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];

    const notificationRef = firebase.database().ref('system/lastNotification');

    notificationRef.once('value')
        .then(snapshot => {
            const lastNotification = snapshot.val();
            const lastNotificationDate = lastNotification ? new Date(lastNotification.timestamp) : null;
            
            const shouldSendNotification = () => {
                if (!lastNotificationDate) return true;
                return lastNotificationDate < today8AM && now >= today8AM;
            };

            if (shouldSendNotification()) {
                return getUndeliveredOrdersForDay(currentDay)
                    .then(undeliveredOrders => {
                        if (undeliveredOrders.length > 0) {
                            // Create message with notification count info
                            const message = undeliveredOrders
                                .map(order => {
                                    const notificationNum = (order.notificationCount || 0) + 1;
                                    return `${order.partyName} - ${order.totalQuantity} ( ${notificationNum}/2)`;
                                })
                                .join('\n');
                            
                            const payload = {
                                badge: 'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png',
                                title: `Dispatch Pending - ${currentDay}`,
                                message: message,
                                target_url: 'https://ka-oms.netlify.app',
                                icon: 'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png'
                            };

                            // Only send notification if there are orders to notify about
                            if (message.trim()) {
                                return fetch('https://api.webpushr.com/v1/notification/send/all', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'webpushrKey': 'b285a62d89f9a1576f806016b692f5b4',
                                        'webpushrAuthToken': '98413'
                                    },
                                    body: JSON.stringify(payload)
                                })
                                .then(response => response.json())
                                .then(data => {
                                    return notificationRef.set({
                                        timestamp: now.toISOString(),
                                        status: 'success',
                                        day: currentDay,
                                        ordersCount: undeliveredOrders.length
                                    });
                                });
                            }
                        }
                    });
            }
        })
        .catch(error => {
            console.error('Error in notification process:', error);
            notificationRef.child('lastError').set({
                timestamp: now.toISOString(),
                error: error.message,
                day: currentDay
            });
        });
}
*/
// Update the scroll content function to show area-wise grouping
// Keep the existing DELIVERY_SCHEDULE and other functions...

function getAreaToDateMap() {
    const areaToDateMap = {};
    Object.entries(DELIVERY_SCHEDULE).forEach(([day, areas]) => {
        areas.forEach(area => {
            if (!areaToDateMap[area]) {
                areaToDateMap[area] = [];
            }
            areaToDateMap[area].push(day);
        });
    });
    return areaToDateMap;
}

function getDaysForArea(area) {
    const areaToDateMap = getAreaToDateMap();
    return areaToDateMap[area] || [];
}

// Update the scroll content function to start immediately
function loadUndeliveredOrdersScroll() {
    const scrollContent = document.querySelector('.orders-scroll-content');
    if (!scrollContent) {
        console.error('Scroll content container not found');
        return;
    }

    // Add click handler immediately without waiting for data
    if (!scrollContent.getAttribute('data-click-handler-added')) {
        scrollContent.style.cursor = 'pointer';
        scrollContent.addEventListener('click', () => {
            const modal = createOrdersModal();
            modal.show();
            
            // Show Monday orders by default
            const mondayBtn = document.querySelector('[data-day="Monday"]');
            if (mondayBtn) {
                mondayBtn.classList.add('active');
                showUndeliveredOrdersForDay('Monday');
            }
        });
        scrollContent.setAttribute('data-click-handler-added', 'true');
    }

    // Start with a loading message that's also clickable
    scrollContent.textContent = 'Loading undelivered orders...';
    
    firebase.database().ref('sentOrders').once('value')
        .then(snapshot => {
            // Group orders by day
            const ordersByDay = {
                'Monday': [],
                'Tuesday': [],
                'Wednesday': [],
                'Thursday': [],
                'Friday': [],
                'Saturday': [],
                'Sunday': []
            };
            
            snapshot.forEach(childSnapshot => {
                const order = childSnapshot.val();
                if (order && order.deliveryStatus === 'Undelivered') {
                    const area = getAreaFromPartyName(order.partyName);
                    const totalQuantity = order.billedItems?.reduce((sum, item) => 
                        sum + (parseInt(item.quantity) || 0), 0) || 0;
                    
                    Object.entries(DELIVERY_SCHEDULE).forEach(([day, areas]) => {
                        if (areas.some(scheduledArea => 
                            area.toLowerCase() === scheduledArea.toLowerCase())) {
                            ordersByDay[day].push({
                                partyName: order.partyName,
                                totalQuantity: totalQuantity
                            });
                        }
                    });
                }
            });

            // Create scroll text
            const scrollParts = [];
            Object.entries(ordersByDay).forEach(([day, orders]) => {
                if (orders.length > 0) {
                    const dayOrders = orders
                        .map(order => `${order.partyName} (${order.totalQuantity})`)
                        .join(', ');
                    scrollParts.push(`${day}: [ ${dayOrders} ]`);
                }
            });

            if (scrollParts.length === 0) {
                scrollContent.textContent = 'No undelivered orders';
                return;
            }

            // Set the scroll text with instructions
            const scrollText = scrollParts.join(' || ');
            scrollContent.textContent = `${scrollText} || Click anywhere to manage orders`;
            
            // Set animation duration based on content length
            const duration = Math.max(15, scrollText.length * 0.2);
            scrollContent.style.animationDuration = `${duration}s`;
        })
        .catch(error => {
            console.error('Error loading undelivered orders for scroll:', error);
            scrollContent.textContent = 'Error loading orders... Click to try again';
        });
}

// Keep the existing notification system functions the same...
loadUndeliveredOrdersScroll();
setInterval(loadUndeliveredOrdersScroll, 60000);

// Helper function to format date for filename
function formatDateForFile(dateString) {
    if (!dateString) return 'NA';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Function to download as image
function downloadAsImage(element, filename) {
    const options = {
        scale: 2, // Increase quality
        useCORS: true,
        scrollX: 0,
        scrollY: -window.scrollY, // Ensure full capture
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight
    };
    
    html2canvas(element, options).then(canvas => {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function createOrdersModal() {
    let modal = document.getElementById('undeliveredOrdersModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'undeliveredOrdersModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-fullscreen-sm-down">
                <div class="modal-content">
                    <div class="modal-header flex-column">
                        <div class="d-flex w-100 justify-content-between align-items-center mb-2">
                            <h5 class="modal-title">Undelivered Orders</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="days-container w-100 overflow-auto">
                            <div class="btn-group flex-wrap" role="group" id="dayButtons">
                                <button type="button" class="btn btn-outline-primary" data-day="Monday">Mon</button>
                                <button type="button" class="btn btn-outline-primary" data-day="Tuesday">Tue</button>
                                <button type="button" class="btn btn-outline-primary" data-day="Wednesday">Wed</button>
                                <button type="button" class="btn btn-outline-primary" data-day="Thursday">Thu</button>
                                <button type="button" class="btn btn-outline-primary" data-day="Friday">Fri</button>
                                <button type="button" class="btn btn-outline-primary" data-day="Saturday">Sat</button>
                                <button type="button" class="btn btn-outline-primary" data-day="Sunday">Sun</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div id="ordersList" class="pb-5"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary w-100" id="markDeliveredBtn" style="display: none;">
                            Mark Selected as Delivered
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners after creating the modal
        const dayButtons = modal.querySelectorAll('#dayButtons .btn');
        dayButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                dayButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                showUndeliveredOrdersForDay(e.target.dataset.day);
            });
        });

        const markDeliveredBtn = modal.querySelector('#markDeliveredBtn');
        markDeliveredBtn.addEventListener('click', markOrdersAsDelivered);
    }

    return new bootstrap.Modal(modal);
}
function downloadAsPDF(element, filename) {
    // First, create a wrapper div that will contain our clone
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.background = '#fff';
    wrapper.style.zIndex = '-9999';
    document.body.appendChild(wrapper);

    // Create a clone of the element
    const clone = element.cloneNode(true);
    
    // Reset any transformations and ensure visibility
    clone.style.transform = 'none';
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = element.offsetWidth + 'px';
    clone.style.margin = '20px';
    clone.style.background = '#fff';
    
    // Ensure all table cells have proper padding and borders
    const cells = clone.querySelectorAll('td, th');
    cells.forEach(cell => {
        cell.style.padding = '8px';
        cell.style.border = '1px solid #000';
    });

    // Add clone to wrapper
    wrapper.appendChild(clone);

    // Setup html2canvas options
    const options = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollY: 0,
        scrollX: 0,
        windowWidth: clone.offsetWidth + 40, // Add margin
        windowHeight: clone.offsetHeight + 40,
        background: '#fff',
        onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector('.order-container');
            if (clonedElement) {
                // Ensure table is properly styled in the clone
                const tables = clonedElement.querySelectorAll('table');
                tables.forEach(table => {
                    table.style.width = '100%';
                    table.style.borderCollapse = 'collapse';
                    table.style.marginBottom = '10px';
                });

                // Ensure text is black and visible
                clonedElement.style.color = '#000';
                const textElements = clonedElement.querySelectorAll('*');
                textElements.forEach(el => {
                    if (window.getComputedStyle(el).color === 'rgba(0, 0, 0, 0)') {
                        el.style.color = '#000';
                    }
                });
            }
        }
    };

    // Create PDF
    html2canvas(clone, options).then(canvas => {
        try {
            const imgData = canvas.toDataURL('image/png', 1.0);
            const { jsPDF } = window.jspdf;
            
            // Calculate dimensions
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Create PDF with proper margins
            const pdf = new jsPDF({
                orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // Add margins
            const margin = 10; // 10mm margins
            const availableWidth = imgWidth - (2 * margin);
            const availableHeight = pageHeight - (2 * margin);
            
            // Calculate scaling to fit within margins
            const scale = Math.min(
                availableWidth / imgWidth,
                availableHeight / imgHeight
            );
            
            // Center the image
            const xOffset = margin + (availableWidth - (imgWidth * scale)) / 2;
            const yOffset = margin + (availableHeight - (imgHeight * scale)) / 2;
            
            // Add the image
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth * scale, imgHeight * scale);
            
            // Save the PDF
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            // Clean up
            document.body.removeChild(wrapper);
        }
    }).catch(error => {
        console.error('Error capturing element:', error);
        document.body.removeChild(wrapper);
    });
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
function initializeNotificationSystem() {
    // Check immediately when page loads
    checkAndSendNotification();
    
    // Check every hour in case the page stays open
    setInterval(checkAndSendNotification, 60 * 60 * 1000);
}
function addScrollStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .orders-scroll-container {
            width: 100%;
            background-color: #f8f9fa;
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .orders-scroll-container:hover {
            background-color: #e9ecef;
        }

        .orders-scroll-content {
            white-space: nowrap;
            animation: scroll-text linear infinite;
            display: inline-block;
            padding-right: 50px;
            cursor: pointer;
        }

        @keyframes scroll-text {
            0% {
                transform: translateX(100%);
            }
            100% {
                transform: translateX(-100%);
            }
        }
    `;
    document.head.appendChild(style);
}
document.addEventListener('DOMContentLoaded', () => {
    loadSentOrders();
    initializeNotificationSystem();
    initializeModalHandlers();
    setInterval(loadUndeliveredOrdersScroll, 60000);
   
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        checkAndSendNotification();
        loadUndeliveredOrdersScroll();
    }
});

function getNestedValue(obj, ...args) {
    return args.reduce((obj, level) => obj && obj[level], obj);
}

document.getElementById('sentOrdersBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
});


/* function with delivery status in sent order
function createSentOrderElement(order, index) {
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'order-wrapper position-relative mb-4';
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container position-absolute w-full';
    buttonsContainer.style.cssText = `
        display: none;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px;
        z-index: 100;
        bottom: 100%;
        left: 0;
        right: 0;
        background: transparent;
    `;
    
    const imgButton = document.createElement('button');
    imgButton.className = 'btn btn-primary btn-sm';
    imgButton.innerHTML = 'Download as Image';
    imgButton.onclick = () => downloadAsImage(orderDiv, `${order.partyName}_${formatDateForFile(order.billingDate)}`);

    const pdfButton = document.createElement('button');
    pdfButton.className = 'btn btn-secondary btn-sm';
    pdfButton.innerHTML = 'Download as PDF';
    pdfButton.onclick = () => downloadAsPDF(orderDiv, `${order.partyName}_${formatDateForFile(order.billingDate)}`);

    buttonsContainer.appendChild(imgButton);
    buttonsContainer.appendChild(pdfButton);

    const orderDiv = document.createElement('div');
    orderDiv.style.backgroundColor = index % 2 === 0 ? '#ffebee' : '#e3f2fd';
    orderDiv.className = 'order-container p-3 rounded';
    orderDiv.setAttribute('data-order-id', order.id);
    orderDiv.setAttribute('data-delivery-status', order.deliveryStatus);

    const totalQuantity = order.billedItems.reduce((sum, item) => sum + item.quantity, 0);
    const statusClass = order.deliveryStatus === 'Delivered' ? 'text-success' : 'text-danger';
    
    orderDiv.innerHTML = `
        <div class="order-header">
            <h5 class="font-bold">Order No: ${order.orderNumber} 
<span class="${statusClass}">
                    (${order.deliveryStatus})
                </span>
            </h5>
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

    // New click handler implementation
    let clickTimeout;
    let clickCount = 0;
    
    orderDiv.addEventListener('click', function(e) {
        clickCount++;
        
        if (clickCount === 1) {
            clickTimeout = setTimeout(() => {
                clickCount = 0;
            }, 500);
        }
        
        if (clickCount === 3) {
            clearTimeout(clickTimeout);
            clickCount = 0;
            
            const currentStatus = this.getAttribute('data-delivery-status');
            const newStatus = currentStatus === 'Delivered' ? 'Undelivered' : 'Delivered';
            
            updateDeliveryStatus(order.id, newStatus)
                .then(() => {
                    this.setAttribute('data-delivery-status', newStatus);
                    const statusSpan = this.querySelector('.order-header h5 span');
                    statusSpan.textContent = `(${newStatus})`;
                    statusSpan.className = newStatus === 'Delivered' ? 'text-success' : 'text-danger';
                })
                .catch(error => console.error('Error updating delivery status:', error));
        }
    });

    // Press/touch handling for download buttons
    let pressTimer;
    let hideTimer;
    let isPressing = false;

    const startPress = () => {
        isPressing = true;
        pressTimer = setTimeout(() => {
            if (isPressing) {
                buttonsContainer.style.display = 'flex';
                if (hideTimer) {
                    clearTimeout(hideTimer);
                }
                hideTimer = setTimeout(() => {
                    buttonsContainer.style.display = 'none';
                }, 10000);
            }
        }, 3000);
    };

    const endPress = () => {
        isPressing = false;
        clearTimeout(pressTimer);
    };

    orderDiv.addEventListener('mousedown', startPress);
    orderDiv.addEventListener('mouseup', endPress);
    orderDiv.addEventListener('mouseleave', endPress);
    orderDiv.addEventListener('touchstart', startPress);
    orderDiv.addEventListener('touchend', endPress);
    orderDiv.addEventListener('touchcancel', endPress);

    wrapperDiv.appendChild(buttonsContainer);
    wrapperDiv.appendChild(orderDiv);

    return wrapperDiv;
}*/
