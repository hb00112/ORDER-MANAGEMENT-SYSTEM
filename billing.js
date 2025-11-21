const COMMON_REMARKS = [
    'STOCK NOT FOUND IN GODOWN',
    'WAITING FOR APPROVAL',
    'PT FILE BILLING',
    'STOCK ON SHOP BUT WAITING APPROVAL',
    'CANCEL',
    'DUPLICATE ITEMS',
    'STOCK NOT FOUND IN SHOP'
];


let isScanning = false;
let scanTimeout = null;
const SCAN_DELAY = 2000; // 5 seconds delay between scans
let lastProcessedBarcode = null; // Track last processed barcode

let scannerMode = 'camera'; // 'camera' or 'manual'
let clickCount = 0;
let clickTimer = null;

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
    
    // Format the original order date in DD/MM/YYYY format
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    
    const orderDate = formatDate(order.dateTime);
    
    // Format remarks with highlighted style
    const formattedRemarks = order.remarks ? 
        `<div class="order-remarks bg-warning bg-opacity-10 p-2 rounded border border-warning border-opacity-25">
            <strong class="text-warning">📌 Remarks:</strong> ${order.remarks}
        </div>` : 
        '';
    
    orderDiv.innerHTML = `
        <div class="order-header d-flex justify-content-between align-items-center">
            <div>
                <h5>Order No: ${order.orderNumber || 'N/A'}</h5>
                <p>Party Name: ${order.partyName || 'N/A'}</p>
                <p>Order Date: ${orderDate}</p>
            </div>
          <div class="button-actions">
    <button class="btn btn-outline-primary barcode-scan-btn" data-order-id="${orderId}">
        <!-- Barcode SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
            <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
            <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
            <rect x="7" y="7" width="10" height="10"></rect>
        </svg>
    </button>

    <button class="btn btn-outline-warning add-remark-btn" data-order-id="${orderId}" title="Add Remarks">
        <!-- Chat SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-chat-left-text" viewBox="0 0 16 16">
            <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12z"/>
            <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9zM3 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5z"/>
        </svg>
    </button>

    <button class="btn btn-outline-danger delete-order-btn" data-order-id="${orderId}" title="Delete Order">
        <!-- Trash SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6zM8 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6zM11 6a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4H2.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1z"/>
        </svg>
    </button>
</div>

        </div>
        ${formattedRemarks}
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


// Add this modal HTML for delete confirmation
const deleteModalHTML = `
<div class="modal fade" id="deleteOrderModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-danger text-white">
                <h5 class="modal-title">⚠️ Delete Order Confirmation</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to permanently delete this order?</p>
                <p class="fw-bold">This action cannot be undone!</p>
                <div class="order-details mt-3 p-2 bg-light rounded">
                    <p><strong>Order No:</strong> <span id="deleteOrderNumber">N/A</span></p>
                    <p><strong>Party Name:</strong> <span id="deletePartyName">N/A</span></p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger confirm-delete-btn">Delete Permanently</button>
            </div>
        </div>
    </div>
</div>`;

// Add the modal to the document body
document.body.insertAdjacentHTML('beforeend', deleteModalHTML);
const deleteOrderModal = new bootstrap.Modal(document.getElementById('deleteOrderModal'));
let orderToDeleteId = null;

// Event listener for delete order button
document.addEventListener('click', function(e) {
    if (e.target.closest('.delete-order-btn')) {
        const orderId = e.target.closest('.delete-order-btn').getAttribute('data-order-id');
        openDeleteOrderModal(orderId);
    }
});

// Function to open delete confirmation modal
async function openDeleteOrderModal(orderId) {
    orderToDeleteId = orderId;
    
    // Get order data to display in modal
    const orderSnapshot = await firebase.database().ref('billingOrders').child(orderId).once('value');
    const order = orderSnapshot.val();
    
    if (order) {
        document.getElementById('deleteOrderNumber').textContent = order.orderNumber || 'N/A';
        document.getElementById('deletePartyName').textContent = order.partyName || 'N/A';
    }
    
    deleteOrderModal.show();
}

// Event listener for confirm delete button
document.querySelector('.confirm-delete-btn').addEventListener('click', async function() {
    if (orderToDeleteId) {
        try {
            await firebase.database().ref('billingOrders').child(orderToDeleteId).remove();
            showToast('Order deleted successfully', 'success');
            loadBillingOrders(); // Refresh the orders list
        } catch (error) {
            console.error('Error deleting order:', error);
            showToast('Failed to delete order', 'error');
        } finally {
            deleteOrderModal.hide();
            orderToDeleteId = null;
        }
    }
});

// Add this modal HTML for remarks
const remarkModalHTML = `
<div class="modal fade" id="remarkModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-light">
                <h5 class="modal-title">📝 Order Remarks</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="current-remarks mb-3 p-3 bg-warning bg-opacity-10 rounded" style="display:none;">
                    <h6>Current Remarks:</h6>
                    <p id="currentRemarkText" class="mb-0"></p>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Select common remarks or type your own:</label>
                    <div class="common-remarks mb-3">
                        ${COMMON_REMARKS.map(remark => 
                            `<button type="button" class="btn btn-sm btn-outline-warning me-2 mb-2 remark-btn" data-remark="${remark}">${remark}</button>`
                        ).join('')}
                    </div>
                    <textarea class="form-control" id="remarkText" rows="3" placeholder="Enter custom remarks..." style="border-color: #ffc107;"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning save-remark-btn">Save Remarks</button>
            </div>
        </div>
    </div>
</div>`;


// Add the modal to the document body
document.body.insertAdjacentHTML('beforeend', remarkModalHTML);
const remarkModal = new bootstrap.Modal(document.getElementById('remarkModal'));

// Add event listener for the remark button
document.addEventListener('click', function(e) {
    if (e.target.closest('.add-remark-btn')) {
        const orderId = e.target.closest('.add-remark-btn').getAttribute('data-order-id');
        openRemarkModal(orderId);
    }
});
function openRemarkModal(orderId) {
    currentOrderId = orderId;
    
    // Get current remarks if any
    firebase.database().ref('billingOrders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            const currentRemarksContainer = document.querySelector('.current-remarks');
            const currentRemarkText = document.getElementById('currentRemarkText');
            
            if (order && order.remarks) {
                currentRemarkText.textContent = order.remarks;
                currentRemarksContainer.style.display = 'block';
                document.getElementById('remarkText').value = order.remarks;
            } else {
                currentRemarksContainer.style.display = 'none';
                document.getElementById('remarkText').value = '';
            }
            remarkModal.show();
        });
}

// Add event listener for common remark buttons
document.querySelectorAll('.remark-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const remark = this.getAttribute('data-remark');
        document.getElementById('remarkText').value = remark;
    });
});

// Save remarks to Firebase
document.querySelector('.save-remark-btn').addEventListener('click', function() {
    const remarkText = document.getElementById('remarkText').value.trim();
    
    if (currentOrderId) {
        firebase.database().ref('billingOrders').child(currentOrderId).update({
            remarks: remarkText
        })
        .then(() => {
            showToast('Remarks saved successfully', 'success');
            remarkModal.hide();
            loadBillingOrders(); // Refresh the orders list
        })
        .catch(error => {
            console.error('Error saving remarks:', error);
            showToast('Failed to save remarks', 'error');
        });
    }
});

// Create Modal HTML
const modalHTML = `
<div class="modal fade" id="barcodeScanModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Scan Barcode</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="scanner-container" class="mb-3">
                    <div id="camera-container" class="position-relative">
                        <video id="scanner-video" class="w-100" style="max-height: 120px; min-height:110px; object-fit: cover;"></video>
                        <div class="scanning-line position-absolute start-0 w-100" 
                             style="top: 50%; height: 2px; background-color: red; z-index: 1000;"></div>
                    </div>
                    <div id="scan-input-container" class="mt-3" style="display: none;">
                        <input type="text" class="form-control" id="barcodeInput" 
                               placeholder="Type barcode here..." autofocus>
                    </div>
                </div>
                <div id="modalOrderContent"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-success modal-bill-btn">Bill Order</button>
            </div>
        </div>
    </div>
</div>`;

// Add modal to document body
document.body.insertAdjacentHTML('beforeend', modalHTML);
// First, add this HTML for the toast container right after your modal HTML
const toastContainerHTML = `
<div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3" style="z-index: 1070;">
  <div id="scannerToast" class="toast align-items-center text-white border-0" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="d-flex">
      <div class="toast-body"></div>
    </div>
  </div>
</div>`;

document.body.insertAdjacentHTML('beforeend', toastContainerHTML);

// Function to show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('scannerToast');
    const toastBody = toast.querySelector('.toast-body');
    
    // Set background color based on type
    switch(type) {
        case 'success':
            toast.className = 'toast align-items-center text-white bg-success border-0';
            break;
        case 'error':
            toast.className = 'toast align-items-center text-white bg-danger border-0';
            break;
        case 'warning':
            toast.className = 'toast align-items-center text-white bg-warning border-0';
            break;
    }
    
    toastBody.textContent = message;
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast, {
        animation: true,
        autohide: true,
        delay: 1500 // Will disappear after 1.5 seconds
    });
    
    bsToast.show();
}

// Sound effects
const successBeep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+c3PSuZicYT6vi76N0O0hwr8vPp5hkSEhqoL/LqZ5yW1JjlrG+qLOSTVVfs8PGpKOMaW1qbI+svK/HqZVhUW6WyM7AoYxwWld4qNDatKaIPzE6bpe4xbOpiWNUY4+xwLWximNdaZexx7mxkHBgWGOKrcTOtJ2MSUlse6XG1LevkGldVmqRtMvGsaGVeGVfa4mru8G8sZ+Pa2BkiqXAy7mqk3VkZIGlwMq/qpuAaGBjhqG8xsC2qZdyZGmCoLvLxbOji25hb4egvMzFsqOQeGt2gpi3wr22rpaGdWlxe5O5ybXIsptqVGmYxL/449u0hlZqwqGMzLqhkXVwgZKuusG3rJyLfnhzaXeYrcXHuaaRbF1wo8bCuq6OX2aYw7+3q5FoZn6bt8a+s6KMdnR8kKW3vLWsno9/fXx8gZienZ6enp6en6CgoKGhoaKioqOjo6SkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpA==');
const errorBeep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB/f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn8=');

// Initialize modal
const barcodeModal = new bootstrap.Modal(document.getElementById('barcodeScanModal'));
let currentOrderId = null;

// Event listener for barcode scan button
document.addEventListener('click', function(e) {
    if (e.target.closest('.barcode-scan-btn')) {
        const orderId = e.target.closest('.barcode-scan-btn').getAttribute('data-order-id');
        openBarcodeModal(orderId);
    }
});

function toggleScannerMode() {
    if (scannerMode === 'camera') {
        scannerMode = 'manual';
        stopScanner();
        document.getElementById('camera-container').style.display = 'none';
        document.getElementById('scan-input-container').style.display = 'block';
        document.getElementById('barcodeInput').focus();
    } else {
        scannerMode = 'camera';
        document.getElementById('camera-container').style.display = 'block';
        document.getElementById('scan-input-container').style.display = 'none';
        startScanner();
    }
}
async function startScanner() {
    // Clear any existing scan timeouts
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    isScanning = false;
    lastProcessedBarcode = null;

    try {
        // Check if BarcodeDetector is available
        if (!('BarcodeDetector' in window)) {
            alert('Barcode Scanner not supported by this browser. Switching to manual mode.');
            toggleScannerMode();
            return;
        }

        const video = document.getElementById('scanner-video');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        videoStream = stream;
        video.srcObject = stream;
        await video.play();

        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
        });

        // Modified scanning loop with strict delay enforcement
        async function scanFrame() {
            if (scannerMode !== 'camera') return;

            try {
                // Only attempt to detect if not currently scanning
                if (!isScanning) {
                    const barcodes = await barcodeDetector.detect(video);
                    
                    if (barcodes.length > 0) {
                        const barcode = barcodes[0].rawValue;
                        
                        // Only process if it's a new barcode or sufficient time has passed
                        if (barcode !== lastProcessedBarcode) {
                            isScanning = true;
                            lastProcessedBarcode = barcode;
                            
                            // Process the barcode
                            await processScannedBarcode(barcode);
                            
                            // Set delay before allowing next scan
                            scanTimeout = setTimeout(() => {
                                isScanning = false;
                                lastProcessedBarcode = null;
                                showToast('Scanner ready', 'success');
                            }, SCAN_DELAY);
                        }
                    }
                }
            } catch (error) {
                console.error('Scanning error:', error);
            }

            // Continue the scanning loop
            if (scannerMode === 'camera') {
                requestAnimationFrame(scanFrame);
            }
        }

        scanFrame();

    } catch (error) {
        console.error('Scanner initialization error:', error);
        alert('Unable to access camera. Switching to manual mode.');
        toggleScannerMode();
    }
}


// Update stopScanner to clear timeouts
function stopScanner() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    // Clear any pending scan timeouts
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    isScanning = false;
    lastProcessedBarcode = null;
}

// Event listener for triple click to switch modes
document.getElementById('scanner-container').addEventListener('click', function() {
    clickCount++;
    
    if (clickCount === 1) {
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 500); // Reset after 500ms if no more clicks
    }
    
    if (clickCount === 3) {
        clearTimeout(clickTimer);
        clickCount = 0;
        toggleScannerMode();
    }
});


let videoStream = null;

// Initialize the scanner
function initializeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }

    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", 
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        }
    );

    html5QrcodeScanner.render(async (decodedText) => {
        await processScannedBarcode(decodedText);
    });
}



// Enhanced processScannedBarcode function with delay
async function processScannedBarcode(barcode) {
    try {
        console.log('Processing barcode input:', {
            input: barcode,
            type: typeof barcode,
            timestamp: new Date().toISOString()
        });

        if (!barcode) {
            showToast('Invalid barcode input', 'error');
            errorBeep.play();
            return;
        }

        const matchedBarcode = findMatchingBarcode(barcode);
        
        if (!matchedBarcode) {
            showToast('Barcode not found in database', 'error');
            errorBeep.play();
            return;
        }

        const itemData = window.barcodeMapping[matchedBarcode];
        
        if (!currentOrderId) {
            showToast('No order selected', 'error');
            errorBeep.play();
            return;
        }

        // Get order data
        const orderSnapshot = await firebase.database()
            .ref('billingOrders')
            .child(currentOrderId)
            .once('value');
            
        const order = orderSnapshot.val();
        
        if (!order || !order.items) {
            showToast('Order not found', 'error');
            errorBeep.play();
            return;
        }

        // Find matching item
        const matchingItem = order.items.find(item => {
            return item.name === itemData.itemName && 
                   item.colors?.[itemData.color]?.[itemData.size] !== undefined;
        });

        if (!matchingItem) {
            showToast('Invalid item for this order', 'warning');
            errorBeep.play();
            return;
        }

        // Find modal quantity input
        const modalInputId = `modal-${itemData.itemName}-${itemData.color}-${itemData.size}`;
        const quantityInput = document.getElementById(modalInputId);

        if (!quantityInput) {
            showToast('System error: Input not found', 'error');
            errorBeep.play();
            return;
        }

        const maxQuantity = parseInt(matchingItem.colors[itemData.color][itemData.size]);
        const currentQuantity = parseInt(quantityInput.value) || 0;

        if (currentQuantity >= maxQuantity) {
            showToast('Maximum quantity reached', 'warning');
            errorBeep.play();
            quantityInput.style.backgroundColor = '#ffebee';
            setTimeout(() => {
                quantityInput.style.backgroundColor = '';
            }, 500);
            return;
        }

        // Increment modal quantity
        quantityInput.value = currentQuantity + 1;
        showToast(`Product found: ${itemData.itemName}-${itemData.color}-${itemData.size}`, 'success');
        successBeep.play();
        
        // Visual feedback
        quantityInput.style.backgroundColor = '#e8f5e9';
        setTimeout(() => {
            quantityInput.style.backgroundColor = '';
        }, 500);

    } catch (error) {
        console.error('Error in processScannedBarcode:', error);
        showToast('System error occurred', 'error');
        errorBeep.play();
    }
}



// Improved barcode standardization
function standardizeBarcode(barcode) {
    if (!barcode) return '';
    
    // Convert to string and clean
    const cleaned = barcode.toString().trim().replace(/[^0-9]/g, '');
    console.log('Standardizing barcode:', {
        original: barcode,
        cleaned: cleaned
    });
    
    return cleaned;
}

// Enhanced barcode matching
function findMatchingBarcode(inputBarcode) {
    if (!inputBarcode || !window.barcodeMapping) {
        console.log('Invalid input or missing mapping:', {
            input: inputBarcode,
            hasMapping: Boolean(window.barcodeMapping)
        });
        return null;
    }

    // Clean the input barcode
    const cleanedBarcode = inputBarcode.toString().trim();
    
    // Only check for exact match
    if (window.barcodeMapping[cleanedBarcode]) {
        console.log('Found exact match:', cleanedBarcode);
        return cleanedBarcode;
    }

    console.log('No exact match found for barcode:', cleanedBarcode);
    return null;
}
// Event listener for manual barcode input


function setupBarcodeInput() {
    const input = document.getElementById('barcodeInput');
    if (input) {
        input.addEventListener('keyup', async function(e) {
            if (e.key === 'Enter') {
                const barcode = this.value.trim();
                console.log('Manual barcode input:', barcode);
                this.value = ''; // Clear input
                await processScannedBarcode(barcode);
            }
        });
    }
}


// Initialize barcode mapping


// Call initialization when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeBarcodeMapping();
    testBarcodeMapping();
    setupBarcodeInput();
    console.log('Scanner initialized with mappings:', window.barcodeMapping)
});

// Enhanced test function
function testBarcodeMapping() {
    const testBarcode = '8902625553430';
    const testInput = '2625553430'; // Test with shorter input
    
    console.log('Testing barcode mapping...', {
        mappingExists: Boolean(window.barcodeMapping),
        originalMapping: window.barcodeMapping,
        testBarcode: testBarcode,
        testBarcodeExists: Boolean(window.barcodeMapping?.[testBarcode]),
        standardizedTestInput: standardizeBarcode(testInput)
    });
}
// Event listener for long press to switch modes
let pressTimer;
document.getElementById('scanner-container').addEventListener('mousedown', function() {
    pressTimer = setTimeout(toggleScannerMode, 3000);
});

document.getElementById('scanner-container').addEventListener('mouseup', function() {
    clearTimeout(pressTimer);
});



// Function to open barcode modal


// Clean up when modal is closed
document.getElementById('barcodeScanModal').addEventListener('hidden.bs.modal', function () {
    stopScanner();
    clickCount = 0;
    if (clickTimer) {
        clearTimeout(clickTimer);
    }
});


function createOrderItemRows(items, isModal = false) {
    if (!items || !Array.isArray(items)) return '';
    
    return items.flatMap(item => {
        return Object.entries(item.colors || {}).flatMap(([color, sizes]) => {
            return Object.entries(sizes).map(([size, qty]) => {
                // Create unique identifiers for main and modal inputs
                const inputPrefix = isModal ? 'modal-' : 'main-';
                const inputId = `${inputPrefix}${item.name}-${color}-${size}`;
                
                // Set default value based on whether it's modal or main view
                const defaultValue = isModal ? 0 : qty;
                
                return `
                <tr>
                    <td>${item.name} (${color})</td>
                    <td>${size}/${qty}</td>
                    <td>
                        <div class="quantity-control">
                            <button class="btn btn-sm btn-outline-secondary decrease">-</button>
                            <input type="number" 
                                   class="form-control form-control-sm mx-2 bill-quantity ${isModal ? 'modal-quantity' : 'main-quantity'}"
                                   id="${inputId}"
                                   value="${defaultValue}"
                                   min="0" 
                                   max="${qty}"
                                   data-item="${item.name}" 
                                   data-color="${color}" 
                                   data-size="${size}">
                            <button class="btn btn-sm btn-outline-secondary increase">+</button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
        });
    }).join('');
}
/* Barcode scanning handler
document.getElementById('barcodeInput').addEventListener('keyup', async function(e) {
    if (e.key === 'Enter') {
        const barcode = this.value.trim();
        this.value = ''; // Clear input
        
        if (!barcodeMapping[barcode]) {
            errorBeep.play();
            return;
        }
        
        const { itemName, color, size } = barcodeMapping[barcode];
        await processScannedItem(itemName, color, size);
    }
}); */

// Process scanned item
// Updated processScannedBarcode function
async function processScannedBarcode(barcode) {
    try {
        console.log('Processing barcode input:', {
            input: barcode,
            type: typeof barcode
        });

        if (!barcode) {
            showToast('Invalid barcode input', 'error');
            errorBeep.play();
            return;
        }

        const matchedBarcode = findMatchingBarcode(barcode);
        
        if (!matchedBarcode) {
            showToast('Barcode not found in database', 'error');
            errorBeep.play();
            return;
        }

        const itemData = window.barcodeMapping[matchedBarcode];
        
        if (!currentOrderId) {
            showToast('No order selected', 'error');
            errorBeep.play();
            return;
        }

        // Get order data
        const orderSnapshot = await firebase.database()
            .ref('billingOrders')
            .child(currentOrderId)
            .once('value');
            
        const order = orderSnapshot.val();
        
        if (!order || !order.items) {
            showToast('Order not found', 'error');
            errorBeep.play();
            return;
        }

        // Find matching item
        const matchingItem = order.items.find(item => {
            return item.name === itemData.itemName && 
                   item.colors?.[itemData.color]?.[itemData.size] !== undefined;
        });

        if (!matchingItem) {
            showToast('Invalid item for this order', 'warning');
            errorBeep.play();
            return;
        }

        // Find modal quantity input
        const modalInputId = `modal-${itemData.itemName}-${itemData.color}-${itemData.size}`;
        const quantityInput = document.getElementById(modalInputId);

        if (!quantityInput) {
            showToast('System error: Input not found', 'error');
            errorBeep.play();
            return;
        }

        const maxQuantity = parseInt(matchingItem.colors[itemData.color][itemData.size]);
        const currentQuantity = parseInt(quantityInput.value) || 0;

        if (currentQuantity >= maxQuantity) {
            showToast('Maximum quantity reached', 'warning');
            errorBeep.play();
            quantityInput.style.backgroundColor = '#ffebee';
            setTimeout(() => {
                quantityInput.style.backgroundColor = '';
            }, 500);
            return;
        }

        // Increment modal quantity
        quantityInput.value = currentQuantity + 1;
        showToast(`Product found: ${itemData.itemName}-${itemData.color}-${itemData.size}`, 'success');
        successBeep.play();
        
        // Visual feedback
        quantityInput.style.backgroundColor = '#e8f5e9';
        setTimeout(() => {
            quantityInput.style.backgroundColor = '';
        }, 500);

    } catch (error) {
        console.error('Error in processScannedBarcode:', error);
        showToast('System error occurred', 'error');
        errorBeep.play();
    }
}
// Function to open barcode modal with independent quantities
async function openBarcodeModal(orderId) {
    currentOrderId = orderId;
    
    // Get order data
    const orderSnapshot = await firebase.database().ref('billingOrders')
        .child(orderId)
        .once('value');
    const order = orderSnapshot.val();
    
    if (!order) {
        alert('Order not found');
        return;
    }
    
    // Reset the modal content with separate quantity tracking
    const modalOrderContent = document.getElementById('modalOrderContent');
    modalOrderContent.innerHTML = `
        <div class="order-header">
            <h5>Order No: ${order.orderNumber || 'N/A'}</h5>
            <p>Party Name: ${order.partyName || 'N/A'}</p>
            <p>Date: ${order.dateTime || new Date().toLocaleDateString()}</p>
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
                    ${createOrderItemRows(order.items, true)}
                </tbody>
            </table>
        </div>
    `;

    // Initialize scanner in camera mode by default
    scannerMode = 'camera';
    document.getElementById('camera-container').style.display = 'block';
    document.getElementById('scan-input-container').style.display = 'none';
    
    barcodeModal.show();
    startScanner();
}

// Handle modal bill button click
document.querySelector('.modal-bill-btn').addEventListener('click', function() {
    billOrder(currentOrderId, true);
});

// Event listeners for quantity controls in modal
document.getElementById('modalOrderContent').addEventListener('click', function(e) {
    if (e.target.classList.contains('decrease')) {
        const input = e.target.parentElement.querySelector('input');
        if (input.value > 0) input.value = parseInt(input.value) - 1;
    } else if (e.target.classList.contains('increase')) {
        const input = e.target.parentElement.querySelector('input');
        if (parseInt(input.value) < parseInt(input.max)) {
            input.value = parseInt(input.value) + 1;
        }
    }
});

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
        billOrder(orderId,false);
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
async function billOrder(orderId, isModal = false) {
    try {
        // Determine which container to look for inputs
        let container;
        if (isModal) {
            container = document.getElementById('modalOrderContent');
        } else {
            container = document.querySelector(`.order-container:has([data-order-id="${orderId}"])`);
        }

        if (!container) {
            throw new Error("Order container not found");
        }

        // Get order details from Firebase
        const orderSnapshot = await firebase.database().ref('billingOrders').child(orderId).once('value');
        const originalOrder = orderSnapshot.val();
        if (!originalOrder) {
            throw new Error("Order not found in database");
        }

        // Collect billed quantities with enhanced validation
        const billQuantities = {};
        const billedItems = [];
        let hasValidBilledItems = false;
        let remainingOrderItems = [];
        
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
                            // Find corresponding input in the DOM, checking for both modal and main inputs
                            const inputSelector = isModal ? 
                                `.modal-quantity[data-item="${item.name}"][data-color="${color}"][data-size="${size}"]` :
                                `.bill-quantity[data-item="${item.name}"][data-color="${color}"][data-size="${size}"]`;
                            
                            const input = container.querySelector(inputSelector);
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
            }).filter(item => item !== null);
        }

        if (!hasValidBilledItems) {
            throw new Error("Please enter valid billing quantities for at least one item");
        }

        // Create new sent order object - EACH ORDER IS SEPARATE
        const sentOrder = {
            orderId: orderId, // Store original order ID to prevent merging
            orderNumber: originalOrder.orderNumber,
            partyName: originalOrder.partyName,
            date: originalOrder.dateTime,
            billingDate: new Date().toISOString(),
            billedItems: billedItems,
            status: 'completed',
            remarks: originalOrder.remarks || ''
        };

        // Start Firebase operations
        const db = firebase.database();

        // 1. Update stock quantities
        await updateStockQuantities(billQuantities);

        // 2. Add to sent orders - EACH AS SEPARATE ENTRY
        const sentOrdersRef = db.ref('sentOrders');
        const newSentOrderRef = sentOrdersRef.push();
        await newSentOrderRef.set(sentOrder);

        // 3. Update or remove billing order based on remaining items
        if (remainingOrderItems.length > 0) {
            const updatedOrder = {
                ...originalOrder,
                items: remainingOrderItems
            };
            await db.ref('billingOrders').child(orderId).set(updatedOrder);
        } else {
            await db.ref('billingOrders').child(orderId).remove();
        }

        // 4. Refresh displays
        await Promise.all([
            loadStockItemsFromFirebase(),
            loadBillingOrders(),
            loadSentOrders()
        ]);

        // 5. Close modal if billing from modal
        if (isModal) {
            const modalElement = document.getElementById('barcodeScanModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }

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
        deliveryStatus: order.deliveryStatus || 'Delivered',
        remarks: order.remarks || '',
        uniqueId: orderId // Add unique identifier to prevent merging
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


function initializeBarcodeMapping() {
    if (!window.barcodeMapping) {
        console.log('Initializing barcode mapping...');
        window.barcodeMapping = {
            '8902625019424': {
                itemName: 'A202',
                color: 'CHIVIO',
                size: 'L'
            },
        
           
        
        };
        
    }
}
