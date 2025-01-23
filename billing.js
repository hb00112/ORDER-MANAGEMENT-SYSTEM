const barcodeMapping = {
    '8902625553430': {
        itemName: 'A202',
        color: 'CHIVIO',
        size: 'S'
    }
    // Add more barcode mappings as needed
};

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
    
    orderDiv.innerHTML = `
        <div class="order-header d-flex justify-content-between align-items-center">
            <div>
                <h5>Order No: ${order.orderNumber || 'N/A'}</h5>
                <p>Party Name: ${order.partyName || 'N/A'}</p>
                <p>Date: ${order.date || new Date().toLocaleDateString()}</p>
            </div>
            <div>
                <button class="btn btn-outline-primary barcode-scan-btn" data-order-id="${orderId}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                        <rect x="7" y="7" width="10" height="10"></rect>
                    </svg>
                </button>
            </div>
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

        // Create new sent order object
        const sentOrder = {
            orderNumber: originalOrder.orderNumber,
            partyName: originalOrder.partyName,
            date: originalOrder.dateTime,
            billingDate: new Date().toISOString(),
            billedItems: billedItems,
            status: 'completed'
        };

        // Start Firebase operations
        const db = firebase.database();

        // 1. Update stock quantities
        await updateStockQuantities(billQuantities);

        // 2. Add to sent orders
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


function initializeBarcodeMapping() {
    if (!window.barcodeMapping) {
        console.log('Initializing barcode mapping...');
        window.barcodeMapping = {
            '8902625019424': {
                itemName: 'A202',
                color: 'CHIVIO',
                size: 'L'
            },
        
            '8902625019417': {
                itemName: 'A202',
                color: 'CHIVIO',
                size: 'M'
            },
        
            '8902625019400': {
                itemName: 'A202',
                color: 'CHIVIO',
                size: 'S'
            },
        
            '8902625019431': {
                itemName: 'A202',
                color: 'CHIVIO',
                size: 'XL'
            },
        
            '8902625019448': {
                itemName: 'A202',
                color: 'CHIVIO',
                size: 'XXL'
            },
        
            '8902625048929': {
                itemName: 'A202',
                color: 'DYB',
                size: 'L'
            },
        
            '8902625048912': {
                itemName: 'A202',
                color: 'DYB',
                size: 'M'
            },
        
            '8902625048905': {
                itemName: 'A202',
                color: 'DYB',
                size: 'S'
            },
        
            '8902625048936': {
                itemName: 'A202',
                color: 'DYB',
                size: 'XL'
            },
        
            '8902625048943': {
                itemName: 'A202',
                color: 'DYB',
                size: 'XXL'
            },
        
            '8902625006271': {
                itemName: 'A202',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625006264': {
                itemName: 'A202',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625006257': {
                itemName: 'A202',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625006288': {
                itemName: 'A202',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625006295': {
                itemName: 'A202',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625019486': {
                itemName: 'A202',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625019479': {
                itemName: 'A202',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625019462': {
                itemName: 'A202',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625019493': {
                itemName: 'A202',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625019509': {
                itemName: 'A202',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625048868': {
                itemName: 'A202',
                color: 'SURSPR',
                size: 'L'
            },
        
            '8902625048851': {
                itemName: 'A202',
                color: 'SURSPR',
                size: 'M'
            },
        
            '8902625048844': {
                itemName: 'A202',
                color: 'SURSPR',
                size: 'S'
            },
        
            '8902625048875': {
                itemName: 'A202',
                color: 'SURSPR',
                size: 'XL'
            },
        
            '8902625048882': {
                itemName: 'A202',
                color: 'SURSPR',
                size: 'XXL'
            },
        
            '8902625006448': {
                itemName: 'A203',
                color: 'CHM',
                size: 'L'
            },
        
            '8902625006431': {
                itemName: 'A203',
                color: 'CHM',
                size: 'M'
            },
        
            '8902625006424': {
                itemName: 'A203',
                color: 'CHM',
                size: 'S'
            },
        
            '8902625006455': {
                itemName: 'A203',
                color: 'CHM',
                size: 'XL'
            },
        
            '8902625006462': {
                itemName: 'A203',
                color: 'CHM',
                size: 'XXL'
            },
        
            '8902625006493': {
                itemName: 'A203',
                color: 'DUSOR',
                size: 'L'
            },
        
            '8902625006486': {
                itemName: 'A203',
                color: 'DUSOR',
                size: 'M'
            },
        
            '8902625006479': {
                itemName: 'A203',
                color: 'DUSOR',
                size: 'S'
            },
        
            '8902625006509': {
                itemName: 'A203',
                color: 'DUSOR',
                size: 'XL'
            },
        
            '8902625006516': {
                itemName: 'A203',
                color: 'DUSOR',
                size: 'XXL'
            },
        
            '8902625006547': {
                itemName: 'A203',
                color: 'PASTUR',
                size: 'L'
            },
        
            '8902625006530': {
                itemName: 'A203',
                color: 'PASTUR',
                size: 'M'
            },
        
            '8902625006523': {
                itemName: 'A203',
                color: 'PASTUR',
                size: 'S'
            },
        
            '8902625006554': {
                itemName: 'A203',
                color: 'PASTUR',
                size: 'XL'
            },
        
            '8902625006561': {
                itemName: 'A203',
                color: 'PASTUR',
                size: 'XXL'
            },
        
            '8902625041395': {
                itemName: 'A204',
                color: 'MBCAOP',
                size: 'L'
            },
        
            '8902625041388': {
                itemName: 'A204',
                color: 'MBCAOP',
                size: 'M'
            },
        
            '8902625041371': {
                itemName: 'A204',
                color: 'MBCAOP',
                size: 'S'
            },
        
            '8902625041401': {
                itemName: 'A204',
                color: 'MBCAOP',
                size: 'XL'
            },
        
            '8902625041418': {
                itemName: 'A204',
                color: 'MBCAOP',
                size: 'XXL'
            },
        
            '8902625041449': {
                itemName: 'A204',
                color: 'SSAAOP',
                size: 'L'
            },
        
            '8902625041432': {
                itemName: 'A204',
                color: 'SSAAOP',
                size: 'M'
            },
        
            '8902625041425': {
                itemName: 'A204',
                color: 'SSAAOP',
                size: 'S'
            },
        
            '8902625041456': {
                itemName: 'A204',
                color: 'SSAAOP',
                size: 'XL'
            },
        
            '8902625041463': {
                itemName: 'A204',
                color: 'SSAAOP',
                size: 'XXL'
            },
        
            '8902625618801': {
                itemName: 'A301',
                color: 'ABG',
                size: 'L'
            },
        
            '8902625618818': {
                itemName: 'A301',
                color: 'ABG',
                size: 'M'
            },
        
            '8902625618825': {
                itemName: 'A301',
                color: 'ABG',
                size: 'S'
            },
        
            '8902625618832': {
                itemName: 'A301',
                color: 'ABG',
                size: 'XL'
            },
        
            '8902625618849': {
                itemName: 'A301',
                color: 'ABG',
                size: 'XXL'
            },
        
            '8902625016744': {
                itemName: 'A301',
                color: 'BRWSTG',
                size: 'L'
            },
        
            '8902625016737': {
                itemName: 'A301',
                color: 'BRWSTG',
                size: 'M'
            },
        
            '8902625016720': {
                itemName: 'A301',
                color: 'BRWSTG',
                size: 'S'
            },
        
            '8902625016751': {
                itemName: 'A301',
                color: 'BRWSTG',
                size: 'XL'
            },
        
            '8902625016768': {
                itemName: 'A301',
                color: 'BRWSTG',
                size: 'XXL'
            },
        
            '8902625600547': {
                itemName: 'A301',
                color: 'GBG',
                size: 'L'
            },
        
            '8902625600554': {
                itemName: 'A301',
                color: 'GBG',
                size: 'M'
            },
        
            '8902625600561': {
                itemName: 'A301',
                color: 'GBG',
                size: 'S'
            },
        
            '8902625600578': {
                itemName: 'A301',
                color: 'GBG',
                size: 'XL'
            },
        
            '8902625600585': {
                itemName: 'A301',
                color: 'GBG',
                size: 'XXL'
            },
        
            '8902625016799': {
                itemName: 'A301',
                color: 'MBNGUG',
                size: 'L'
            },
        
            '8902625016782': {
                itemName: 'A301',
                color: 'MBNGUG',
                size: 'M'
            },
        
            '8902625016775': {
                itemName: 'A301',
                color: 'MBNGUG',
                size: 'S'
            },
        
            '8902625016805': {
                itemName: 'A301',
                color: 'MBNGUG',
                size: 'XL'
            },
        
            '8902625016973': {
                itemName: 'A301',
                color: 'MBNGUG',
                size: 'XXL'
            },
        
            '8902625600899': {
                itemName: 'A303',
                color: 'JBSG',
                size: 'L'
            },
        
            '8902625600905': {
                itemName: 'A303',
                color: 'JBSG',
                size: 'M'
            },
        
            '8902625600912': {
                itemName: 'A303',
                color: 'JBSG',
                size: 'S'
            },
        
            '8902625600929': {
                itemName: 'A303',
                color: 'JBSG',
                size: 'XL'
            },
        
            '8902625600936': {
                itemName: 'A303',
                color: 'JBSG',
                size: 'XXL'
            },
        
            '8902625600998': {
                itemName: 'A303',
                color: 'NVYSGR',
                size: 'L'
            },
        
            '8902625601001': {
                itemName: 'A303',
                color: 'NVYSGR',
                size: 'M'
            },
        
            '8902625601018': {
                itemName: 'A303',
                color: 'NVYSGR',
                size: 'S'
            },
        
            '8902625601025': {
                itemName: 'A303',
                color: 'NVYSGR',
                size: 'XL'
            },
        
            '8902625601032': {
                itemName: 'A303',
                color: 'NVYSGR',
                size: 'XXL'
            },
        
            '8902625622433': {
                itemName: 'A304',
                color: 'DBW',
                size: 'L'
            },
        
            '8902625622440': {
                itemName: 'A304',
                color: 'DBW',
                size: 'M'
            },
        
            '8902625622457': {
                itemName: 'A304',
                color: 'DBW',
                size: 'S'
            },
        
            '8902625622464': {
                itemName: 'A304',
                color: 'DBW',
                size: 'XL'
            },
        
            '8902625622471': {
                itemName: 'A304',
                color: 'DBW',
                size: 'XXL'
            },
        
            '8902625622532': {
                itemName: 'A304',
                color: 'JBRL',
                size: 'L'
            },
        
            '8902625622549': {
                itemName: 'A304',
                color: 'JBRL',
                size: 'M'
            },
        
            '8902625622556': {
                itemName: 'A304',
                color: 'JBRL',
                size: 'S'
            },
        
            '8902625622563': {
                itemName: 'A304',
                color: 'JBRL',
                size: 'XL'
            },
        
            '8902625622570': {
                itemName: 'A304',
                color: 'JBRL',
                size: 'XXL'
            },
        
            '8902625622488': {
                itemName: 'A304',
                color: 'PSW',
                size: 'L'
            },
        
            '8902625622495': {
                itemName: 'A304',
                color: 'PSW',
                size: 'M'
            },
        
            '8902625622501': {
                itemName: 'A304',
                color: 'PSW',
                size: 'S'
            },
        
            '8902625622518': {
                itemName: 'A304',
                color: 'PSW',
                size: 'XL'
            },
        
            '8902625622525': {
                itemName: 'A304',
                color: 'PSW',
                size: 'XXL'
            },
        
            '8902625622389': {
                itemName: 'A304',
                color: 'SAW',
                size: 'L'
            },
        
            '8902625622396': {
                itemName: 'A304',
                color: 'SAW',
                size: 'M'
            },
        
            '8902625622402': {
                itemName: 'A304',
                color: 'SAW',
                size: 'S'
            },
        
            '8902625622419': {
                itemName: 'A304',
                color: 'SAW',
                size: 'XL'
            },
        
            '8902625622426': {
                itemName: 'A304',
                color: 'SAW',
                size: 'XXL'
            },
        
            '8902625825704': {
                itemName: 'A304',
                color: 'TEX',
                size: 'L'
            },
        
            '8902625825711': {
                itemName: 'A304',
                color: 'TEX',
                size: 'M'
            },
        
            '8902625825728': {
                itemName: 'A304',
                color: 'TEX',
                size: 'S'
            },
        
            '8902625825735': {
                itemName: 'A304',
                color: 'TEX',
                size: 'XL'
            },
        
            '8902625825742': {
                itemName: 'A304',
                color: 'TEX',
                size: 'XXL'
            },
        
            '8902625838797': {
                itemName: 'A306',
                color: 'CRMBG',
                size: 'L'
            },
        
            '8902625838803': {
                itemName: 'A306',
                color: 'CRMBG',
                size: 'M'
            },
        
            '8902625838810': {
                itemName: 'A306',
                color: 'CRMBG',
                size: 'S'
            },
        
            '8902625838827': {
                itemName: 'A306',
                color: 'CRMBG',
                size: 'XL'
            },
        
            '8902625838834': {
                itemName: 'A306',
                color: 'CRMBG',
                size: 'XXL'
            },
        
            '8902625622884': {
                itemName: 'A306',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625622891': {
                itemName: 'A306',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625622907': {
                itemName: 'A306',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625622914': {
                itemName: 'A306',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625622921': {
                itemName: 'A306',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625838841': {
                itemName: 'A306',
                color: 'JTBBGR',
                size: 'L'
            },
        
            '8902625838858': {
                itemName: 'A306',
                color: 'JTBBGR',
                size: 'M'
            },
        
            '8902625838865': {
                itemName: 'A306',
                color: 'JTBBGR',
                size: 'S'
            },
        
            '8902625838872': {
                itemName: 'A306',
                color: 'JTBBGR',
                size: 'XL'
            },
        
            '8902625838889': {
                itemName: 'A306',
                color: 'JTBBGR',
                size: 'XXL'
            },
        
            '8902625838940': {
                itemName: 'A306',
                color: 'MMMBG',
                size: 'L'
            },
        
            '8902625838957': {
                itemName: 'A306',
                color: 'MMMBG',
                size: 'M'
            },
        
            '8902625838964': {
                itemName: 'A306',
                color: 'MMMBG',
                size: 'S'
            },
        
            '8902625838971': {
                itemName: 'A306',
                color: 'MMMBG',
                size: 'XL'
            },
        
            '8902625838988': {
                itemName: 'A306',
                color: 'MMMBG',
                size: 'XXL'
            },
        
            '8902625622839': {
                itemName: 'A306',
                color: 'NVMEL',
                size: 'L'
            },
        
            '8902625622846': {
                itemName: 'A306',
                color: 'NVMEL',
                size: 'M'
            },
        
            '8902625622853': {
                itemName: 'A306',
                color: 'NVMEL',
                size: 'S'
            },
        
            '8902625622860': {
                itemName: 'A306',
                color: 'NVMEL',
                size: 'XL'
            },
        
            '8902625622877': {
                itemName: 'A306',
                color: 'NVMEL',
                size: 'XXL'
            },
        
            '8902625838995': {
                itemName: 'A306',
                color: 'NVMGFG',
                size: 'L'
            },
        
            '8902625839008': {
                itemName: 'A306',
                color: 'NVMGFG',
                size: 'M'
            },
        
            '8902625839015': {
                itemName: 'A306',
                color: 'NVMGFG',
                size: 'S'
            },
        
            '8902625839022': {
                itemName: 'A306',
                color: 'NVMGFG',
                size: 'XL'
            },
        
            '8902625839039': {
                itemName: 'A306',
                color: 'NVMGFG',
                size: 'XXL'
            },
        
            '8902625042194': {
                itemName: 'A309',
                color: 'BBMARG',
                size: 'L'
            },
        
            '8902625042187': {
                itemName: 'A309',
                color: 'BBMARG',
                size: 'M'
            },
        
            '8902625042170': {
                itemName: 'A309',
                color: 'BBMARG',
                size: 'S'
            },
        
            '8902625042200': {
                itemName: 'A309',
                color: 'BBMARG',
                size: 'XL'
            },
        
            '8902625042217': {
                itemName: 'A309',
                color: 'BBMARG',
                size: 'XXL'
            },
        
            '8902625839299': {
                itemName: 'A309',
                color: 'BLKMLG',
                size: 'L'
            },
        
            '8902625839305': {
                itemName: 'A309',
                color: 'BLKMLG',
                size: 'M'
            },
        
            '8902625839312': {
                itemName: 'A309',
                color: 'BLKMLG',
                size: 'S'
            },
        
            '8902625839329': {
                itemName: 'A309',
                color: 'BLKMLG',
                size: 'XL'
            },
        
            '8902625839336': {
                itemName: 'A309',
                color: 'BLKMLG',
                size: 'XXL'
            },
        
            '8902625042255': {
                itemName: 'A309',
                color: 'DOMARG',
                size: 'L'
            },
        
            '8902625042248': {
                itemName: 'A309',
                color: 'DOMARG',
                size: 'M'
            },
        
            '8902625042231': {
                itemName: 'A309',
                color: 'DOMARG',
                size: 'S'
            },
        
            '8902625042262': {
                itemName: 'A309',
                color: 'DOMARG',
                size: 'XL'
            },
        
            '8902625042279': {
                itemName: 'A309',
                color: 'DOMARG',
                size: 'XXL'
            },
        
            '8902625839343': {
                itemName: 'A309',
                color: 'NVYAR',
                size: 'L'
            },
        
            '8902625839350': {
                itemName: 'A309',
                color: 'NVYAR',
                size: 'M'
            },
        
            '8902625839367': {
                itemName: 'A309',
                color: 'NVYAR',
                size: 'S'
            },
        
            '8902625839374': {
                itemName: 'A309',
                color: 'NVYAR',
                size: 'XL'
            },
        
            '8902625839381': {
                itemName: 'A309',
                color: 'NVYAR',
                size: 'XXL'
            },
        
            '8902625042316': {
                itemName: 'A309',
                color: 'OLMAR',
                size: 'L'
            },
        
            '8902625042309': {
                itemName: 'A309',
                color: 'OLMAR',
                size: 'M'
            },
        
            '8902625042293': {
                itemName: 'A309',
                color: 'OLMAR',
                size: 'S'
            },
        
            '8902625042323': {
                itemName: 'A309',
                color: 'OLMAR',
                size: 'XL'
            },
        
            '8902625042330': {
                itemName: 'A309',
                color: 'OLMAR',
                size: 'XXL'
            },
        
            '8902625006981': {
                itemName: 'A310',
                color: 'CHM',
                size: 'L'
            },
        
            '8902625006974': {
                itemName: 'A310',
                color: 'CHM',
                size: 'M'
            },
        
            '8902625006967': {
                itemName: 'A310',
                color: 'CHM',
                size: 'S'
            },
        
            '8902625006998': {
                itemName: 'A310',
                color: 'CHM',
                size: 'XL'
            },
        
            '8902625007001': {
                itemName: 'A310',
                color: 'CHM',
                size: 'XXL'
            },
        
            '8902625042361': {
                itemName: 'A310',
                color: 'LVML',
                size: 'L'
            },
        
            '8902625042354': {
                itemName: 'A310',
                color: 'LVML',
                size: 'M'
            },
        
            '8902625042347': {
                itemName: 'A310',
                color: 'LVML',
                size: 'S'
            },
        
            '8902625042378': {
                itemName: 'A310',
                color: 'LVML',
                size: 'XL'
            },
        
            '8902625042385': {
                itemName: 'A310',
                color: 'LVML',
                size: 'XXL'
            },
        
            '8902625042460': {
                itemName: 'A310',
                color: 'NVMEL',
                size: 'L'
            },
        
            '8902625042453': {
                itemName: 'A310',
                color: 'NVMEL',
                size: 'M'
            },
        
            '8902625042446': {
                itemName: 'A310',
                color: 'NVMEL',
                size: 'S'
            },
        
            '8902625042477': {
                itemName: 'A310',
                color: 'NVMEL',
                size: 'XL'
            },
        
            '8902625042484': {
                itemName: 'A310',
                color: 'NVMEL',
                size: 'XXL'
            },
        
            '8902625042415': {
                itemName: 'A310',
                color: 'OLVMEL',
                size: 'L'
            },
        
            '8902625042408': {
                itemName: 'A310',
                color: 'OLVMEL',
                size: 'M'
            },
        
            '8902625042392': {
                itemName: 'A310',
                color: 'OLVMEL',
                size: 'S'
            },
        
            '8902625042422': {
                itemName: 'A310',
                color: 'OLVMEL',
                size: 'XL'
            },
        
            '8902625042439': {
                itemName: 'A310',
                color: 'OLVMEL',
                size: 'XXL'
            },
        
            '8902625042668': {
                itemName: 'A311',
                color: 'JBFEGR',
                size: 'L'
            },
        
            '8902625042651': {
                itemName: 'A311',
                color: 'JBFEGR',
                size: 'M'
            },
        
            '8902625042644': {
                itemName: 'A311',
                color: 'JBFEGR',
                size: 'S'
            },
        
            '8902625042675': {
                itemName: 'A311',
                color: 'JBFEGR',
                size: 'XL'
            },
        
            '8902625042682': {
                itemName: 'A311',
                color: 'JBFEGR',
                size: 'XXL'
            },
        
            '8902625042514': {
                itemName: 'A311',
                color: 'LVCAGR',
                size: 'L'
            },
        
            '8902625042507': {
                itemName: 'A311',
                color: 'LVCAGR',
                size: 'M'
            },
        
            '8902625042491': {
                itemName: 'A311',
                color: 'LVCAGR',
                size: 'S'
            },
        
            '8902625042521': {
                itemName: 'A311',
                color: 'LVCAGR',
                size: 'XL'
            },
        
            '8902625042538': {
                itemName: 'A311',
                color: 'LVCAGR',
                size: 'XXL'
            },
        
            '8902625042613': {
                itemName: 'A311',
                color: 'PPFEGR',
                size: 'L'
            },
        
            '8902625042606': {
                itemName: 'A311',
                color: 'PPFEGR',
                size: 'M'
            },
        
            '8902625042590': {
                itemName: 'A311',
                color: 'PPFEGR',
                size: 'S'
            },
        
            '8902625042620': {
                itemName: 'A311',
                color: 'PPFEGR',
                size: 'XL'
            },
        
            '8902625042637': {
                itemName: 'A311',
                color: 'PPFEGR',
                size: 'XXL'
            },
        
            '8902625042569': {
                itemName: 'A311',
                color: 'SSCAGR',
                size: 'L'
            },
        
            '8902625042552': {
                itemName: 'A311',
                color: 'SSCAGR',
                size: 'M'
            },
        
            '8902625042545': {
                itemName: 'A311',
                color: 'SSCAGR',
                size: 'S'
            },
        
            '8902625042576': {
                itemName: 'A311',
                color: 'SSCAGR',
                size: 'XL'
            },
        
            '8902625042583': {
                itemName: 'A311',
                color: 'SSCAGR',
                size: 'XXL'
            },
        
            '8902625042811': {
                itemName: 'A312',
                color: 'DUSOR',
                size: 'L'
            },
        
            '8902625042804': {
                itemName: 'A312',
                color: 'DUSOR',
                size: 'M'
            },
        
            '8902625042798': {
                itemName: 'A312',
                color: 'DUSOR',
                size: 'S'
            },
        
            '8902625042828': {
                itemName: 'A312',
                color: 'DUSOR',
                size: 'XL'
            },
        
            '8902625042835': {
                itemName: 'A312',
                color: 'DUSOR',
                size: 'XXL'
            },
        
            '8902625042866': {
                itemName: 'A312',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625042859': {
                itemName: 'A312',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625042842': {
                itemName: 'A312',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625042873': {
                itemName: 'A312',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625042880': {
                itemName: 'A312',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625042712': {
                itemName: 'A312',
                color: 'ROUGE',
                size: 'L'
            },
        
            '8902625042705': {
                itemName: 'A312',
                color: 'ROUGE',
                size: 'M'
            },
        
            '8902625042699': {
                itemName: 'A312',
                color: 'ROUGE',
                size: 'S'
            },
        
            '8902625042729': {
                itemName: 'A312',
                color: 'ROUGE',
                size: 'XL'
            },
        
            '8902625042736': {
                itemName: 'A312',
                color: 'ROUGE',
                size: 'XXL'
            },
        
            '8902625042767': {
                itemName: 'A312',
                color: 'TRDWIN',
                size: 'L'
            },
        
            '8902625042750': {
                itemName: 'A312',
                color: 'TRDWIN',
                size: 'M'
            },
        
            '8902625042743': {
                itemName: 'A312',
                color: 'TRDWIN',
                size: 'S'
            },
        
            '8902625042774': {
                itemName: 'A312',
                color: 'TRDWIN',
                size: 'XL'
            },
        
            '8902625042781': {
                itemName: 'A312',
                color: 'TRDWIN',
                size: 'XXL'
            },
        
            '8902625621832': {
                itemName: 'A401',
                color: 'DYB',
                size: 'L'
            },
        
            '8902625621849': {
                itemName: 'A401',
                color: 'DYB',
                size: 'M'
            },
        
            '8902625621856': {
                itemName: 'A401',
                color: 'DYB',
                size: 'S'
            },
        
            '8902625621863': {
                itemName: 'A401',
                color: 'DYB',
                size: 'XL'
            },
        
            '8902625621870': {
                itemName: 'A401',
                color: 'DYB',
                size: 'XXL'
            },
        
            '8902625821027': {
                itemName: 'A401',
                color: 'GRKBLU',
                size: 'L'
            },
        
            '8902625821034': {
                itemName: 'A401',
                color: 'GRKBLU',
                size: 'M'
            },
        
            '8902625821041': {
                itemName: 'A401',
                color: 'GRKBLU',
                size: 'S'
            },
        
            '8902625821058': {
                itemName: 'A401',
                color: 'GRKBLU',
                size: 'XL'
            },
        
            '8902625821065': {
                itemName: 'A401',
                color: 'GRKBLU',
                size: 'XXL'
            },
        
            '8902625821171': {
                itemName: 'A401',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625821188': {
                itemName: 'A401',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625821195': {
                itemName: 'A401',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625821201': {
                itemName: 'A401',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625821218': {
                itemName: 'A401',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625621887': {
                itemName: 'A401',
                color: 'TGN',
                size: 'L'
            },
        
            '8902625621894': {
                itemName: 'A401',
                color: 'TGN',
                size: 'M'
            },
        
            '8902625621900': {
                itemName: 'A401',
                color: 'TGN',
                size: 'S'
            },
        
            '8902625621917': {
                itemName: 'A401',
                color: 'TGN',
                size: 'XL'
            },
        
            '8902625621924': {
                itemName: 'A401',
                color: 'TGN',
                size: 'XXL'
            },
        
            '8902625049179': {
                itemName: 'A402',
                color: 'CHOCOF',
                size: 'L'
            },
        
            '8902625049162': {
                itemName: 'A402',
                color: 'CHOCOF',
                size: 'M'
            },
        
            '8902625049155': {
                itemName: 'A402',
                color: 'CHOCOF',
                size: 'S'
            },
        
            '8902625049186': {
                itemName: 'A402',
                color: 'CHOCOF',
                size: 'XL'
            },
        
            '8902625049193': {
                itemName: 'A402',
                color: 'CHOCOF',
                size: 'XXL'
            },
        
            '8902625049223': {
                itemName: 'A402',
                color: 'CSTR',
                size: 'L'
            },
        
            '8902625049216': {
                itemName: 'A402',
                color: 'CSTR',
                size: 'M'
            },
        
            '8902625049209': {
                itemName: 'A402',
                color: 'CSTR',
                size: 'S'
            },
        
            '8902625049230': {
                itemName: 'A402',
                color: 'CSTR',
                size: 'XL'
            },
        
            '8902625037817': {
                itemName: 'A402',
                color: 'CSTR',
                size: 'XXL'
            },
        
            '8902625007322': {
                itemName: 'A402',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625007315': {
                itemName: 'A402',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625007308': {
                itemName: 'A402',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625007339': {
                itemName: 'A402',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625007346': {
                itemName: 'A402',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625007377': {
                itemName: 'A402',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625007360': {
                itemName: 'A402',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625007353': {
                itemName: 'A402',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625007384': {
                itemName: 'A402',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625007414': {
                itemName: 'A402',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625022363': {
                itemName: 'A402',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625022356': {
                itemName: 'A402',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625022349': {
                itemName: 'A402',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625022370': {
                itemName: 'A402',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625022387': {
                itemName: 'A402',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625022264': {
                itemName: 'A402',
                color: 'ROUGE',
                size: 'L'
            },
        
            '8902625022257': {
                itemName: 'A402',
                color: 'ROUGE',
                size: 'M'
            },
        
            '8902625022240': {
                itemName: 'A402',
                color: 'ROUGE',
                size: 'S'
            },
        
            '8902625022271': {
                itemName: 'A402',
                color: 'ROUGE',
                size: 'XL'
            },
        
            '8902625022288': {
                itemName: 'A402',
                color: 'ROUGE',
                size: 'XXL'
            },
        
            '8902625044396': {
                itemName: 'A404',
                color: 'BBELL',
                size: 'L'
            },
        
            '8902625044389': {
                itemName: 'A404',
                color: 'BBELL',
                size: 'M'
            },
        
            '8902625044372': {
                itemName: 'A404',
                color: 'BBELL',
                size: 'S'
            },
        
            '8902625044402': {
                itemName: 'A404',
                color: 'BBELL',
                size: 'XL'
            },
        
            '8902625044419': {
                itemName: 'A404',
                color: 'BBELL',
                size: 'XXL'
            },
        
            '8902625044440': {
                itemName: 'A404',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625044433': {
                itemName: 'A404',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625044426': {
                itemName: 'A404',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625044457': {
                itemName: 'A404',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625044464': {
                itemName: 'A404',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625044341': {
                itemName: 'A404',
                color: 'ROUGE',
                size: 'L'
            },
        
            '8902625044334': {
                itemName: 'A404',
                color: 'ROUGE',
                size: 'M'
            },
        
            '8902625044327': {
                itemName: 'A404',
                color: 'ROUGE',
                size: 'S'
            },
        
            '8902625044358': {
                itemName: 'A404',
                color: 'ROUGE',
                size: 'XL'
            },
        
            '8902625044365': {
                itemName: 'A404',
                color: 'ROUGE',
                size: 'XXL'
            },
        
            '8902625044297': {
                itemName: 'A404',
                color: 'SURSPR',
                size: 'L'
            },
        
            '8902625044280': {
                itemName: 'A404',
                color: 'SURSPR',
                size: 'M'
            },
        
            '8902625044273': {
                itemName: 'A404',
                color: 'SURSPR',
                size: 'S'
            },
        
            '8902625044303': {
                itemName: 'A404',
                color: 'SURSPR',
                size: 'XL'
            },
        
            '8902625044310': {
                itemName: 'A404',
                color: 'SURSPR',
                size: 'XXL'
            },
        
            '8902625049124': {
                itemName: 'A406',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625049117': {
                itemName: 'A406',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625049100': {
                itemName: 'A406',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625049131': {
                itemName: 'A406',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625049148': {
                itemName: 'A406',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625050427': {
                itemName: 'A406',
                color: 'OLIVE',
                size: 'L'
            },
        
            '8902625050410': {
                itemName: 'A406',
                color: 'OLIVE',
                size: 'M'
            },
        
            '8902625050403': {
                itemName: 'A406',
                color: 'OLIVE',
                size: 'S'
            },
        
            '8902625050434': {
                itemName: 'A406',
                color: 'OLIVE',
                size: 'XL'
            },
        
            '8902625050441': {
                itemName: 'A406',
                color: 'OLIVE',
                size: 'XXL'
            },
        
            '8902625050472': {
                itemName: 'A406',
                color: 'PURHAZ',
                size: 'L'
            },
        
            '8902625050465': {
                itemName: 'A406',
                color: 'PURHAZ',
                size: 'M'
            },
        
            '8902625050458': {
                itemName: 'A406',
                color: 'PURHAZ',
                size: 'S'
            },
        
            '8902625050489': {
                itemName: 'A406',
                color: 'PURHAZ',
                size: 'XL'
            },
        
            '8902625049094': {
                itemName: 'A406',
                color: 'PURHAZ',
                size: 'XXL'
            },
        
            '8902625622334': {
                itemName: 'A601',
                color: 'DYB',
                size: 'L'
            },
        
            '8902625622341': {
                itemName: 'A601',
                color: 'DYB',
                size: 'M'
            },
        
            '8902625622358': {
                itemName: 'A601',
                color: 'DYB',
                size: 'S'
            },
        
            '8902625622365': {
                itemName: 'A601',
                color: 'DYB',
                size: 'XL'
            },
        
            '8902625622372': {
                itemName: 'A601',
                color: 'DYB',
                size: 'XXL'
            },
        
            '8902625821379': {
                itemName: 'A601',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625821386': {
                itemName: 'A601',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625821393': {
                itemName: 'A601',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625821409': {
                itemName: 'A601',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625821416': {
                itemName: 'A601',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625623133': {
                itemName: 'A602',
                color: 'DBS',
                size: 'L'
            },
        
            '8902625623140': {
                itemName: 'A602',
                color: 'DBS',
                size: 'M'
            },
        
            '8902625623157': {
                itemName: 'A602',
                color: 'DBS',
                size: 'S'
            },
        
            '8902625623164': {
                itemName: 'A602',
                color: 'DBS',
                size: 'XL'
            },
        
            '8902625623171': {
                itemName: 'A602',
                color: 'DBS',
                size: 'XXL'
            },
        
            '8902625839541': {
                itemName: 'A602',
                color: 'DTSSTP',
                size: 'L'
            },
        
            '8902625839558': {
                itemName: 'A602',
                color: 'DTSSTP',
                size: 'M'
            },
        
            '8902625839565': {
                itemName: 'A602',
                color: 'DTSSTP',
                size: 'S'
            },
        
            '8902625839572': {
                itemName: 'A602',
                color: 'DTSSTP',
                size: 'XL'
            },
        
            '8902625839589': {
                itemName: 'A602',
                color: 'DTSSTP',
                size: 'XXL'
            },
        
            '8902625623232': {
                itemName: 'A602',
                color: 'JBSS',
                size: 'L'
            },
        
            '8902625623249': {
                itemName: 'A602',
                color: 'JBSS',
                size: 'M'
            },
        
            '8902625623256': {
                itemName: 'A602',
                color: 'JBSS',
                size: 'S'
            },
        
            '8902625623263': {
                itemName: 'A602',
                color: 'JBSS',
                size: 'XL'
            },
        
            '8902625623270': {
                itemName: 'A602',
                color: 'JBSS',
                size: 'XXL'
            },
        
            '8902625623188': {
                itemName: 'A602',
                color: 'ONSSTR',
                size: 'L'
            },
        
            '8902625623195': {
                itemName: 'A602',
                color: 'ONSSTR',
                size: 'M'
            },
        
            '8902625623201': {
                itemName: 'A602',
                color: 'ONSSTR',
                size: 'S'
            },
        
            '8902625623218': {
                itemName: 'A602',
                color: 'ONSSTR',
                size: 'XL'
            },
        
            '8902625623225': {
                itemName: 'A602',
                color: 'ONSSTR',
                size: 'XXL'
            },
        
            '8902625623287': {
                itemName: 'A603',
                color: 'DYB',
                size: 'L'
            },
        
            '8902625623294': {
                itemName: 'A603',
                color: 'DYB',
                size: 'M'
            },
        
            '8902625623300': {
                itemName: 'A603',
                color: 'DYB',
                size: 'S'
            },
        
            '8902625623317': {
                itemName: 'A603',
                color: 'DYB',
                size: 'XL'
            },
        
            '8902625623324': {
                itemName: 'A603',
                color: 'DYB',
                size: 'XXL'
            },
        
            '8902625623386': {
                itemName: 'A603',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625623393': {
                itemName: 'A603',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625623409': {
                itemName: 'A603',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625623416': {
                itemName: 'A603',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625623423': {
                itemName: 'A603',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625007988': {
                itemName: 'A604',
                color: 'CHM',
                size: 'L'
            },
        
            '8902625007971': {
                itemName: 'A604',
                color: 'CHM',
                size: 'M'
            },
        
            '8902625007964': {
                itemName: 'A604',
                color: 'CHM',
                size: 'S'
            },
        
            '8902625007995': {
                itemName: 'A604',
                color: 'CHM',
                size: 'XL'
            },
        
            '8902625008008': {
                itemName: 'A604',
                color: 'CHM',
                size: 'XXL'
            },
        
            '8902625008084': {
                itemName: 'A604',
                color: 'PASTUR',
                size: 'L'
            },
        
            '8902625008077': {
                itemName: 'A604',
                color: 'PASTUR',
                size: 'M'
            },
        
            '8902625008060': {
                itemName: 'A604',
                color: 'PASTUR',
                size: 'S'
            },
        
            '8902625008091': {
                itemName: 'A604',
                color: 'PASTUR',
                size: 'XL'
            },
        
            '8902625008107': {
                itemName: 'A604',
                color: 'PASTUR',
                size: 'XXL'
            },
        
            '8902625044181': {
                itemName: 'A605',
                color: 'CSTR',
                size: 'L'
            },
        
            '8902625044174': {
                itemName: 'A605',
                color: 'CSTR',
                size: 'M'
            },
        
            '8902625044167': {
                itemName: 'A605',
                color: 'CSTR',
                size: 'S'
            },
        
            '8902625044198': {
                itemName: 'A605',
                color: 'CSTR',
                size: 'XL'
            },
        
            '8902625044150': {
                itemName: 'A605',
                color: 'CSTR',
                size: 'XS'
            },
        
            '8902625044204': {
                itemName: 'A605',
                color: 'CSTR',
                size: 'XXL'
            },
        
            '8902625008145': {
                itemName: 'A605',
                color: 'DUSOR',
                size: 'L'
            },
        
            '8902625008138': {
                itemName: 'A605',
                color: 'DUSOR',
                size: 'M'
            },
        
            '8902625008121': {
                itemName: 'A605',
                color: 'DUSOR',
                size: 'S'
            },
        
            '8902625008152': {
                itemName: 'A605',
                color: 'DUSOR',
                size: 'XL'
            },
        
            '8902625008114': {
                itemName: 'A605',
                color: 'DUSOR',
                size: 'XS'
            },
        
            '8902625008169': {
                itemName: 'A605',
                color: 'DUSOR',
                size: 'XXL'
            },
        
            '8902625044242': {
                itemName: 'A605',
                color: 'DYB',
                size: 'L'
            },
        
            '8902625044235': {
                itemName: 'A605',
                color: 'DYB',
                size: 'M'
            },
        
            '8902625044228': {
                itemName: 'A605',
                color: 'DYB',
                size: 'S'
            },
        
            '8902625044259': {
                itemName: 'A605',
                color: 'DYB',
                size: 'XL'
            },
        
            '8902625044211': {
                itemName: 'A605',
                color: 'DYB',
                size: 'XS'
            },
        
            '8902625044266': {
                itemName: 'A605',
                color: 'DYB',
                size: 'XXL'
            },
        
            '8902625008206': {
                itemName: 'A605',
                color: 'GOBBLU',
                size: 'L'
            },
        
            '8902625008190': {
                itemName: 'A605',
                color: 'GOBBLU',
                size: 'M'
            },
        
            '8902625008183': {
                itemName: 'A605',
                color: 'GOBBLU',
                size: 'S'
            },
        
            '8902625008213': {
                itemName: 'A605',
                color: 'GOBBLU',
                size: 'XL'
            },
        
            '8902625008176': {
                itemName: 'A605',
                color: 'GOBBLU',
                size: 'XS'
            },
        
            '8902625008220': {
                itemName: 'A605',
                color: 'GOBBLU',
                size: 'XXL'
            },
        
            '8902625022806': {
                itemName: 'A605',
                color: 'GULGRE',
                size: 'L'
            },
        
            '8902625022790': {
                itemName: 'A605',
                color: 'GULGRE',
                size: 'M'
            },
        
            '8902625022783': {
                itemName: 'A605',
                color: 'GULGRE',
                size: 'S'
            },
        
            '8902625022813': {
                itemName: 'A605',
                color: 'GULGRE',
                size: 'XL'
            },
        
            '8902625022776': {
                itemName: 'A605',
                color: 'GULGRE',
                size: 'XS'
            },
        
            '8902625022820': {
                itemName: 'A605',
                color: 'GULGRE',
                size: 'XXL'
            },
        
            '8902625008268': {
                itemName: 'A605',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625008251': {
                itemName: 'A605',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625008244': {
                itemName: 'A605',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625008275': {
                itemName: 'A605',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625008237': {
                itemName: 'A605',
                color: 'JETBLK',
                size: 'XS'
            },
        
            '8902625008282': {
                itemName: 'A605',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625049278': {
                itemName: 'A605',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625049261': {
                itemName: 'A605',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625049254': {
                itemName: 'A605',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625049285': {
                itemName: 'A605',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625049247': {
                itemName: 'A605',
                color: 'NAVY',
                size: 'XS'
            },
        
            '8902625049292': {
                itemName: 'A605',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625022745': {
                itemName: 'A605',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625022738': {
                itemName: 'A605',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625022721': {
                itemName: 'A605',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625022752': {
                itemName: 'A605',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625022714': {
                itemName: 'A605',
                color: 'OLVNT',
                size: 'XS'
            },
        
            '8902625022769': {
                itemName: 'A605',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625043511': {
                itemName: 'A607',
                color: 'MBCAOP',
                size: 'L'
            },
        
            '8902625043504': {
                itemName: 'A607',
                color: 'MBCAOP',
                size: 'M'
            },
        
            '8902625043498': {
                itemName: 'A607',
                color: 'MBCAOP',
                size: 'S'
            },
        
            '8902625043528': {
                itemName: 'A607',
                color: 'MBCAOP',
                size: 'XL'
            },
        
            '8902625043535': {
                itemName: 'A607',
                color: 'MBCAOP',
                size: 'XXL'
            },
        
            '8902625043566': {
                itemName: 'A607',
                color: 'SSAAOP',
                size: 'L'
            },
        
            '8902625043559': {
                itemName: 'A607',
                color: 'SSAAOP',
                size: 'M'
            },
        
            '8902625043542': {
                itemName: 'A607',
                color: 'SSAAOP',
                size: 'S'
            },
        
            '8902625043573': {
                itemName: 'A607',
                color: 'SSAAOP',
                size: 'XL'
            },
        
            '8902625043580': {
                itemName: 'A607',
                color: 'SSAAOP',
                size: 'XXL'
            },
        
            '8902625043610': {
                itemName: 'A609',
                color: 'BSDMEL',
                size: 'L'
            },
        
            '8902625043603': {
                itemName: 'A609',
                color: 'BSDMEL',
                size: 'M'
            },
        
            '8902625043597': {
                itemName: 'A609',
                color: 'BSDMEL',
                size: 'S'
            },
        
            '8902625043627': {
                itemName: 'A609',
                color: 'BSDMEL',
                size: 'XL'
            },
        
            '8902625043634': {
                itemName: 'A609',
                color: 'BSDMEL',
                size: 'XXL'
            },
        
            '8902625043665': {
                itemName: 'A609',
                color: 'IPSDML',
                size: 'L'
            },
        
            '8902625043658': {
                itemName: 'A609',
                color: 'IPSDML',
                size: 'M'
            },
        
            '8902625043641': {
                itemName: 'A609',
                color: 'IPSDML',
                size: 'S'
            },
        
            '8902625043672': {
                itemName: 'A609',
                color: 'IPSDML',
                size: 'XL'
            },
        
            '8902625043689': {
                itemName: 'A609',
                color: 'IPSDML',
                size: 'XXL'
            },
        
            '8902625043719': {
                itemName: 'A609',
                color: 'RFSDML',
                size: 'L'
            },
        
            '8902625043702': {
                itemName: 'A609',
                color: 'RFSDML',
                size: 'M'
            },
        
            '8902625043696': {
                itemName: 'A609',
                color: 'RFSDML',
                size: 'S'
            },
        
            '8902625043726': {
                itemName: 'A609',
                color: 'RFSDML',
                size: 'XL'
            },
        
            '8902625043733': {
                itemName: 'A609',
                color: 'RFSDML',
                size: 'XXL'
            },
        
            '8902625019783': {
                itemName: 'A704',
                color: 'BLKMEL',
                size: 'L'
            },
        
            '8902625019776': {
                itemName: 'A704',
                color: 'BLKMEL',
                size: 'M'
            },
        
            '8902625019769': {
                itemName: 'A704',
                color: 'BLKMEL',
                size: 'S'
            },
        
            '8902625019790': {
                itemName: 'A704',
                color: 'BLKMEL',
                size: 'XL'
            },
        
            '8902625019806': {
                itemName: 'A704',
                color: 'BLKMEL',
                size: 'XXL'
            },
        
            '8902625835413': {
                itemName: 'A704',
                color: 'NVMEL',
                size: 'L'
            },
        
            '8902625835420': {
                itemName: 'A704',
                color: 'NVMEL',
                size: 'M'
            },
        
            '8902625835437': {
                itemName: 'A704',
                color: 'NVMEL',
                size: 'S'
            },
        
            '8902625835444': {
                itemName: 'A704',
                color: 'NVMEL',
                size: 'XL'
            },
        
            '8902625835451': {
                itemName: 'A704',
                color: 'NVMEL',
                size: 'XXL'
            },
        
            '8902625622280': {
                itemName: 'A901',
                color: 'DYB',
                size: 'L'
            },
        
            '8902625622297': {
                itemName: 'A901',
                color: 'DYB',
                size: 'M'
            },
        
            '8902625622303': {
                itemName: 'A901',
                color: 'DYB',
                size: 'S'
            },
        
            '8902625622310': {
                itemName: 'A901',
                color: 'DYB',
                size: 'XL'
            },
        
            '8902625622327': {
                itemName: 'A901',
                color: 'DYB',
                size: 'XXL'
            },
        
            '8902625821676': {
                itemName: 'A901',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625821683': {
                itemName: 'A901',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625821690': {
                itemName: 'A901',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625821706': {
                itemName: 'A901',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625821713': {
                itemName: 'A901',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625821720': {
                itemName: 'A901',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625821737': {
                itemName: 'A901',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625821744': {
                itemName: 'A901',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625821751': {
                itemName: 'A901',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625821768': {
                itemName: 'A901',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625821775': {
                itemName: 'A901',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625821782': {
                itemName: 'A901',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625821799': {
                itemName: 'A901',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625821805': {
                itemName: 'A901',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625821812': {
                itemName: 'A901',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625009944': {
                itemName: 'A903',
                color: 'BBDAPR',
                size: 'L'
            },
        
            '8902625009937': {
                itemName: 'A903',
                color: 'BBDAPR',
                size: 'M'
            },
        
            '8902625009920': {
                itemName: 'A903',
                color: 'BBDAPR',
                size: 'S'
            },
        
            '8902625009968': {
                itemName: 'A903',
                color: 'BBDAPR',
                size: 'XL'
            },
        
            '8902625009975': {
                itemName: 'A903',
                color: 'BBDAPR',
                size: 'XXL'
            },
        
            '8902625010001': {
                itemName: 'A903',
                color: 'CMG',
                size: 'L'
            },
        
            '8902625009999': {
                itemName: 'A903',
                color: 'CMG',
                size: 'M'
            },
        
            '8902625009982': {
                itemName: 'A903',
                color: 'CMG',
                size: 'S'
            },
        
            '8902625010018': {
                itemName: 'A903',
                color: 'CMG',
                size: 'XL'
            },
        
            '8902625010025': {
                itemName: 'A903',
                color: 'CMG',
                size: 'XXL'
            },
        
            '8902625619587': {
                itemName: 'A903',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625619594': {
                itemName: 'A903',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625619600': {
                itemName: 'A903',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625619617': {
                itemName: 'A903',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625619624': {
                itemName: 'A903',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625010063': {
                itemName: 'A903',
                color: 'MEGRME',
                size: 'L'
            },
        
            '8902625010056': {
                itemName: 'A903',
                color: 'MEGRME',
                size: 'M'
            },
        
            '8902625010049': {
                itemName: 'A903',
                color: 'MEGRME',
                size: 'S'
            },
        
            '8902625010070': {
                itemName: 'A903',
                color: 'MEGRME',
                size: 'XL'
            },
        
            '8902625010087': {
                itemName: 'A903',
                color: 'MEGRME',
                size: 'XXL'
            },
        
            '8902625619631': {
                itemName: 'A903',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625619648': {
                itemName: 'A903',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625619655': {
                itemName: 'A903',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625619662': {
                itemName: 'A903',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625619679': {
                itemName: 'A903',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625619686': {
                itemName: 'A903',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625619693': {
                itemName: 'A903',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625619709': {
                itemName: 'A903',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625619716': {
                itemName: 'A903',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625619723': {
                itemName: 'A903',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625619730': {
                itemName: 'A903',
                color: 'OMM',
                size: 'L'
            },
        
            '8902625619747': {
                itemName: 'A903',
                color: 'OMM',
                size: 'M'
            },
        
            '8902625619754': {
                itemName: 'A903',
                color: 'OMM',
                size: 'S'
            },
        
            '8902625619761': {
                itemName: 'A903',
                color: 'OMM',
                size: 'XL'
            },
        
            '8902625619778': {
                itemName: 'A903',
                color: 'OMM',
                size: 'XXL'
            },
        
            '8902625043016': {
                itemName: 'A905',
                color: 'BLBMGR',
                size: 'L'
            },
        
            '8902625043009': {
                itemName: 'A905',
                color: 'BLBMGR',
                size: 'M'
            },
        
            '8902625042996': {
                itemName: 'A905',
                color: 'BLBMGR',
                size: 'S'
            },
        
            '8902625043023': {
                itemName: 'A905',
                color: 'BLBMGR',
                size: 'XL'
            },
        
            '8902625043030': {
                itemName: 'A905',
                color: 'BLBMGR',
                size: 'XXL'
            },
        
            '8902625043061': {
                itemName: 'A905',
                color: 'JBSUGR',
                size: 'L'
            },
        
            '8902625043054': {
                itemName: 'A905',
                color: 'JBSUGR',
                size: 'M'
            },
        
            '8902625043047': {
                itemName: 'A905',
                color: 'JBSUGR',
                size: 'S'
            },
        
            '8902625043078': {
                itemName: 'A905',
                color: 'JBSUGR',
                size: 'XL'
            },
        
            '8902625043085': {
                itemName: 'A905',
                color: 'JBSUGR',
                size: 'XXL'
            },
        
            '8902625042965': {
                itemName: 'A905',
                color: 'ROSUGR',
                size: 'L'
            },
        
            '8902625042958': {
                itemName: 'A905',
                color: 'ROSUGR',
                size: 'M'
            },
        
            '8902625042941': {
                itemName: 'A905',
                color: 'ROSUGR',
                size: 'S'
            },
        
            '8902625042972': {
                itemName: 'A905',
                color: 'ROSUGR',
                size: 'XL'
            },
        
            '8902625042989': {
                itemName: 'A905',
                color: 'ROSUGR',
                size: 'XXL'
            },
        
            '8902625042910': {
                itemName: 'A905',
                color: 'SUSMGR',
                size: 'L'
            },
        
            '8902625042903': {
                itemName: 'A905',
                color: 'SUSMGR',
                size: 'M'
            },
        
            '8902625042897': {
                itemName: 'A905',
                color: 'SUSMGR',
                size: 'S'
            },
        
            '8902625042927': {
                itemName: 'A905',
                color: 'SUSMGR',
                size: 'XL'
            },
        
            '8902625042934': {
                itemName: 'A905',
                color: 'SUSMGR',
                size: 'XXL'
            },
        
            '8902625048806': {
                itemName: 'A906',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625048790': {
                itemName: 'A906',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625048783': {
                itemName: 'A906',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625048813': {
                itemName: 'A906',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625048820': {
                itemName: 'A906',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625048707': {
                itemName: 'A906',
                color: 'OLIVE',
                size: 'L'
            },
        
            '8902625048691': {
                itemName: 'A906',
                color: 'OLIVE',
                size: 'M'
            },
        
            '8902625048684': {
                itemName: 'A906',
                color: 'OLIVE',
                size: 'S'
            },
        
            '8902625048714': {
                itemName: 'A906',
                color: 'OLIVE',
                size: 'XL'
            },
        
            '8902625048721': {
                itemName: 'A906',
                color: 'OLIVE',
                size: 'XXL'
            },
        
            '8902625048752': {
                itemName: 'A906',
                color: 'PURHAZ',
                size: 'L'
            },
        
            '8902625048745': {
                itemName: 'A906',
                color: 'PURHAZ',
                size: 'M'
            },
        
            '8902625048738': {
                itemName: 'A906',
                color: 'PURHAZ',
                size: 'S'
            },
        
            '8902625048769': {
                itemName: 'A906',
                color: 'PURHAZ',
                size: 'XL'
            },
        
            '8902625048776': {
                itemName: 'A906',
                color: 'PURHAZ',
                size: 'XXL'
            },
        
            '8902625822826': {
                itemName: 'E014',
                color: 'ARMGRN',
                size: 'L'
            },
        
            '8902625822833': {
                itemName: 'E014',
                color: 'ARMGRN',
                size: 'M'
            },
        
            '8902625822840': {
                itemName: 'E014',
                color: 'ARMGRN',
                size: 'S'
            },
        
            '8902625822857': {
                itemName: 'E014',
                color: 'ARMGRN',
                size: 'XL'
            },
        
            '8902625822864': {
                itemName: 'E014',
                color: 'ARMGRN',
                size: 'XXL'
            },
        
            '8902625099938': {
                itemName: 'E014',
                color: 'CCM',
                size: 'L'
            },
        
            '8902625099945': {
                itemName: 'E014',
                color: 'CCM',
                size: 'M'
            },
        
            '8902625099952': {
                itemName: 'E014',
                color: 'CCM',
                size: 'S'
            },
        
            '8902625099969': {
                itemName: 'E014',
                color: 'CCM',
                size: 'XL'
            },
        
            '8902625099976': {
                itemName: 'E014',
                color: 'CCM',
                size: 'XXL'
            },
        
            '8902625047908': {
                itemName: 'E014',
                color: 'CSTR',
                size: 'L'
            },
        
            '8902625047892': {
                itemName: 'E014',
                color: 'CSTR',
                size: 'M'
            },
        
            '8902625047885': {
                itemName: 'E014',
                color: 'CSTR',
                size: 'S'
            },
        
            '8902625047915': {
                itemName: 'E014',
                color: 'CSTR',
                size: 'XL'
            },
        
            '8902625047922': {
                itemName: 'E014',
                color: 'CSTR',
                size: 'XXL'
            },
        
            '8902625021618': {
                itemName: 'E014',
                color: 'DULFOR',
                size: 'L'
            },
        
            '8902625021601': {
                itemName: 'E014',
                color: 'DULFOR',
                size: 'M'
            },
        
            '8902625021595': {
                itemName: 'E014',
                color: 'DULFOR',
                size: 'S'
            },
        
            '8902625021625': {
                itemName: 'E014',
                color: 'DULFOR',
                size: 'XL'
            },
        
            '8902625021632': {
                itemName: 'E014',
                color: 'DULFOR',
                size: 'XXL'
            },
        
            '8902625049322': {
                itemName: 'E014',
                color: 'DUSOR',
                size: 'L'
            },
        
            '8902625049315': {
                itemName: 'E014',
                color: 'DUSOR',
                size: 'M'
            },
        
            '8902625049308': {
                itemName: 'E014',
                color: 'DUSOR',
                size: 'S'
            },
        
            '8902625049339': {
                itemName: 'E014',
                color: 'DUSOR',
                size: 'XL'
            },
        
            '8902625049346': {
                itemName: 'E014',
                color: 'DUSOR',
                size: 'XXL'
            },
        
            '8902625099983': {
                itemName: 'E014',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625099990': {
                itemName: 'E014',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625100009': {
                itemName: 'E014',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625100016': {
                itemName: 'E014',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625100023': {
                itemName: 'E014',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625100030': {
                itemName: 'E014',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625100047': {
                itemName: 'E014',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625100054': {
                itemName: 'E014',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625100061': {
                itemName: 'E014',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625100078': {
                itemName: 'E014',
                color: 'MGM',
                size: 'XXL'
            },
        
            '8902625100085': {
                itemName: 'E014',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625100092': {
                itemName: 'E014',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625100108': {
                itemName: 'E014',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625100115': {
                itemName: 'E014',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625100122': {
                itemName: 'E014',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625615473': {
                itemName: 'E014',
                color: 'TGTCA',
                size: 'L'
            },
        
            '8902625615480': {
                itemName: 'E014',
                color: 'TGTCA',
                size: 'M'
            },
        
            '8902625615497': {
                itemName: 'E014',
                color: 'TGTCA',
                size: 'S'
            },
        
            '8902625615503': {
                itemName: 'E014',
                color: 'TGTCA',
                size: 'XL'
            },
        
            '8902625615510': {
                itemName: 'E014',
                color: 'TGTCA',
                size: 'XXL'
            },
        
            '8902625100139': {
                itemName: 'E018',
                color: 'CCM',
                size: 'L'
            },
        
            '8902625100146': {
                itemName: 'E018',
                color: 'CCM',
                size: 'M'
            },
        
            '8902625100153': {
                itemName: 'E018',
                color: 'CCM',
                size: 'S'
            },
        
            '8902625100160': {
                itemName: 'E018',
                color: 'CCM',
                size: 'XL'
            },
        
            '8902625100177': {
                itemName: 'E018',
                color: 'CCM',
                size: 'XXL'
            },
        
            '8902625100184': {
                itemName: 'E018',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625100191': {
                itemName: 'E018',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625100207': {
                itemName: 'E018',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625100214': {
                itemName: 'E018',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625100221': {
                itemName: 'E018',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625100238': {
                itemName: 'E018',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625100245': {
                itemName: 'E018',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625100252': {
                itemName: 'E018',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625100269': {
                itemName: 'E018',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625100283': {
                itemName: 'E018',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625100290': {
                itemName: 'E018',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625100306': {
                itemName: 'E018',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625100313': {
                itemName: 'E018',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625100320': {
                itemName: 'E018',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625622938': {
                itemName: 'E040',
                color: 'AABC',
                size: 'L'
            },
        
            '8902625622945': {
                itemName: 'E040',
                color: 'AABC',
                size: 'M'
            },
        
            '8902625622952': {
                itemName: 'E040',
                color: 'AABC',
                size: 'S'
            },
        
            '8902625622969': {
                itemName: 'E040',
                color: 'AABC',
                size: 'XL'
            },
        
            '8902625622976': {
                itemName: 'E040',
                color: 'AABC',
                size: 'XXL'
            },
        
            '8902625839695': {
                itemName: 'E040',
                color: 'GAOPNC',
                size: 'L'
            },
        
            '8902625839701': {
                itemName: 'E040',
                color: 'GAOPNC',
                size: 'M'
            },
        
            '8902625839718': {
                itemName: 'E040',
                color: 'GAOPNC',
                size: 'S'
            },
        
            '8902625839725': {
                itemName: 'E040',
                color: 'GAOPNC',
                size: 'XL'
            },
        
            '8902625839732': {
                itemName: 'E040',
                color: 'GAOPNC',
                size: 'XXL'
            },
        
            '8902625839749': {
                itemName: 'E040',
                color: 'JNGCOC',
                size: 'L'
            },
        
            '8902625839756': {
                itemName: 'E040',
                color: 'JNGCOC',
                size: 'M'
            },
        
            '8902625839763': {
                itemName: 'E040',
                color: 'JNGCOC',
                size: 'S'
            },
        
            '8902625839770': {
                itemName: 'E040',
                color: 'JNGCOC',
                size: 'XL'
            },
        
            '8902625839787': {
                itemName: 'E040',
                color: 'JNGCOC',
                size: 'XXL'
            },
        
            '8902625622983': {
                itemName: 'E040',
                color: 'NSKNCO',
                size: 'L'
            },
        
            '8902625622990': {
                itemName: 'E040',
                color: 'NSKNCO',
                size: 'M'
            },
        
            '8902625623003': {
                itemName: 'E040',
                color: 'NSKNCO',
                size: 'S'
            },
        
            '8902625623010': {
                itemName: 'E040',
                color: 'NSKNCO',
                size: 'XL'
            },
        
            '8902625623027': {
                itemName: 'E040',
                color: 'NSKNCO',
                size: 'XXL'
            },
        
            '8902625532718': {
                itemName: 'E044',
                color: 'CCM',
                size: 'L'
            },
        
            '8902625532725': {
                itemName: 'E044',
                color: 'CCM',
                size: 'M'
            },
        
            '8902625532732': {
                itemName: 'E044',
                color: 'CCM',
                size: 'S'
            },
        
            '8902625532749': {
                itemName: 'E044',
                color: 'CCM',
                size: 'XL'
            },
        
            '8902625532800': {
                itemName: 'E044',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625532817': {
                itemName: 'E044',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625532824': {
                itemName: 'E044',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625532831': {
                itemName: 'E044',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625532848': {
                itemName: 'E044',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625532855': {
                itemName: 'E044',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625532862': {
                itemName: 'E044',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625532879': {
                itemName: 'E044',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625532886': {
                itemName: 'E044',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625532909': {
                itemName: 'E044',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625532916': {
                itemName: 'E044',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625532923': {
                itemName: 'E044',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625532930': {
                itemName: 'E044',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625532947': {
                itemName: 'E044',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625821874': {
                itemName: 'E047',
                color: 'JBK',
                size: 'L'
            },
        
            '8902625821881': {
                itemName: 'E047',
                color: 'JBK',
                size: 'M'
            },
        
            '8902625821898': {
                itemName: 'E047',
                color: 'JBK',
                size: 'S'
            },
        
            '8902625821904': {
                itemName: 'E047',
                color: 'JBK',
                size: 'XL'
            },
        
            '8902625821928': {
                itemName: 'E047',
                color: 'JBK',
                size: 'XXL'
            },
        
            '8902625823991': {
                itemName: 'E047',
                color: 'LMNCRM',
                size: 'L'
            },
        
            '8902625824004': {
                itemName: 'E047',
                color: 'LMNCRM',
                size: 'M'
            },
        
            '8902625824011': {
                itemName: 'E047',
                color: 'LMNCRM',
                size: 'S'
            },
        
            '8902625824028': {
                itemName: 'E047',
                color: 'LMNCRM',
                size: 'XL'
            },
        
            '8902625824035': {
                itemName: 'E047',
                color: 'LMNCRM',
                size: 'XXL'
            },
        
            '8902625821935': {
                itemName: 'E047',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625821942': {
                itemName: 'E047',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625821959': {
                itemName: 'E047',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625821966': {
                itemName: 'E047',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625821980': {
                itemName: 'E047',
                color: 'MGM',
                size: 'XXL'
            },
        
            '8902625821997': {
                itemName: 'E047',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625822000': {
                itemName: 'E047',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625822017': {
                itemName: 'E047',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625822024': {
                itemName: 'E047',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625822048': {
                itemName: 'E047',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625837646': {
                itemName: 'E047',
                color: 'SFBEI',
                size: 'L'
            },
        
            '8902625837653': {
                itemName: 'E047',
                color: 'SFBEI',
                size: 'M'
            },
        
            '8902625837660': {
                itemName: 'E047',
                color: 'SFBEI',
                size: 'S'
            },
        
            '8902625837677': {
                itemName: 'E047',
                color: 'SFBEI',
                size: 'XL'
            },
        
            '8902625837684': {
                itemName: 'E047',
                color: 'SFBEI',
                size: 'XXL'
            },
        
            '8902625833068': {
                itemName: 'E048',
                color: 'ACA',
                size: 'L'
            },
        
            '8902625833075': {
                itemName: 'E048',
                color: 'ACA',
                size: 'M'
            },
        
            '8902625833082': {
                itemName: 'E048',
                color: 'ACA',
                size: 'S'
            },
        
            '8902625833099': {
                itemName: 'E048',
                color: 'ACA',
                size: 'XL'
            },
        
            '8902625833105': {
                itemName: 'E048',
                color: 'ACA',
                size: 'XXL'
            },
        
            '8902625833310': {
                itemName: 'E048',
                color: 'ARMGAA',
                size: 'L'
            },
        
            '8902625833327': {
                itemName: 'E048',
                color: 'ARMGAA',
                size: 'M'
            },
        
            '8902625833334': {
                itemName: 'E048',
                color: 'ARMGAA',
                size: 'S'
            },
        
            '8902625833341': {
                itemName: 'E048',
                color: 'ARMGAA',
                size: 'XL'
            },
        
            '8902625833358': {
                itemName: 'E048',
                color: 'ARMGAA',
                size: 'XXL'
            },
        
            '8902625023407': {
                itemName: 'E048',
                color: 'BSBAOP',
                size: 'L'
            },
        
            '8902625023391': {
                itemName: 'E048',
                color: 'BSBAOP',
                size: 'M'
            },
        
            '8902625023384': {
                itemName: 'E048',
                color: 'BSBAOP',
                size: 'S'
            },
        
            '8902625023414': {
                itemName: 'E048',
                color: 'BSBAOP',
                size: 'XL'
            },
        
            '8902625023421': {
                itemName: 'E048',
                color: 'BSBAOP',
                size: 'XXL'
            },
        
            '8902625023308': {
                itemName: 'E048',
                color: 'CBPAOP',
                size: 'L'
            },
        
            '8902625023292': {
                itemName: 'E048',
                color: 'CBPAOP',
                size: 'M'
            },
        
            '8902625023285': {
                itemName: 'E048',
                color: 'CBPAOP',
                size: 'S'
            },
        
            '8902625023315': {
                itemName: 'E048',
                color: 'CBPAOP',
                size: 'XL'
            },
        
            '8902625023322': {
                itemName: 'E048',
                color: 'CBPAOP',
                size: 'XXL'
            },
        
            '8902625023155': {
                itemName: 'E048',
                color: 'CSTR',
                size: 'L'
            },
        
            '8902625023148': {
                itemName: 'E048',
                color: 'CSTR',
                size: 'M'
            },
        
            '8902625023131': {
                itemName: 'E048',
                color: 'CSTR',
                size: 'S'
            },
        
            '8902625023162': {
                itemName: 'E048',
                color: 'CSTR',
                size: 'XL'
            },
        
            '8902625023179': {
                itemName: 'E048',
                color: 'CSTR',
                size: 'XXL'
            },
        
            '8902625044945': {
                itemName: 'E048',
                color: 'DUFAOP',
                size: 'L'
            },
        
            '8902625044938': {
                itemName: 'E048',
                color: 'DUFAOP',
                size: 'M'
            },
        
            '8902625044921': {
                itemName: 'E048',
                color: 'DUFAOP',
                size: 'S'
            },
        
            '8902625044952': {
                itemName: 'E048',
                color: 'DUFAOP',
                size: 'XL'
            },
        
            '8902625044969': {
                itemName: 'E048',
                color: 'DUFAOP',
                size: 'XXL'
            },
        
            '8902625044891': {
                itemName: 'E048',
                color: 'DUSOR',
                size: 'L'
            },
        
            '8902625044884': {
                itemName: 'E048',
                color: 'DUSOR',
                size: 'M'
            },
        
            '8902625044877': {
                itemName: 'E048',
                color: 'DUSOR',
                size: 'S'
            },
        
            '8902625044907': {
                itemName: 'E048',
                color: 'DUSOR',
                size: 'XL'
            },
        
            '8902625044914': {
                itemName: 'E048',
                color: 'DUSOR',
                size: 'XXL'
            },
        
            '8902625023254': {
                itemName: 'E048',
                color: 'ELMGRN',
                size: 'L'
            },
        
            '8902625023247': {
                itemName: 'E048',
                color: 'ELMGRN',
                size: 'M'
            },
        
            '8902625023230': {
                itemName: 'E048',
                color: 'ELMGRN',
                size: 'S'
            },
        
            '8902625023261': {
                itemName: 'E048',
                color: 'ELMGRN',
                size: 'XL'
            },
        
            '8902625023278': {
                itemName: 'E048',
                color: 'ELMGRN',
                size: 'XXL'
            },
        
            '8902625045096': {
                itemName: 'E048',
                color: 'JBPAOP',
                size: 'L'
            },
        
            '8902625045089': {
                itemName: 'E048',
                color: 'JBPAOP',
                size: 'M'
            },
        
            '8902625045072': {
                itemName: 'E048',
                color: 'JBPAOP',
                size: 'S'
            },
        
            '8902625045102': {
                itemName: 'E048',
                color: 'JBPAOP',
                size: 'XL'
            },
        
            '8902625045119': {
                itemName: 'E048',
                color: 'JBPAOP',
                size: 'XXL'
            },
        
            '8902625534569': {
                itemName: 'E048',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625534576': {
                itemName: 'E048',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625534583': {
                itemName: 'E048',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625534590': {
                itemName: 'E048',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625534606': {
                itemName: 'E048',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625045041': {
                itemName: 'E048',
                color: 'MBDAOP',
                size: 'L'
            },
        
            '8902625045034': {
                itemName: 'E048',
                color: 'MBDAOP',
                size: 'M'
            },
        
            '8902625045027': {
                itemName: 'E048',
                color: 'MBDAOP',
                size: 'S'
            },
        
            '8902625045058': {
                itemName: 'E048',
                color: 'MBDAOP',
                size: 'XL'
            },
        
            '8902625045065': {
                itemName: 'E048',
                color: 'MBDAOP',
                size: 'XXL'
            },
        
            '8902625023452': {
                itemName: 'E048',
                color: 'MBTAOP',
                size: 'L'
            },
        
            '8902625023445': {
                itemName: 'E048',
                color: 'MBTAOP',
                size: 'M'
            },
        
            '8902625023438': {
                itemName: 'E048',
                color: 'MBTAOP',
                size: 'S'
            },
        
            '8902625023469': {
                itemName: 'E048',
                color: 'MBTAOP',
                size: 'XL'
            },
        
            '8902625023476': {
                itemName: 'E048',
                color: 'MBTAOP',
                size: 'XXL'
            },
        
            '8902625534613': {
                itemName: 'E048',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625534620': {
                itemName: 'E048',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625534637': {
                itemName: 'E048',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625534644': {
                itemName: 'E048',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625534651': {
                itemName: 'E048',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625833266': {
                itemName: 'E048',
                color: 'NVUHBA',
                size: 'L'
            },
        
            '8902625833273': {
                itemName: 'E048',
                color: 'NVUHBA',
                size: 'M'
            },
        
            '8902625833280': {
                itemName: 'E048',
                color: 'NVUHBA',
                size: 'S'
            },
        
            '8902625833297': {
                itemName: 'E048',
                color: 'NVUHBA',
                size: 'XL'
            },
        
            '8902625833365': {
                itemName: 'E048',
                color: 'PRPLDA',
                size: 'L'
            },
        
            '8902625833372': {
                itemName: 'E048',
                color: 'PRPLDA',
                size: 'M'
            },
        
            '8902625833389': {
                itemName: 'E048',
                color: 'PRPLDA',
                size: 'S'
            },
        
            '8902625833396': {
                itemName: 'E048',
                color: 'PRPLDA',
                size: 'XL'
            },
        
            '8902625833402': {
                itemName: 'E048',
                color: 'PRPLDA',
                size: 'XXL'
            },
        
            '8902625044792': {
                itemName: 'E048',
                color: 'RAIFOR',
                size: 'L'
            },
        
            '8902625044785': {
                itemName: 'E048',
                color: 'RAIFOR',
                size: 'M'
            },
        
            '8902625044778': {
                itemName: 'E048',
                color: 'RAIFOR',
                size: 'S'
            },
        
            '8902625044808': {
                itemName: 'E048',
                color: 'RAIFOR',
                size: 'XL'
            },
        
            '8902625044815': {
                itemName: 'E048',
                color: 'RAIFOR',
                size: 'XXL'
            },
        
            '8902625044846': {
                itemName: 'E048',
                color: 'ROUGE',
                size: 'L'
            },
        
            '8902625044839': {
                itemName: 'E048',
                color: 'ROUGE',
                size: 'M'
            },
        
            '8902625044822': {
                itemName: 'E048',
                color: 'ROUGE',
                size: 'S'
            },
        
            '8902625044853': {
                itemName: 'E048',
                color: 'ROUGE',
                size: 'XL'
            },
        
            '8902625044860': {
                itemName: 'E048',
                color: 'ROUGE',
                size: 'XXL'
            },
        
            '8902625044990': {
                itemName: 'E048',
                color: 'WABAOP',
                size: 'L'
            },
        
            '8902625044983': {
                itemName: 'E048',
                color: 'WABAOP',
                size: 'M'
            },
        
            '8902625044976': {
                itemName: 'E048',
                color: 'WABAOP',
                size: 'S'
            },
        
            '8902625045003': {
                itemName: 'E048',
                color: 'WABAOP',
                size: 'XL'
            },
        
            '8902625045010': {
                itemName: 'E048',
                color: 'WABAOP',
                size: 'XXL'
            },
        
            '8902625010315': {
                itemName: 'E057',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625010308': {
                itemName: 'E057',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625010292': {
                itemName: 'E057',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625010322': {
                itemName: 'E057',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625010339': {
                itemName: 'E057',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625822109': {
                itemName: 'E057',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625822116': {
                itemName: 'E057',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625822123': {
                itemName: 'E057',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625822130': {
                itemName: 'E057',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625822147': {
                itemName: 'E057',
                color: 'MGM',
                size: 'XXL'
            },
        
            '8902625049476': {
                itemName: 'E057',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625049469': {
                itemName: 'E057',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625049452': {
                itemName: 'E057',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625049483': {
                itemName: 'E057',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625049490': {
                itemName: 'E057',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625049421': {
                itemName: 'E057',
                color: 'PCHPAR',
                size: 'L'
            },
        
            '8902625049414': {
                itemName: 'E057',
                color: 'PCHPAR',
                size: 'M'
            },
        
            '8902625049407': {
                itemName: 'E057',
                color: 'PCHPAR',
                size: 'S'
            },
        
            '8902625049438': {
                itemName: 'E057',
                color: 'PCHPAR',
                size: 'XL'
            },
        
            '8902625049445': {
                itemName: 'E057',
                color: 'PCHPAR',
                size: 'XXL'
            },
        
            '8902625049377': {
                itemName: 'E057',
                color: 'RAIFOR',
                size: 'L'
            },
        
            '8902625049360': {
                itemName: 'E057',
                color: 'RAIFOR',
                size: 'M'
            },
        
            '8902625049353': {
                itemName: 'E057',
                color: 'RAIFOR',
                size: 'S'
            },
        
            '8902625049384': {
                itemName: 'E057',
                color: 'RAIFOR',
                size: 'XL'
            },
        
            '8902625049391': {
                itemName: 'E057',
                color: 'RAIFOR',
                size: 'XXL'
            },
        
            '8902625048004': {
                itemName: 'E057',
                color: 'SURSPR',
                size: 'L'
            },
        
            '8902625047991': {
                itemName: 'E057',
                color: 'SURSPR',
                size: 'M'
            },
        
            '8902625047984': {
                itemName: 'E057',
                color: 'SURSPR',
                size: 'S'
            },
        
            '8902625048011': {
                itemName: 'E057',
                color: 'SURSPR',
                size: 'XL'
            },
        
            '8902625049506': {
                itemName: 'E057',
                color: 'SURSPR',
                size: 'XXL'
            },
        
            '8902625044068': {
                itemName: 'E060',
                color: 'CAPMEL',
                size: 'L'
            },
        
            '8902625044051': {
                itemName: 'E060',
                color: 'CAPMEL',
                size: 'M'
            },
        
            '8902625044044': {
                itemName: 'E060',
                color: 'CAPMEL',
                size: 'S'
            },
        
            '8902625044075': {
                itemName: 'E060',
                color: 'CAPMEL',
                size: 'XL'
            },
        
            '8902625044082': {
                itemName: 'E060',
                color: 'CAPMEL',
                size: 'XXL'
            },
        
            '8902625832962': {
                itemName: 'E060',
                color: 'CH MEL',
                size: 'L'
            },
        
            '8902625832979': {
                itemName: 'E060',
                color: 'CH MEL',
                size: 'M'
            },
        
            '8902625832986': {
                itemName: 'E060',
                color: 'CH MEL',
                size: 'S'
            },
        
            '8902625832993': {
                itemName: 'E060',
                color: 'CH MEL',
                size: 'XL'
            },
        
            '8902625833006': {
                itemName: 'E060',
                color: 'CH MEL',
                size: 'XXL'
            },
        
            '8902625833013': {
                itemName: 'E060',
                color: 'DBY MEL',
                size: 'L'
            },
        
            '8902625833020': {
                itemName: 'E060',
                color: 'DBY MEL',
                size: 'M'
            },
        
            '8902625833037': {
                itemName: 'E060',
                color: 'DBY MEL',
                size: 'S'
            },
        
            '8902625833044': {
                itemName: 'E060',
                color: 'DBY MEL',
                size: 'XL'
            },
        
            '8902625833051': {
                itemName: 'E060',
                color: 'DBY MEL',
                size: 'XXL'
            },
        
            '8902625043962': {
                itemName: 'E060',
                color: 'DUSOR',
                size: 'L'
            },
        
            '8902625043955': {
                itemName: 'E060',
                color: 'DUSOR',
                size: 'M'
            },
        
            '8902625043948': {
                itemName: 'E060',
                color: 'DUSOR',
                size: 'S'
            },
        
            '8902625043979': {
                itemName: 'E060',
                color: 'DUSOR',
                size: 'XL'
            },
        
            '8902625043986': {
                itemName: 'E060',
                color: 'DUSOR',
                size: 'XXL'
            },
        
            '8902625822208': {
                itemName: 'E060',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625822215': {
                itemName: 'E060',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625822222': {
                itemName: 'E060',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625822239': {
                itemName: 'E060',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625822246': {
                itemName: 'E060',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625044013': {
                itemName: 'E060',
                color: 'MDB',
                size: 'L'
            },
        
            '8902625044006': {
                itemName: 'E060',
                color: 'MDB',
                size: 'M'
            },
        
            '8902625043993': {
                itemName: 'E060',
                color: 'MDB',
                size: 'S'
            },
        
            '8902625044020': {
                itemName: 'E060',
                color: 'MDB',
                size: 'XL'
            },
        
            '8902625044037': {
                itemName: 'E060',
                color: 'MDB',
                size: 'XXL'
            },
        
            '8902625822253': {
                itemName: 'E060',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625822260': {
                itemName: 'E060',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625822277': {
                itemName: 'E060',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625822284': {
                itemName: 'E060',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625822291': {
                itemName: 'E060',
                color: 'MGM',
                size: 'XXL'
            },
        
            '8902625822307': {
                itemName: 'E060',
                color: 'NVMEL',
                size: 'L'
            },
        
            '8902625100771': {
                itemName: 'E060',
                color: 'NVMEL',
                size: 'M'
            },
        
            '8902625822314': {
                itemName: 'E060',
                color: 'NVMEL',
                size: 'S'
            },
        
            '8902625822321': {
                itemName: 'E060',
                color: 'NVMEL',
                size: 'XL'
            },
        
            '8902625822338': {
                itemName: 'E060',
                color: 'NVMEL',
                size: 'XXL'
            },
        
            '8902625617583': {
                itemName: 'E061',
                color: 'NVYRG',
                size: 'L'
            },
        
            '8902625617590': {
                itemName: 'E061',
                color: 'NVYRG',
                size: 'M'
            },
        
            '8902625617606': {
                itemName: 'E061',
                color: 'NVYRG',
                size: 'XL'
            },
        
            '8902625617613': {
                itemName: 'E061',
                color: 'NVYRG',
                size: 'XXL'
            },
        
            '8902625617507': {
                itemName: 'E061',
                color: 'PURRIG',
                size: 'L'
            },
        
            '8902625617514': {
                itemName: 'E061',
                color: 'PURRIG',
                size: 'M'
            },
        
            '8902625617521': {
                itemName: 'E061',
                color: 'PURRIG',
                size: 'XL'
            },
        
            '8902625617538': {
                itemName: 'E061',
                color: 'PURRIG',
                size: 'XXL'
            },
        
            '8902625824172': {
                itemName: 'E061',
                color: 'RGS',
                size: 'L'
            },
        
            '8902625824189': {
                itemName: 'E061',
                color: 'RGS',
                size: 'M'
            },
        
            '8902625824196': {
                itemName: 'E061',
                color: 'RGS',
                size: 'XL'
            },
        
            '8902625824202': {
                itemName: 'E061',
                color: 'RGS',
                size: 'XXL'
            },
        
            '8902625824219': {
                itemName: 'E061',
                color: 'TGS',
                size: 'L'
            },
        
            '8902625824226': {
                itemName: 'E061',
                color: 'TGS',
                size: 'M'
            },
        
            '8902625824233': {
                itemName: 'E061',
                color: 'TGS',
                size: 'XL'
            },
        
            '8902625824240': {
                itemName: 'E061',
                color: 'TGS',
                size: 'XXL'
            },
        
            '8902625823229': {
                itemName: 'E062',
                color: 'BALGRN',
                size: 'L'
            },
        
            '8902625823236': {
                itemName: 'E062',
                color: 'BALGRN',
                size: 'M'
            },
        
            '8902625823243': {
                itemName: 'E062',
                color: 'BALGRN',
                size: 'S'
            },
        
            '8902625823250': {
                itemName: 'E062',
                color: 'BALGRN',
                size: 'XL'
            },
        
            '8902625823267': {
                itemName: 'E062',
                color: 'BALGRN',
                size: 'XXL'
            },
        
            '8902625823274': {
                itemName: 'E062',
                color: 'BR0',
                size: 'L'
            },
        
            '8902625823281': {
                itemName: 'E062',
                color: 'BR0',
                size: 'M'
            },
        
            '8902625823298': {
                itemName: 'E062',
                color: 'BR0',
                size: 'S'
            },
        
            '8902625823304': {
                itemName: 'E062',
                color: 'BR0',
                size: 'XL'
            },
        
            '8902625823311': {
                itemName: 'E062',
                color: 'BR0',
                size: 'XXL'
            },
        
            '8902625823427': {
                itemName: 'E062',
                color: 'BSA',
                size: 'L'
            },
        
            '8902625823434': {
                itemName: 'E062',
                color: 'BSA',
                size: 'M'
            },
        
            '8902625823441': {
                itemName: 'E062',
                color: 'BSA',
                size: 'S'
            },
        
            '8902625823458': {
                itemName: 'E062',
                color: 'BSA',
                size: 'XL'
            },
        
            '8902625823465': {
                itemName: 'E062',
                color: 'BSA',
                size: 'XXL'
            },
        
            '8902625021915': {
                itemName: 'E062',
                color: 'CHVRAP',
                size: 'L'
            },
        
            '8902625021908': {
                itemName: 'E062',
                color: 'CHVRAP',
                size: 'M'
            },
        
            '8902625021892': {
                itemName: 'E062',
                color: 'CHVRAP',
                size: 'S'
            },
        
            '8902625021922': {
                itemName: 'E062',
                color: 'CHVRAP',
                size: 'XL'
            },
        
            '8902625021939': {
                itemName: 'E062',
                color: 'CHVRAP',
                size: 'XXL'
            },
        
            '8902625022110': {
                itemName: 'E062',
                color: 'CSRSAP',
                size: 'L'
            },
        
            '8902625022103': {
                itemName: 'E062',
                color: 'CSRSAP',
                size: 'M'
            },
        
            '8902625022097': {
                itemName: 'E062',
                color: 'CSRSAP',
                size: 'S'
            },
        
            '8902625022127': {
                itemName: 'E062',
                color: 'CSRSAP',
                size: 'XL'
            },
        
            '8902625022134': {
                itemName: 'E062',
                color: 'CSRSAP',
                size: 'XXL'
            },
        
            '8902625021960': {
                itemName: 'E062',
                color: 'DFTPAP',
                size: 'L'
            },
        
            '8902625021953': {
                itemName: 'E062',
                color: 'DFTPAP',
                size: 'M'
            },
        
            '8902625021946': {
                itemName: 'E062',
                color: 'DFTPAP',
                size: 'S'
            },
        
            '8902625021977': {
                itemName: 'E062',
                color: 'DFTPAP',
                size: 'XL'
            },
        
            '8902625021984': {
                itemName: 'E062',
                color: 'DFTPAP',
                size: 'XXL'
            },
        
            '8902625022011': {
                itemName: 'E062',
                color: 'EBTDAP',
                size: 'L'
            },
        
            '8902625022004': {
                itemName: 'E062',
                color: 'EBTDAP',
                size: 'M'
            },
        
            '8902625021991': {
                itemName: 'E062',
                color: 'EBTDAP',
                size: 'S'
            },
        
            '8902625022028': {
                itemName: 'E062',
                color: 'EBTDAP',
                size: 'XL'
            },
        
            '8902625022035': {
                itemName: 'E062',
                color: 'EBTDAP',
                size: 'XXL'
            },
        
            '8902625823472': {
                itemName: 'E062',
                color: 'FMA',
                size: 'L'
            },
        
            '8902625823489': {
                itemName: 'E062',
                color: 'FMA',
                size: 'M'
            },
        
            '8902625823496': {
                itemName: 'E062',
                color: 'FMA',
                size: 'S'
            },
        
            '8902625823502': {
                itemName: 'E062',
                color: 'FMA',
                size: 'XL'
            },
        
            '8902625823519': {
                itemName: 'E062',
                color: 'FMA',
                size: 'XXL'
            },
        
            '8902625823526': {
                itemName: 'E062',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625823533': {
                itemName: 'E062',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625823540': {
                itemName: 'E062',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625823557': {
                itemName: 'E062',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625823571': {
                itemName: 'E062',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625823632': {
                itemName: 'E062',
                color: 'NSF',
                size: 'L'
            },
        
            '8902625823649': {
                itemName: 'E062',
                color: 'NSF',
                size: 'M'
            },
        
            '8902625823656': {
                itemName: 'E062',
                color: 'NSF',
                size: 'S'
            },
        
            '8902625823663': {
                itemName: 'E062',
                color: 'NSF',
                size: 'XL'
            },
        
            '8902625823786': {
                itemName: 'E062',
                color: 'RVA',
                size: 'L'
            },
        
            '8902625823793': {
                itemName: 'E062',
                color: 'RVA',
                size: 'M'
            },
        
            '8902625823809': {
                itemName: 'E062',
                color: 'RVA',
                size: 'S'
            },
        
            '8902625823816': {
                itemName: 'E062',
                color: 'RVA',
                size: 'XL'
            },
        
            '8902625840295': {
                itemName: 'E064',
                color: 'AGY',
                size: 'L'
            },
        
            '8902625840301': {
                itemName: 'E064',
                color: 'AGY',
                size: 'M'
            },
        
            '8902625840318': {
                itemName: 'E064',
                color: 'AGY',
                size: 'S'
            },
        
            '8902625840325': {
                itemName: 'E064',
                color: 'AGY',
                size: 'XL'
            },
        
            '8902625840349': {
                itemName: 'E064',
                color: 'DBY',
                size: 'L'
            },
        
            '8902625840356': {
                itemName: 'E064',
                color: 'DBY',
                size: 'M'
            },
        
            '8902625840363': {
                itemName: 'E064',
                color: 'DBY',
                size: 'S'
            },
        
            '8902625840370': {
                itemName: 'E064',
                color: 'DBY',
                size: 'XL'
            },
        
            '8902625540881': {
                itemName: 'E064',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625540898': {
                itemName: 'E064',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625540904': {
                itemName: 'E064',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625540911': {
                itemName: 'E064',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625589910': {
                itemName: 'E066',
                color: 'ARMGRN',
                size: 'L'
            },
        
            '8902625589927': {
                itemName: 'E066',
                color: 'ARMGRN',
                size: 'M'
            },
        
            '8902625589934': {
                itemName: 'E066',
                color: 'ARMGRN',
                size: 'S'
            },
        
            '8902625589941': {
                itemName: 'E066',
                color: 'ARMGRN',
                size: 'XL'
            },
        
            '8902625589958': {
                itemName: 'E066',
                color: 'ARMGRN',
                size: 'XXL'
            },
        
            '8902625541086': {
                itemName: 'E066',
                color: 'CCM',
                size: 'L'
            },
        
            '8902625541093': {
                itemName: 'E066',
                color: 'CCM',
                size: 'M'
            },
        
            '8902625541109': {
                itemName: 'E066',
                color: 'CCM',
                size: 'S'
            },
        
            '8902625541116': {
                itemName: 'E066',
                color: 'CCM',
                size: 'XL'
            },
        
            '8902625541123': {
                itemName: 'E066',
                color: 'CCM',
                size: 'XXL'
            },
        
            '8902625541239': {
                itemName: 'E066',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625541246': {
                itemName: 'E066',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625541253': {
                itemName: 'E066',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625541260': {
                itemName: 'E066',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625541277': {
                itemName: 'E066',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625541383': {
                itemName: 'E066',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625541390': {
                itemName: 'E066',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625541406': {
                itemName: 'E066',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625541413': {
                itemName: 'E066',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625541420': {
                itemName: 'E066',
                color: 'MGM',
                size: 'XXL'
            },
        
            '8902625589965': {
                itemName: 'E066',
                color: 'MHGN',
                size: 'L'
            },
        
            '8902625589972': {
                itemName: 'E066',
                color: 'MHGN',
                size: 'M'
            },
        
            '8902625589989': {
                itemName: 'E066',
                color: 'MHGN',
                size: 'S'
            },
        
            '8902625589996': {
                itemName: 'E066',
                color: 'MHGN',
                size: 'XL'
            },
        
            '8902625541437': {
                itemName: 'E066',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625541444': {
                itemName: 'E066',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625541451': {
                itemName: 'E066',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625541468': {
                itemName: 'E066',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625822420': {
                itemName: 'E068',
                color: 'BLKMEL',
                size: 'L'
            },
        
            '8902625822437': {
                itemName: 'E068',
                color: 'BLKMEL',
                size: 'M'
            },
        
            '8902625822444': {
                itemName: 'E068',
                color: 'BLKMEL',
                size: 'S'
            },
        
            '8902625822451': {
                itemName: 'E068',
                color: 'BLKMEL',
                size: 'XL'
            },
        
            '8902625822468': {
                itemName: 'E068',
                color: 'BLKMEL',
                size: 'XXL'
            },
        
            '8902625023001': {
                itemName: 'E068',
                color: 'CHIVIO',
                size: 'L'
            },
        
            '8902625022998': {
                itemName: 'E068',
                color: 'CHIVIO',
                size: 'M'
            },
        
            '8902625022981': {
                itemName: 'E068',
                color: 'CHIVIO',
                size: 'S'
            },
        
            '8902625023018': {
                itemName: 'E068',
                color: 'CHIVIO',
                size: 'XL'
            },
        
            '8902625023025': {
                itemName: 'E068',
                color: 'CHIVIO',
                size: 'XXL'
            },
        
            '8902625839794': {
                itemName: 'E068',
                color: 'CSTR',
                size: 'L'
            },
        
            '8902625839800': {
                itemName: 'E068',
                color: 'CSTR',
                size: 'M'
            },
        
            '8902625839817': {
                itemName: 'E068',
                color: 'CSTR',
                size: 'S'
            },
        
            '8902625839824': {
                itemName: 'E068',
                color: 'CSTR',
                size: 'XL'
            },
        
            '8902625839831': {
                itemName: 'E068',
                color: 'CSTR',
                size: 'XXL'
            },
        
            '8902625023056': {
                itemName: 'E068',
                color: 'ELMGRN',
                size: 'L'
            },
        
            '8902625023049': {
                itemName: 'E068',
                color: 'ELMGRN',
                size: 'M'
            },
        
            '8902625023032': {
                itemName: 'E068',
                color: 'ELMGRN',
                size: 'S'
            },
        
            '8902625023063': {
                itemName: 'E068',
                color: 'ELMGRN',
                size: 'XL'
            },
        
            '8902625023070': {
                itemName: 'E068',
                color: 'ELMGRN',
                size: 'XXL'
            },
        
            '8902625822475': {
                itemName: 'E068',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625822482': {
                itemName: 'E068',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625822499': {
                itemName: 'E068',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625822505': {
                itemName: 'E068',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625822512': {
                itemName: 'E068',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625023100': {
                itemName: 'E068',
                color: 'MDB',
                size: 'L'
            },
        
            '8902625023094': {
                itemName: 'E068',
                color: 'MDB',
                size: 'M'
            },
        
            '8902625023087': {
                itemName: 'E068',
                color: 'MDB',
                size: 'S'
            },
        
            '8902625023117': {
                itemName: 'E068',
                color: 'MDB',
                size: 'XL'
            },
        
            '8902625023124': {
                itemName: 'E068',
                color: 'MDB',
                size: 'XXL'
            },
        
            '8902625822529': {
                itemName: 'E068',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625822536': {
                itemName: 'E068',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625822543': {
                itemName: 'E068',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625822550': {
                itemName: 'E068',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625822567': {
                itemName: 'E068',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625821478': {
                itemName: 'E068',
                color: 'OLVNT',
                size: 'L'
            },
        
            '8902625821485': {
                itemName: 'E068',
                color: 'OLVNT',
                size: 'M'
            },
        
            '8902625821492': {
                itemName: 'E068',
                color: 'OLVNT',
                size: 'S'
            },
        
            '8902625821508': {
                itemName: 'E068',
                color: 'OLVNT',
                size: 'XL'
            },
        
            '8902625821515': {
                itemName: 'E068',
                color: 'OLVNT',
                size: 'XXL'
            },
        
            '8902625044747': {
                itemName: 'E068',
                color: 'PURHAZ',
                size: 'L'
            },
        
            '8902625044730': {
                itemName: 'E068',
                color: 'PURHAZ',
                size: 'M'
            },
        
            '8902625044723': {
                itemName: 'E068',
                color: 'PURHAZ',
                size: 'S'
            },
        
            '8902625044754': {
                itemName: 'E068',
                color: 'PURHAZ',
                size: 'XL'
            },
        
            '8902625044761': {
                itemName: 'E068',
                color: 'PURHAZ',
                size: 'XXL'
            },
        
            '8902625044693': {
                itemName: 'E068',
                color: 'ROUGE',
                size: 'L'
            },
        
            '8902625044686': {
                itemName: 'E068',
                color: 'ROUGE',
                size: 'M'
            },
        
            '8902625044679': {
                itemName: 'E068',
                color: 'ROUGE',
                size: 'S'
            },
        
            '8902625044709': {
                itemName: 'E068',
                color: 'ROUGE',
                size: 'XL'
            },
        
            '8902625044716': {
                itemName: 'E068',
                color: 'ROUGE',
                size: 'XXL'
            },
        
            '8902625821522': {
                itemName: 'E076',
                color: 'BLKMEL',
                size: 'L'
            },
        
            '8902625821539': {
                itemName: 'E076',
                color: 'BLKMEL',
                size: 'M'
            },
        
            '8902625821546': {
                itemName: 'E076',
                color: 'BLKMEL',
                size: 'S'
            },
        
            '8902625821553': {
                itemName: 'E076',
                color: 'BLKMEL',
                size: 'XL'
            },
        
            '8902625821560': {
                itemName: 'E076',
                color: 'BLKMEL',
                size: 'XXL'
            },
        
            '8902625839893': {
                itemName: 'E076',
                color: 'DCT',
                size: 'L'
            },
        
            '8902625839909': {
                itemName: 'E076',
                color: 'DCT',
                size: 'M'
            },
        
            '8902625839916': {
                itemName: 'E076',
                color: 'DCT',
                size: 'S'
            },
        
            '8902625839923': {
                itemName: 'E076',
                color: 'DCT',
                size: 'XL'
            },
        
            '8902625839930': {
                itemName: 'E076',
                color: 'DCT',
                size: 'XXL'
            },
        
            '8902625822574': {
                itemName: 'E076',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625822581': {
                itemName: 'E076',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625822598': {
                itemName: 'E076',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625822604': {
                itemName: 'E076',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625822611': {
                itemName: 'E076',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625822628': {
                itemName: 'E076',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625822635': {
                itemName: 'E076',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625822642': {
                itemName: 'E076',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625822659': {
                itemName: 'E076',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625822666': {
                itemName: 'E076',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625542212': {
                itemName: 'E078',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625542229': {
                itemName: 'E078',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625542236': {
                itemName: 'E078',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625542243': {
                itemName: 'E078',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625591692': {
                itemName: 'E078',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625542250': {
                itemName: 'E078',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625542267': {
                itemName: 'E078',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625542274': {
                itemName: 'E078',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625542281': {
                itemName: 'E078',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625542298': {
                itemName: 'E078',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625604989': {
                itemName: 'E078',
                color: 'ROSWTR',
                size: 'L'
            },
        
            '8902625604996': {
                itemName: 'E078',
                color: 'ROSWTR',
                size: 'M'
            },
        
            '8902625605009': {
                itemName: 'E078',
                color: 'ROSWTR',
                size: 'S'
            },
        
            '8902625605016': {
                itemName: 'E078',
                color: 'ROSWTR',
                size: 'XL'
            },
        
            '8902625605030': {
                itemName: 'E078',
                color: 'TGN',
                size: 'L'
            },
        
            '8902625605047': {
                itemName: 'E078',
                color: 'TGN',
                size: 'M'
            },
        
            '8902625605054': {
                itemName: 'E078',
                color: 'TGN',
                size: 'S'
            },
        
            '8902625605061': {
                itemName: 'E078',
                color: 'TGN',
                size: 'XL'
            },
        
            '8902625620880': {
                itemName: 'E079',
                color: 'AGHG',
                size: 'L'
            },
        
            '8902625620897': {
                itemName: 'E079',
                color: 'AGHG',
                size: 'M'
            },
        
            '8902625620903': {
                itemName: 'E079',
                color: 'AGHG',
                size: 'S'
            },
        
            '8902625620910': {
                itemName: 'E079',
                color: 'AGHG',
                size: 'XL'
            },
        
            '8902625620927': {
                itemName: 'E079',
                color: 'AGHG',
                size: 'XXL'
            },
        
            '8902625620835': {
                itemName: 'E079',
                color: 'AGNG',
                size: 'L'
            },
        
            '8902625620842': {
                itemName: 'E079',
                color: 'AGNG',
                size: 'M'
            },
        
            '8902625620859': {
                itemName: 'E079',
                color: 'AGNG',
                size: 'S'
            },
        
            '8902625620866': {
                itemName: 'E079',
                color: 'AGNG',
                size: 'XL'
            },
        
            '8902625620873': {
                itemName: 'E079',
                color: 'AGNG',
                size: 'XXL'
            },
        
            '8902625041890': {
                itemName: 'E079',
                color: 'BBMG',
                size: 'L'
            },
        
            '8902625041883': {
                itemName: 'E079',
                color: 'BBMG',
                size: 'M'
            },
        
            '8902625041876': {
                itemName: 'E079',
                color: 'BBMG',
                size: 'S'
            },
        
            '8902625041906': {
                itemName: 'E079',
                color: 'BBMG',
                size: 'XL'
            },
        
            '8902625041913': {
                itemName: 'E079',
                color: 'BBMG',
                size: 'XXL'
            },
        
            '8902625620736': {
                itemName: 'E079',
                color: 'DBNG',
                size: 'L'
            },
        
            '8902625620743': {
                itemName: 'E079',
                color: 'DBNG',
                size: 'M'
            },
        
            '8902625620750': {
                itemName: 'E079',
                color: 'DBNG',
                size: 'S'
            },
        
            '8902625620767': {
                itemName: 'E079',
                color: 'DBNG',
                size: 'XL'
            },
        
            '8902625620774': {
                itemName: 'E079',
                color: 'DBNG',
                size: 'XXL'
            },
        
            '8902625041944': {
                itemName: 'E079',
                color: 'DOEG',
                size: 'L'
            },
        
            '8902625041937': {
                itemName: 'E079',
                color: 'DOEG',
                size: 'M'
            },
        
            '8902625041920': {
                itemName: 'E079',
                color: 'DOEG',
                size: 'S'
            },
        
            '8902625041951': {
                itemName: 'E079',
                color: 'DOEG',
                size: 'XL'
            },
        
            '8902625041968': {
                itemName: 'E079',
                color: 'DOEG',
                size: 'XXL'
            },
        
            '8902625620989': {
                itemName: 'E079',
                color: 'JBHNG',
                size: 'L'
            },
        
            '8902625620996': {
                itemName: 'E079',
                color: 'JBHNG',
                size: 'M'
            },
        
            '8902625621009': {
                itemName: 'E079',
                color: 'JBHNG',
                size: 'S'
            },
        
            '8902625621016': {
                itemName: 'E079',
                color: 'JBHNG',
                size: 'XL'
            },
        
            '8902625621023': {
                itemName: 'E079',
                color: 'JBHNG',
                size: 'XXL'
            },
        
            '8902625620934': {
                itemName: 'E079',
                color: 'NVBHN',
                size: 'L'
            },
        
            '8902625620941': {
                itemName: 'E079',
                color: 'NVBHN',
                size: 'M'
            },
        
            '8902625620958': {
                itemName: 'E079',
                color: 'NVBHN',
                size: 'S'
            },
        
            '8902625620965': {
                itemName: 'E079',
                color: 'NVBHN',
                size: 'XL'
            },
        
            '8902625620972': {
                itemName: 'E079',
                color: 'NVBHN',
                size: 'XXL'
            },
        
            '8902625620637': {
                itemName: 'E079',
                color: 'PSBHNG',
                size: 'L'
            },
        
            '8902625620644': {
                itemName: 'E079',
                color: 'PSBHNG',
                size: 'M'
            },
        
            '8902625620651': {
                itemName: 'E079',
                color: 'PSBHNG',
                size: 'S'
            },
        
            '8902625620668': {
                itemName: 'E079',
                color: 'PSBHNG',
                size: 'XL'
            },
        
            '8902625620675': {
                itemName: 'E079',
                color: 'PSBHNG',
                size: 'XXL'
            },
        
            '8902625605085': {
                itemName: 'E080',
                color: 'ARMGRN',
                size: 'L'
            },
        
            '8902625605092': {
                itemName: 'E080',
                color: 'ARMGRN',
                size: 'M'
            },
        
            '8902625605108': {
                itemName: 'E080',
                color: 'ARMGRN',
                size: 'S'
            },
        
            '8902625605115': {
                itemName: 'E080',
                color: 'ARMGRN',
                size: 'XL'
            },
        
            '8902625542588': {
                itemName: 'E080',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625542595': {
                itemName: 'E080',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625542601': {
                itemName: 'E080',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625542618': {
                itemName: 'E080',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625542632': {
                itemName: 'E080',
                color: 'MGM',
                size: 'L'
            },
        
            '8902625542649': {
                itemName: 'E080',
                color: 'MGM',
                size: 'M'
            },
        
            '8902625542656': {
                itemName: 'E080',
                color: 'MGM',
                size: 'S'
            },
        
            '8902625542663': {
                itemName: 'E080',
                color: 'MGM',
                size: 'XL'
            },
        
            '8902625542670': {
                itemName: 'E080',
                color: 'MGM',
                size: 'XXL'
            },
        
            '8902625542687': {
                itemName: 'E080',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625542694': {
                itemName: 'E080',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625542700': {
                itemName: 'E080',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625542717': {
                itemName: 'E080',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625542724': {
                itemName: 'E080',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625605139': {
                itemName: 'E080',
                color: 'PDRBLU',
                size: 'L'
            },
        
            '8902625605146': {
                itemName: 'E080',
                color: 'PDRBLU',
                size: 'M'
            },
        
            '8902625605153': {
                itemName: 'E080',
                color: 'PDRBLU',
                size: 'S'
            },
        
            '8902625605160': {
                itemName: 'E080',
                color: 'PDRBLU',
                size: 'XL'
            },
        
            '8902625605184': {
                itemName: 'E080',
                color: 'ROUGE',
                size: 'L'
            },
        
            '8902625605191': {
                itemName: 'E080',
                color: 'ROUGE',
                size: 'M'
            },
        
            '8902625605207': {
                itemName: 'E080',
                color: 'ROUGE',
                size: 'S'
            },
        
            '8902625605214': {
                itemName: 'E080',
                color: 'ROUGE',
                size: 'XL'
            },
        
            '8902625016874': {
                itemName: 'E089',
                color: 'BLMMRG',
                size: 'L'
            },
        
            '8902625016867': {
                itemName: 'E089',
                color: 'BLMMRG',
                size: 'M'
            },
        
            '8902625016850': {
                itemName: 'E089',
                color: 'BLMMRG',
                size: 'S'
            },
        
            '8902625016881': {
                itemName: 'E089',
                color: 'BLMMRG',
                size: 'XL'
            },
        
            '8902625016898': {
                itemName: 'E089',
                color: 'BLMMRG',
                size: 'XXL'
            },
        
            '8902625017383': {
                itemName: 'E089',
                color: 'CVMMRG',
                size: 'L'
            },
        
            '8902625017376': {
                itemName: 'E089',
                color: 'CVMMRG',
                size: 'M'
            },
        
            '8902625017369': {
                itemName: 'E089',
                color: 'CVMMRG',
                size: 'S'
            },
        
            '8902625017390': {
                itemName: 'E089',
                color: 'CVMMRG',
                size: 'XL'
            },
        
            '8902625017406': {
                itemName: 'E089',
                color: 'CVMMRG',
                size: 'XXL'
            },
        
            '8902625016829': {
                itemName: 'E089',
                color: 'GGMMRG',
                size: 'L'
            },
        
            '8902625016812': {
                itemName: 'E089',
                color: 'GGMMRG',
                size: 'M'
            },
        
            '8902625017413': {
                itemName: 'E089',
                color: 'GGMMRG',
                size: 'S'
            },
        
            '8902625016836': {
                itemName: 'E089',
                color: 'GGMMRG',
                size: 'XL'
            },
        
            '8902625016843': {
                itemName: 'E089',
                color: 'GGMMRG',
                size: 'XXL'
            },
        
            '8902625595430': {
                itemName: 'E089',
                color: 'GMX',
                size: 'L'
            },
        
            '8902625595447': {
                itemName: 'E089',
                color: 'GMX',
                size: 'M'
            },
        
            '8902625595454': {
                itemName: 'E089',
                color: 'GMX',
                size: 'S'
            },
        
            '8902625595461': {
                itemName: 'E089',
                color: 'GMX',
                size: 'XL'
            },
        
            '8902625595478': {
                itemName: 'E089',
                color: 'GMX',
                size: 'XXL'
            },
        
            '8902625529800': {
                itemName: 'E121',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625529817': {
                itemName: 'E121',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625529824': {
                itemName: 'E121',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625529831': {
                itemName: 'E121',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625529886': {
                itemName: 'E121',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625529893': {
                itemName: 'E121',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625529909': {
                itemName: 'E121',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625529916': {
                itemName: 'E121',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625591739': {
                itemName: 'E121',
                color: 'NAVY',
                size: 'XXL'
            },
        
            '8902625840141': {
                itemName: 'E121',
                color: 'SOFTPI',
                size: 'L'
            },
        
            '8902625840158': {
                itemName: 'E121',
                color: 'SOFTPI',
                size: 'M'
            },
        
            '8902625840165': {
                itemName: 'E121',
                color: 'SOFTPI',
                size: 'S'
            },
        
            '8902625840172': {
                itemName: 'E121',
                color: 'SOFTPI',
                size: 'XL'
            },
        
            '8902625530004': {
                itemName: 'E123',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625530011': {
                itemName: 'E123',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625530028': {
                itemName: 'E123',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625530035': {
                itemName: 'E123',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625018939': {
                itemName: 'E147',
                color: 'CFBDDG',
                size: 'L'
            },
        
            '8902625018922': {
                itemName: 'E147',
                color: 'CFBDDG',
                size: 'M'
            },
        
            '8902625018915': {
                itemName: 'E147',
                color: 'CFBDDG',
                size: 'S'
            },
        
            '8902625018946': {
                itemName: 'E147',
                color: 'CFBDDG',
                size: 'XL'
            },
        
            '8902625018953': {
                itemName: 'E147',
                color: 'CFBDDG',
                size: 'XXL'
            },
        
            '8902625029027': {
                itemName: 'E147',
                color: 'CHVLEG',
                size: 'L'
            },
        
            '8902625029010': {
                itemName: 'E147',
                color: 'CHVLEG',
                size: 'M'
            },
        
            '8902625029003': {
                itemName: 'E147',
                color: 'CHVLEG',
                size: 'S'
            },
        
            '8902625029041': {
                itemName: 'E147',
                color: 'CHVLEG',
                size: 'XL'
            },
        
            '8902625029034': {
                itemName: 'E147',
                color: 'CHVLEG',
                size: 'XXL'
            },
        
            '8902625028976': {
                itemName: 'E147',
                color: 'ELGDDG',
                size: 'L'
            },
        
            '8902625028969': {
                itemName: 'E147',
                color: 'ELGDDG',
                size: 'M'
            },
        
            '8902625028952': {
                itemName: 'E147',
                color: 'ELGDDG',
                size: 'S'
            },
        
            '8902625028983': {
                itemName: 'E147',
                color: 'ELGDDG',
                size: 'XL'
            },
        
            '8902625028990': {
                itemName: 'E147',
                color: 'ELGDDG',
                size: 'XXL'
            },
        
            '8902625824417': {
                itemName: 'E147',
                color: 'IHP',
                size: 'L'
            },
        
            '8902625824424': {
                itemName: 'E147',
                color: 'IHP',
                size: 'M'
            },
        
            '8902625824431': {
                itemName: 'E147',
                color: 'IHP',
                size: 'S'
            },
        
            '8902625824448': {
                itemName: 'E147',
                color: 'IHP',
                size: 'XL'
            },
        
            '8902625824561': {
                itemName: 'E147',
                color: 'MHR',
                size: 'L'
            },
        
            '8902625824578': {
                itemName: 'E147',
                color: 'MHR',
                size: 'M'
            },
        
            '8902625824585': {
                itemName: 'E147',
                color: 'MHR',
                size: 'S'
            },
        
            '8902625824592': {
                itemName: 'E147',
                color: 'MHR',
                size: 'XL'
            },
        
            '8902625824608': {
                itemName: 'E147',
                color: 'MHR',
                size: 'XXL'
            },
        
            '8902625824714': {
                itemName: 'E147',
                color: 'RLG',
                size: 'L'
            },
        
            '8902625824721': {
                itemName: 'E147',
                color: 'RLG',
                size: 'M'
            },
        
            '8902625824738': {
                itemName: 'E147',
                color: 'RLG',
                size: 'S'
            },
        
            '8902625824745': {
                itemName: 'E147',
                color: 'RLG',
                size: 'XL'
            },
        
            '8902625049636': {
                itemName: 'E157',
                color: 'AYRGR',
                size: 'L'
            },
        
            '8902625049629': {
                itemName: 'E157',
                color: 'AYRGR',
                size: 'M'
            },
        
            '8902625049612': {
                itemName: 'E157',
                color: 'AYRGR',
                size: 'S'
            },
        
            '8902625049643': {
                itemName: 'E157',
                color: 'AYRGR',
                size: 'XL'
            },
        
            '8902625049650': {
                itemName: 'E157',
                color: 'AYRGR',
                size: 'XXL'
            },
        
            '8902625049780': {
                itemName: 'E157',
                color: 'JBRGR',
                size: 'L'
            },
        
            '8902625049773': {
                itemName: 'E157',
                color: 'JBRGR',
                size: 'M'
            },
        
            '8902625049766': {
                itemName: 'E157',
                color: 'JBRGR',
                size: 'S'
            },
        
            '8902625049797': {
                itemName: 'E157',
                color: 'JBRGR',
                size: 'XL'
            },
        
            '8902625049803': {
                itemName: 'E157',
                color: 'JBRGR',
                size: 'XXL'
            },
        
            '8902625618559': {
                itemName: 'E157',
                color: 'LCPE',
                size: 'L'
            },
        
            '8902625618566': {
                itemName: 'E157',
                color: 'LCPE',
                size: 'M'
            },
        
            '8902625618573': {
                itemName: 'E157',
                color: 'LCPE',
                size: 'S'
            },
        
            '8902625618580': {
                itemName: 'E157',
                color: 'LCPE',
                size: 'XL'
            },
        
            '8902625618597': {
                itemName: 'E157',
                color: 'LCPE',
                size: 'XXL'
            },
        
            '8902625049582': {
                itemName: 'E157',
                color: 'MBEGR',
                size: 'L'
            },
        
            '8902625049575': {
                itemName: 'E157',
                color: 'MBEGR',
                size: 'M'
            },
        
            '8902625049568': {
                itemName: 'E157',
                color: 'MBEGR',
                size: 'S'
            },
        
            '8902625049599': {
                itemName: 'E157',
                color: 'MBEGR',
                size: 'XL'
            },
        
            '8902625049605': {
                itemName: 'E157',
                color: 'MBEGR',
                size: 'XXL'
            },
        
            '8902625618504': {
                itemName: 'E157',
                color: 'MGMBE',
                size: 'L'
            },
        
            '8902625618511': {
                itemName: 'E157',
                color: 'MGMBE',
                size: 'M'
            },
        
            '8902625618528': {
                itemName: 'E157',
                color: 'MGMBE',
                size: 'S'
            },
        
            '8902625618535': {
                itemName: 'E157',
                color: 'MGMBE',
                size: 'XL'
            },
        
            '8902625618542': {
                itemName: 'E157',
                color: 'MGMBE',
                size: 'XXL'
            },
        
            '8902625618405': {
                itemName: 'E157',
                color: 'NYPC',
                size: 'L'
            },
        
            '8902625618412': {
                itemName: 'E157',
                color: 'NYPC',
                size: 'M'
            },
        
            '8902625618429': {
                itemName: 'E157',
                color: 'NYPC',
                size: 'S'
            },
        
            '8902625618436': {
                itemName: 'E157',
                color: 'NYPC',
                size: 'XL'
            },
        
            '8902625618443': {
                itemName: 'E157',
                color: 'NYPC',
                size: 'XXL'
            },
        
            '8902625049537': {
                itemName: 'E157',
                color: 'PPEGR',
                size: 'L'
            },
        
            '8902625049520': {
                itemName: 'E157',
                color: 'PPEGR',
                size: 'M'
            },
        
            '8902625049513': {
                itemName: 'E157',
                color: 'PPEGR',
                size: 'S'
            },
        
            '8902625049544': {
                itemName: 'E157',
                color: 'PPEGR',
                size: 'XL'
            },
        
            '8902625049551': {
                itemName: 'E157',
                color: 'PPEGR',
                size: 'XXL'
            },
        
            '8902625049735': {
                itemName: 'E157',
                color: 'RFFGR',
                size: 'L'
            },
        
            '8902625049728': {
                itemName: 'E157',
                color: 'RFFGR',
                size: 'M'
            },
        
            '8902625049711': {
                itemName: 'E157',
                color: 'RFFGR',
                size: 'S'
            },
        
            '8902625049742': {
                itemName: 'E157',
                color: 'RFFGR',
                size: 'XL'
            },
        
            '8902625049759': {
                itemName: 'E157',
                color: 'RFFGR',
                size: 'XXL'
            },
        
            '8902625618450': {
                itemName: 'E157',
                color: 'RWLY',
                size: 'L'
            },
        
            '8902625618467': {
                itemName: 'E157',
                color: 'RWLY',
                size: 'M'
            },
        
            '8902625618481': {
                itemName: 'E157',
                color: 'RWLY',
                size: 'XL'
            },
        
            '8902625618498': {
                itemName: 'E157',
                color: 'RWLY',
                size: 'XXL'
            },
        
            '8902625049681': {
                itemName: 'E157',
                color: 'SPFGR',
                size: 'L'
            },
        
            '8902625049674': {
                itemName: 'E157',
                color: 'SPFGR',
                size: 'M'
            },
        
            '8902625049667': {
                itemName: 'E157',
                color: 'SPFGR',
                size: 'S'
            },
        
            '8902625049698': {
                itemName: 'E157',
                color: 'SPFGR',
                size: 'XL'
            },
        
            '8902625049704': {
                itemName: 'E157',
                color: 'SPFGR',
                size: 'XXL'
            },
        
            '8902625617781': {
                itemName: 'E161',
                color: 'JBRS',
                size: 'L'
            },
        
            '8902625617798': {
                itemName: 'E161',
                color: 'JBRS',
                size: 'M'
            },
        
            '8902625617804': {
                itemName: 'E161',
                color: 'JBRS',
                size: 'XL'
            },
        
            '8902625617811': {
                itemName: 'E161',
                color: 'JBRS',
                size: 'XXL'
            },
        
            '8902625617743': {
                itemName: 'E161',
                color: 'NRNS',
                size: 'L'
            },
        
            '8902625617750': {
                itemName: 'E161',
                color: 'NRNS',
                size: 'M'
            },
        
            '8902625617767': {
                itemName: 'E161',
                color: 'NRNS',
                size: 'XL'
            },
        
            '8902625617774': {
                itemName: 'E161',
                color: 'NRNS',
                size: 'XXL'
            },
        
            '8902625617705': {
                itemName: 'E161',
                color: 'PLH',
                size: 'L'
            },
        
            '8902625617712': {
                itemName: 'E161',
                color: 'PLH',
                size: 'M'
            },
        
            '8902625617729': {
                itemName: 'E161',
                color: 'PLH',
                size: 'XL'
            },
        
            '8902625617736': {
                itemName: 'E161',
                color: 'PLH',
                size: 'XXL'
            },
        
            '8902625616678': {
                itemName: 'E247',
                color: 'LCDA',
                size: 'L'
            },
        
            '8902625616685': {
                itemName: 'E247',
                color: 'LCDA',
                size: 'M'
            },
        
            '8902625616692': {
                itemName: 'E247',
                color: 'LCDA',
                size: 'S'
            },
        
            '8902625616708': {
                itemName: 'E247',
                color: 'LCDA',
                size: 'XL'
            },
        
            '8902625616715': {
                itemName: 'E247',
                color: 'LCDA',
                size: 'XXL'
            },
        
            '8902625616579': {
                itemName: 'E247',
                color: 'LIWA',
                size: 'L'
            },
        
            '8902625616586': {
                itemName: 'E247',
                color: 'LIWA',
                size: 'M'
            },
        
            '8902625616593': {
                itemName: 'E247',
                color: 'LIWA',
                size: 'S'
            },
        
            '8902625616609': {
                itemName: 'E247',
                color: 'LIWA',
                size: 'XL'
            },
        
            '8902625616470': {
                itemName: 'E247',
                color: 'PSBAOP',
                size: 'L'
            },
        
            '8902625616487': {
                itemName: 'E247',
                color: 'PSBAOP',
                size: 'M'
            },
        
            '8902625616494': {
                itemName: 'E247',
                color: 'PSBAOP',
                size: 'S'
            },
        
            '8902625616500': {
                itemName: 'E247',
                color: 'PSBAOP',
                size: 'XL'
            },
        
            '8902625616326': {
                itemName: 'E247',
                color: 'ROBIAO',
                size: 'L'
            },
        
            '8902625616333': {
                itemName: 'E247',
                color: 'ROBIAO',
                size: 'M'
            },
        
            '8902625616340': {
                itemName: 'E247',
                color: 'ROBIAO',
                size: 'S'
            },
        
            '8902625616357': {
                itemName: 'E247',
                color: 'ROBIAO',
                size: 'XL'
            },
        
            '8902625616371': {
                itemName: 'E247',
                color: 'SAWA',
                size: 'L'
            },
        
            '8902625616388': {
                itemName: 'E247',
                color: 'SAWA',
                size: 'M'
            },
        
            '8902625616395': {
                itemName: 'E247',
                color: 'SAWA',
                size: 'S'
            },
        
            '8902625616401': {
                itemName: 'E247',
                color: 'SAWA',
                size: 'XL'
            },
        
            '8902625048509': {
                itemName: 'E257',
                color: 'BBDAOP',
                size: 'L'
            },
        
            '8902625048493': {
                itemName: 'E257',
                color: 'BBDAOP',
                size: 'M'
            },
        
            '8902625048486': {
                itemName: 'E257',
                color: 'BBDAOP',
                size: 'S'
            },
        
            '8902625048516': {
                itemName: 'E257',
                color: 'BBDAOP',
                size: 'XL'
            },
        
            '8902625048523': {
                itemName: 'E257',
                color: 'BBDAOP',
                size: 'XXL'
            },
        
            '8902625010629': {
                itemName: 'E257',
                color: 'BRWDAP',
                size: 'L'
            },
        
            '8902625010612': {
                itemName: 'E257',
                color: 'BRWDAP',
                size: 'M'
            },
        
            '8902625010605': {
                itemName: 'E257',
                color: 'BRWDAP',
                size: 'S'
            },
        
            '8902625010636': {
                itemName: 'E257',
                color: 'BRWDAP',
                size: 'XL'
            },
        
            '8902625010643': {
                itemName: 'E257',
                color: 'BRWDAP',
                size: 'XXL'
            },
        
            '8902625048974': {
                itemName: 'E257',
                color: 'MBSAOP',
                size: 'L'
            },
        
            '8902625048967': {
                itemName: 'E257',
                color: 'MBSAOP',
                size: 'M'
            },
        
            '8902625048950': {
                itemName: 'E257',
                color: 'MBSAOP',
                size: 'S'
            },
        
            '8902625048981': {
                itemName: 'E257',
                color: 'MBSAOP',
                size: 'XL'
            },
        
            '8902625048998': {
                itemName: 'E257',
                color: 'MBSAOP',
                size: 'XXL'
            },
        
            '8902625048653': {
                itemName: 'E257',
                color: 'RFSCP',
                size: 'L'
            },
        
            '8902625048646': {
                itemName: 'E257',
                color: 'RFSCP',
                size: 'M'
            },
        
            '8902625048639': {
                itemName: 'E257',
                color: 'RFSCP',
                size: 'S'
            },
        
            '8902625048660': {
                itemName: 'E257',
                color: 'RFSCP',
                size: 'XL'
            },
        
            '8902625048677': {
                itemName: 'E257',
                color: 'RFSCP',
                size: 'XXL'
            },
        
            '8902625048608': {
                itemName: 'E257',
                color: 'ROSSTP',
                size: 'L'
            },
        
            '8902625048592': {
                itemName: 'E257',
                color: 'ROSSTP',
                size: 'M'
            },
        
            '8902625048585': {
                itemName: 'E257',
                color: 'ROSSTP',
                size: 'S'
            },
        
            '8902625048615': {
                itemName: 'E257',
                color: 'ROSSTP',
                size: 'XL'
            },
        
            '8902625048622': {
                itemName: 'E257',
                color: 'ROSSTP',
                size: 'XXL'
            },
        
            '8902625048554': {
                itemName: 'E257',
                color: 'SSSBTP',
                size: 'L'
            },
        
            '8902625048547': {
                itemName: 'E257',
                color: 'SSSBTP',
                size: 'M'
            },
        
            '8902625048530': {
                itemName: 'E257',
                color: 'SSSBTP',
                size: 'S'
            },
        
            '8902625048561': {
                itemName: 'E257',
                color: 'SSSBTP',
                size: 'XL'
            },
        
            '8902625048578': {
                itemName: 'E257',
                color: 'SSSBTP',
                size: 'XXL'
            },
        
            '8902625010674': {
                itemName: 'E257',
                color: 'TGBFAP',
                size: 'L'
            },
        
            '8902625010667': {
                itemName: 'E257',
                color: 'TGBFAP',
                size: 'M'
            },
        
            '8902625010650': {
                itemName: 'E257',
                color: 'TGBFAP',
                size: 'S'
            },
        
            '8902625010681': {
                itemName: 'E257',
                color: 'TGBFAP',
                size: 'XL'
            },
        
            '8902625010698': {
                itemName: 'E257',
                color: 'TGBFAP',
                size: 'XXL'
            },
        
            '8902625017635': {
                itemName: 'E305',
                color: 'AMY',
                size: 'L'
            },
        
            '8902625017628': {
                itemName: 'E305',
                color: 'AMY',
                size: 'M'
            },
        
            '8902625017611': {
                itemName: 'E305',
                color: 'AMY',
                size: 'S'
            },
        
            '8902625017642': {
                itemName: 'E305',
                color: 'AMY',
                size: 'XL'
            },
        
            '8902625017659': {
                itemName: 'E305',
                color: 'AMY',
                size: 'XXL'
            },
        
            '8902625023605': {
                itemName: 'E305',
                color: 'ELMGRN',
                size: 'L'
            },
        
            '8902625023599': {
                itemName: 'E305',
                color: 'ELMGRN',
                size: 'M'
            },
        
            '8902625023582': {
                itemName: 'E305',
                color: 'ELMGRN',
                size: 'S'
            },
        
            '8902625023612': {
                itemName: 'E305',
                color: 'ELMGRN',
                size: 'XL'
            },
        
            '8902625023629': {
                itemName: 'E305',
                color: 'ELMGRN',
                size: 'XXL'
            },
        
            '8902625017680': {
                itemName: 'E305',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625017673': {
                itemName: 'E305',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625017666': {
                itemName: 'E305',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625017697': {
                itemName: 'E305',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625017703': {
                itemName: 'E305',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625017741': {
                itemName: 'E306',
                color: 'DFMDUF',
                size: 'L'
            },
        
            '8902625017734': {
                itemName: 'E306',
                color: 'DFMDUF',
                size: 'M'
            },
        
            '8902625017727': {
                itemName: 'E306',
                color: 'DFMDUF',
                size: 'S'
            },
        
            '8902625017758': {
                itemName: 'E306',
                color: 'DFMDUF',
                size: 'XL'
            },
        
            '8902625017765': {
                itemName: 'E306',
                color: 'DFMDUF',
                size: 'XXL'
            },
        
            '8902625017444': {
                itemName: 'E306',
                color: 'EBMELB',
                size: 'L'
            },
        
            '8902625017437': {
                itemName: 'E306',
                color: 'EBMELB',
                size: 'M'
            },
        
            '8902625017420': {
                itemName: 'E306',
                color: 'EBMELB',
                size: 'S'
            },
        
            '8902625017451': {
                itemName: 'E306',
                color: 'EBMELB',
                size: 'XL'
            },
        
            '8902625017468': {
                itemName: 'E306',
                color: 'EBMELB',
                size: 'XXL'
            },
        
            '8902625017499': {
                itemName: 'E306',
                color: 'MGMBLK',
                size: 'L'
            },
        
            '8902625017482': {
                itemName: 'E306',
                color: 'MGMBLK',
                size: 'M'
            },
        
            '8902625017475': {
                itemName: 'E306',
                color: 'MGMBLK',
                size: 'S'
            },
        
            '8902625017505': {
                itemName: 'E306',
                color: 'MGMBLK',
                size: 'XL'
            },
        
            '8902625017512': {
                itemName: 'E306',
                color: 'MGMBLK',
                size: 'XXL'
            },
        
            '8902625017543': {
                itemName: 'E306',
                color: 'ROMROU',
                size: 'L'
            },
        
            '8902625017536': {
                itemName: 'E306',
                color: 'ROMROU',
                size: 'M'
            },
        
            '8902625017529': {
                itemName: 'E306',
                color: 'ROMROU',
                size: 'S'
            },
        
            '8902625017550': {
                itemName: 'E306',
                color: 'ROMROU',
                size: 'XL'
            },
        
            '8902625017710': {
                itemName: 'E306',
                color: 'ROMROU',
                size: 'XXL'
            },
        
            '8902625009074': {
                itemName: 'E307',
                color: 'BLABRW',
                size: 'L'
            },
        
            '8902625009067': {
                itemName: 'E307',
                color: 'BLABRW',
                size: 'M'
            },
        
            '8902625009050': {
                itemName: 'E307',
                color: 'BLABRW',
                size: 'S'
            },
        
            '8902625009081': {
                itemName: 'E307',
                color: 'BLABRW',
                size: 'XL'
            },
        
            '8902625009098': {
                itemName: 'E307',
                color: 'BLABRW',
                size: 'XXL'
            },
        
            '8902625009128': {
                itemName: 'E307',
                color: 'FIMDRB',
                size: 'L'
            },
        
            '8902625009111': {
                itemName: 'E307',
                color: 'FIMDRB',
                size: 'M'
            },
        
            '8902625009104': {
                itemName: 'E307',
                color: 'FIMDRB',
                size: 'S'
            },
        
            '8902625009135': {
                itemName: 'E307',
                color: 'FIMDRB',
                size: 'XL'
            },
        
            '8902625009142': {
                itemName: 'E307',
                color: 'FIMDRB',
                size: 'XXL'
            },
        
            '8902625009173': {
                itemName: 'E307',
                color: 'LGMSPB',
                size: 'L'
            },
        
            '8902625009166': {
                itemName: 'E307',
                color: 'LGMSPB',
                size: 'M'
            },
        
            '8902625009159': {
                itemName: 'E307',
                color: 'LGMSPB',
                size: 'S'
            },
        
            '8902625009180': {
                itemName: 'E307',
                color: 'LGMSPB',
                size: 'XL'
            },
        
            '8902625009197': {
                itemName: 'E307',
                color: 'LGMSPB',
                size: 'XXL'
            },
        
            '8902625043160': {
                itemName: 'E309',
                color: 'CSTR',
                size: 'L'
            },
        
            '8902625043153': {
                itemName: 'E309',
                color: 'CSTR',
                size: 'M'
            },
        
            '8902625043146': {
                itemName: 'E309',
                color: 'CSTR',
                size: 'S'
            },
        
            '8902625043177': {
                itemName: 'E309',
                color: 'CSTR',
                size: 'XL'
            },
        
            '8902625043184': {
                itemName: 'E309',
                color: 'CSTR',
                size: 'XXL'
            },
        
            '8902625043214': {
                itemName: 'E309',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625043207': {
                itemName: 'E309',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625043191': {
                itemName: 'E309',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625043221': {
                itemName: 'E309',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625043238': {
                itemName: 'E309',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625043269': {
                itemName: 'E309',
                color: 'RAIFOR',
                size: 'L'
            },
        
            '8902625043252': {
                itemName: 'E309',
                color: 'RAIFOR',
                size: 'M'
            },
        
            '8902625043245': {
                itemName: 'E309',
                color: 'RAIFOR',
                size: 'S'
            },
        
            '8902625043276': {
                itemName: 'E309',
                color: 'RAIFOR',
                size: 'XL'
            },
        
            '8902625043283': {
                itemName: 'E309',
                color: 'RAIFOR',
                size: 'XXL'
            },
        
            '8902625043115': {
                itemName: 'E309',
                color: 'ROUGE',
                size: 'L'
            },
        
            '8902625043108': {
                itemName: 'E309',
                color: 'ROUGE',
                size: 'M'
            },
        
            '8902625043092': {
                itemName: 'E309',
                color: 'ROUGE',
                size: 'S'
            },
        
            '8902625043122': {
                itemName: 'E309',
                color: 'ROUGE',
                size: 'XL'
            },
        
            '8902625043139': {
                itemName: 'E309',
                color: 'ROUGE',
                size: 'XXL'
            },
        
            '8902625041692': {
                itemName: 'E3G4',
                color: 'BBPVGR',
                size: 'L'
            },
        
            '8902625041685': {
                itemName: 'E3G4',
                color: 'BBPVGR',
                size: 'M'
            },
        
            '8902625041678': {
                itemName: 'E3G4',
                color: 'BBPVGR',
                size: 'S'
            },
        
            '8902625041708': {
                itemName: 'E3G4',
                color: 'BBPVGR',
                size: 'XL'
            },
        
            '8902625041715': {
                itemName: 'E3G4',
                color: 'BBPVGR',
                size: 'XXL'
            },
        
            '8902625018687': {
                itemName: 'E3G4',
                color: 'ELBLMG',
                size: 'L'
            },
        
            '8902625018670': {
                itemName: 'E3G4',
                color: 'ELBLMG',
                size: 'M'
            },
        
            '8902625018663': {
                itemName: 'E3G4',
                color: 'ELBLMG',
                size: 'S'
            },
        
            '8902625018694': {
                itemName: 'E3G4',
                color: 'ELBLMG',
                size: 'XL'
            },
        
            '8902625018700': {
                itemName: 'E3G4',
                color: 'ELBLMG',
                size: 'XXL'
            },
        
            '8902625041746': {
                itemName: 'E3G4',
                color: 'JBLTGR',
                size: 'L'
            },
        
            '8902625041739': {
                itemName: 'E3G4',
                color: 'JBLTGR',
                size: 'M'
            },
        
            '8902625041722': {
                itemName: 'E3G4',
                color: 'JBLTGR',
                size: 'S'
            },
        
            '8902625041753': {
                itemName: 'E3G4',
                color: 'JBLTGR',
                size: 'XL'
            },
        
            '8902625041760': {
                itemName: 'E3G4',
                color: 'JBLTGR',
                size: 'XXL'
            },
        
            '8902625018588': {
                itemName: 'E3G4',
                color: 'JBRTWG',
                size: 'L'
            },
        
            '8902625018571': {
                itemName: 'E3G4',
                color: 'JBRTWG',
                size: 'M'
            },
        
            '8902625018564': {
                itemName: 'E3G4',
                color: 'JBRTWG',
                size: 'S'
            },
        
            '8902625018595': {
                itemName: 'E3G4',
                color: 'JBRTWG',
                size: 'XL'
            },
        
            '8902625018601': {
                itemName: 'E3G4',
                color: 'JBRTWG',
                size: 'XXL'
            },
        
            '8902625041845': {
                itemName: 'E3G4',
                color: 'RFGRGR',
                size: 'L'
            },
        
            '8902625041838': {
                itemName: 'E3G4',
                color: 'RFGRGR',
                size: 'M'
            },
        
            '8902625041821': {
                itemName: 'E3G4',
                color: 'RFGRGR',
                size: 'S'
            },
        
            '8902625041852': {
                itemName: 'E3G4',
                color: 'RFGRGR',
                size: 'XL'
            },
        
            '8902625041869': {
                itemName: 'E3G4',
                color: 'RFGRGR',
                size: 'XXL'
            },
        
            '8902625041791': {
                itemName: 'E3G4',
                color: 'ROSSGR',
                size: 'L'
            },
        
            '8902625041784': {
                itemName: 'E3G4',
                color: 'ROSSGR',
                size: 'M'
            },
        
            '8902625041777': {
                itemName: 'E3G4',
                color: 'ROSSGR',
                size: 'S'
            },
        
            '8902625041807': {
                itemName: 'E3G4',
                color: 'ROSSGR',
                size: 'XL'
            },
        
            '8902625041814': {
                itemName: 'E3G4',
                color: 'ROSSGR',
                size: 'XXL'
            },
        
            '8902625041494': {
                itemName: 'E3G5',
                color: 'LAVEGR',
                size: 'L'
            },
        
            '8902625041487': {
                itemName: 'E3G5',
                color: 'LAVEGR',
                size: 'M'
            },
        
            '8902625041470': {
                itemName: 'E3G5',
                color: 'LAVEGR',
                size: 'S'
            },
        
            '8902625041500': {
                itemName: 'E3G5',
                color: 'LAVEGR',
                size: 'XL'
            },
        
            '8902625041517': {
                itemName: 'E3G5',
                color: 'LAVEGR',
                size: 'XXL'
            },
        
            '8902625041593': {
                itemName: 'E3G5',
                color: 'MAREGR',
                size: 'L'
            },
        
            '8902625041586': {
                itemName: 'E3G5',
                color: 'MAREGR',
                size: 'M'
            },
        
            '8902625041579': {
                itemName: 'E3G5',
                color: 'MAREGR',
                size: 'S'
            },
        
            '8902625041609': {
                itemName: 'E3G5',
                color: 'MAREGR',
                size: 'XL'
            },
        
            '8902625041616': {
                itemName: 'E3G5',
                color: 'MAREGR',
                size: 'XXL'
            },
        
            '8902625041647': {
                itemName: 'E3G5',
                color: 'REOEGR',
                size: 'L'
            },
        
            '8902625041630': {
                itemName: 'E3G5',
                color: 'REOEGR',
                size: 'M'
            },
        
            '8902625041623': {
                itemName: 'E3G5',
                color: 'REOEGR',
                size: 'S'
            },
        
            '8902625041654': {
                itemName: 'E3G5',
                color: 'REOEGR',
                size: 'XL'
            },
        
            '8902625041661': {
                itemName: 'E3G5',
                color: 'REOEGR',
                size: 'XXL'
            },
        
            '8902625041548': {
                itemName: 'E3G5',
                color: 'ROUEGR',
                size: 'L'
            },
        
            '8902625041531': {
                itemName: 'E3G5',
                color: 'ROUEGR',
                size: 'M'
            },
        
            '8902625041524': {
                itemName: 'E3G5',
                color: 'ROUEGR',
                size: 'S'
            },
        
            '8902625041555': {
                itemName: 'E3G5',
                color: 'ROUEGR',
                size: 'XL'
            },
        
            '8902625041562': {
                itemName: 'E3G5',
                color: 'ROUEGR',
                size: 'XXL'
            },
        
            '8902625011268': {
                itemName: 'E403',
                color: 'BLKMEL',
                size: 'L'
            },
        
            '8902625011251': {
                itemName: 'E403',
                color: 'BLKMEL',
                size: 'M'
            },
        
            '8902625011244': {
                itemName: 'E403',
                color: 'BLKMEL',
                size: 'S'
            },
        
            '8902625011275': {
                itemName: 'E403',
                color: 'BLKMEL',
                size: 'XL'
            },
        
            '8902625011282': {
                itemName: 'E403',
                color: 'BLKMEL',
                size: 'XXL'
            },
        
            '8902625021519': {
                itemName: 'E403',
                color: 'DUFOME',
                size: 'L'
            },
        
            '8902625021502': {
                itemName: 'E403',
                color: 'DUFOME',
                size: 'M'
            },
        
            '8902625021496': {
                itemName: 'E403',
                color: 'DUFOME',
                size: 'S'
            },
        
            '8902625021526': {
                itemName: 'E403',
                color: 'DUFOME',
                size: 'XL'
            },
        
            '8902625021533': {
                itemName: 'E403',
                color: 'DUFOME',
                size: 'XXL'
            },
        
            '8902625021564': {
                itemName: 'E403',
                color: 'MEBLME',
                size: 'L'
            },
        
            '8902625021557': {
                itemName: 'E403',
                color: 'MEBLME',
                size: 'M'
            },
        
            '8902625021540': {
                itemName: 'E403',
                color: 'MEBLME',
                size: 'S'
            },
        
            '8902625021571': {
                itemName: 'E403',
                color: 'MEBLME',
                size: 'XL'
            },
        
            '8902625021588': {
                itemName: 'E403',
                color: 'MEBLME',
                size: 'XXL'
            },
        
            '8902625044549': {
                itemName: 'E405',
                color: 'BBELL',
                size: 'L'
            },
        
            '8902625044532': {
                itemName: 'E405',
                color: 'BBELL',
                size: 'M'
            },
        
            '8902625044525': {
                itemName: 'E405',
                color: 'BBELL',
                size: 'S'
            },
        
            '8902625044556': {
                itemName: 'E405',
                color: 'BBELL',
                size: 'XL'
            },
        
            '8902625044563': {
                itemName: 'E405',
                color: 'BBELL',
                size: 'XXL'
            },
        
            '8902625044495': {
                itemName: 'E405',
                color: 'BLKMEL',
                size: 'L'
            },
        
            '8902625044488': {
                itemName: 'E405',
                color: 'BLKMEL',
                size: 'M'
            },
        
            '8902625044471': {
                itemName: 'E405',
                color: 'BLKMEL',
                size: 'S'
            },
        
            '8902625044501': {
                itemName: 'E405',
                color: 'BLKMEL',
                size: 'XL'
            },
        
            '8902625044518': {
                itemName: 'E405',
                color: 'BLKMEL',
                size: 'XXL'
            },
        
            '8902625044594': {
                itemName: 'E405',
                color: 'MDBMEL',
                size: 'L'
            },
        
            '8902625044587': {
                itemName: 'E405',
                color: 'MDBMEL',
                size: 'M'
            },
        
            '8902625044570': {
                itemName: 'E405',
                color: 'MDBMEL',
                size: 'S'
            },
        
            '8902625044600': {
                itemName: 'E405',
                color: 'MDBMEL',
                size: 'XL'
            },
        
            '8902625044617': {
                itemName: 'E405',
                color: 'MDBMEL',
                size: 'XXL'
            },
        
            '8902625044648': {
                itemName: 'E405',
                color: 'REOC',
                size: 'L'
            },
        
            '8902625044631': {
                itemName: 'E405',
                color: 'REOC',
                size: 'M'
            },
        
            '8902625044624': {
                itemName: 'E405',
                color: 'REOC',
                size: 'S'
            },
        
            '8902625044655': {
                itemName: 'E405',
                color: 'REOC',
                size: 'XL'
            },
        
            '8902625044662': {
                itemName: 'E405',
                color: 'REOC',
                size: 'XXL'
            },
        
            '8902625043863': {
                itemName: 'E406',
                color: 'DUSOR',
                size: 'L'
            },
        
            '8902625043856': {
                itemName: 'E406',
                color: 'DUSOR',
                size: 'M'
            },
        
            '8902625043849': {
                itemName: 'E406',
                color: 'DUSOR',
                size: 'S'
            },
        
            '8902625043870': {
                itemName: 'E406',
                color: 'DUSOR',
                size: 'XL'
            },
        
            '8902625043887': {
                itemName: 'E406',
                color: 'DUSOR',
                size: 'XXL'
            },
        
            '8902625043917': {
                itemName: 'E406',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625043900': {
                itemName: 'E406',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625043894': {
                itemName: 'E406',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625043924': {
                itemName: 'E406',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625043931': {
                itemName: 'E406',
                color: 'JETBLK',
                size: 'XXL'
            },
        
            '8902625043764': {
                itemName: 'E406',
                color: 'MDB',
                size: 'L'
            },
        
            '8902625043757': {
                itemName: 'E406',
                color: 'MDB',
                size: 'M'
            },
        
            '8902625043740': {
                itemName: 'E406',
                color: 'MDB',
                size: 'S'
            },
        
            '8902625043771': {
                itemName: 'E406',
                color: 'MDB',
                size: 'XL'
            },
        
            '8902625043788': {
                itemName: 'E406',
                color: 'MDB',
                size: 'XXL'
            },
        
            '8902625043818': {
                itemName: 'E406',
                color: 'OLIVE',
                size: 'L'
            },
        
            '8902625043801': {
                itemName: 'E406',
                color: 'OLIVE',
                size: 'M'
            },
        
            '8902625043795': {
                itemName: 'E406',
                color: 'OLIVE',
                size: 'S'
            },
        
            '8902625043825': {
                itemName: 'E406',
                color: 'OLIVE',
                size: 'XL'
            },
        
            '8902625043832': {
                itemName: 'E406',
                color: 'OLIVE',
                size: 'XXL'
            },
        
            '8902625837998': {
                itemName: 'E4A3',
                color: 'BLKBAO',
                size: 'L'
            },
        
            '8902625838001': {
                itemName: 'E4A3',
                color: 'BLKBAO',
                size: 'M'
            },
        
            '8902625838018': {
                itemName: 'E4A3',
                color: 'BLKBAO',
                size: 'S'
            },
        
            '8902625838025': {
                itemName: 'E4A3',
                color: 'BLKBAO',
                size: 'XL'
            },
        
            '8902625838032': {
                itemName: 'E4A3',
                color: 'BLKBAO',
                size: 'XXL'
            },
        
            '8902625605535': {
                itemName: 'E4A3',
                color: 'NHO',
                size: 'L'
            },
        
            '8902625605542': {
                itemName: 'E4A3',
                color: 'NHO',
                size: 'M'
            },
        
            '8902625605559': {
                itemName: 'E4A3',
                color: 'NHO',
                size: 'S'
            },
        
            '8902625605566': {
                itemName: 'E4A3',
                color: 'NHO',
                size: 'XL'
            },
        
            '8902625605573': {
                itemName: 'E4A3',
                color: 'NHO',
                size: 'XXL'
            },
        
            '8902625838049': {
                itemName: 'E4A3',
                color: 'RBNBA',
                size: 'L'
            },
        
            '8902625838056': {
                itemName: 'E4A3',
                color: 'RBNBA',
                size: 'M'
            },
        
            '8902625838063': {
                itemName: 'E4A3',
                color: 'RBNBA',
                size: 'S'
            },
        
            '8902625838070': {
                itemName: 'E4A3',
                color: 'RBNBA',
                size: 'XL'
            },
        
            '8902625838087': {
                itemName: 'E4A3',
                color: 'RBNBA',
                size: 'XXL'
            },
        
            '8902625605634': {
                itemName: 'E4A3',
                color: 'RGA',
                size: 'L'
            },
        
            '8902625605641': {
                itemName: 'E4A3',
                color: 'RGA',
                size: 'M'
            },
        
            '8902625605658': {
                itemName: 'E4A3',
                color: 'RGA',
                size: 'S'
            },
        
            '8902625605665': {
                itemName: 'E4A3',
                color: 'RGA',
                size: 'XL'
            },
        
            '8902625838148': {
                itemName: 'E4A3',
                color: 'SFPBPA',
                size: 'L'
            },
        
            '8902625838155': {
                itemName: 'E4A3',
                color: 'SFPBPA',
                size: 'M'
            },
        
            '8902625838162': {
                itemName: 'E4A3',
                color: 'SFPBPA',
                size: 'S'
            },
        
            '8902625838179': {
                itemName: 'E4A3',
                color: 'SFPBPA',
                size: 'XL'
            },
        
            '8902625838186': {
                itemName: 'E4A3',
                color: 'SFPBPA',
                size: 'XXL'
            },
        
            '8902625838094': {
                itemName: 'E4A3',
                color: 'SFTGBA',
                size: 'L'
            },
        
            '8902625838100': {
                itemName: 'E4A3',
                color: 'SFTGBA',
                size: 'M'
            },
        
            '8902625838117': {
                itemName: 'E4A3',
                color: 'SFTGBA',
                size: 'S'
            },
        
            '8902625838124': {
                itemName: 'E4A3',
                color: 'SFTGBA',
                size: 'XL'
            },
        
            '8902625838131': {
                itemName: 'E4A3',
                color: 'SFTGBA',
                size: 'XXL'
            },
        
            '8902625840646': {
                itemName: 'E4A4',
                color: 'BKSPRA',
                size: 'L'
            },
        
            '8902625840653': {
                itemName: 'E4A4',
                color: 'BKSPRA',
                size: 'M'
            },
        
            '8902625840660': {
                itemName: 'E4A4',
                color: 'BKSPRA',
                size: 'S'
            },
        
            '8902625840677': {
                itemName: 'E4A4',
                color: 'BKSPRA',
                size: 'XL'
            },
        
            '8902625840684': {
                itemName: 'E4A4',
                color: 'BKSPRA',
                size: 'XXL'
            },
        
            '8902625840592': {
                itemName: 'E4A4',
                color: 'DCHKCA',
                size: 'L'
            },
        
            '8902625840608': {
                itemName: 'E4A4',
                color: 'DCHKCA',
                size: 'M'
            },
        
            '8902625840615': {
                itemName: 'E4A4',
                color: 'DCHKCA',
                size: 'S'
            },
        
            '8902625840622': {
                itemName: 'E4A4',
                color: 'DCHKCA',
                size: 'XL'
            },
        
            '8902625840639': {
                itemName: 'E4A4',
                color: 'DCHKCA',
                size: 'XXL'
            },
        
            '8902625840691': {
                itemName: 'E4A4',
                color: 'JNGLAO',
                size: 'L'
            },
        
            '8902625840707': {
                itemName: 'E4A4',
                color: 'JNGLAO',
                size: 'M'
            },
        
            '8902625840714': {
                itemName: 'E4A4',
                color: 'JNGLAO',
                size: 'S'
            },
        
            '8902625840721': {
                itemName: 'E4A4',
                color: 'JNGLAO',
                size: 'XL'
            },
        
            '8902625840738': {
                itemName: 'E4A4',
                color: 'JNGLAO',
                size: 'XXL'
            },
        
            '8902625840745': {
                itemName: 'E4A4',
                color: 'OLPSLA',
                size: 'L'
            },
        
            '8902625840752': {
                itemName: 'E4A4',
                color: 'OLPSLA',
                size: 'M'
            },
        
            '8902625840769': {
                itemName: 'E4A4',
                color: 'OLPSLA',
                size: 'S'
            },
        
            '8902625840776': {
                itemName: 'E4A4',
                color: 'OLPSLA',
                size: 'XL'
            },
        
            '8902625840783': {
                itemName: 'E4A4',
                color: 'OLPSLA',
                size: 'XXL'
            },
        
            '8902625840790': {
                itemName: 'E4A4',
                color: 'PRPLIN',
                size: 'L'
            },
        
            '8902625840806': {
                itemName: 'E4A4',
                color: 'PRPLIN',
                size: 'M'
            },
        
            '8902625840813': {
                itemName: 'E4A4',
                color: 'PRPLIN',
                size: 'S'
            },
        
            '8902625840820': {
                itemName: 'E4A4',
                color: 'PRPLIN',
                size: 'XL'
            },
        
            '8902625840837': {
                itemName: 'E4A4',
                color: 'PRPLIN',
                size: 'XXL'
            },
        
            '8902625020734': {
                itemName: 'E4A5',
                color: 'BRBLCH',
                size: 'L'
            },
        
            '8902625020727': {
                itemName: 'E4A5',
                color: 'BRBLCH',
                size: 'M'
            },
        
            '8902625020710': {
                itemName: 'E4A5',
                color: 'BRBLCH',
                size: 'S'
            },
        
            '8902625020741': {
                itemName: 'E4A5',
                color: 'BRBLCH',
                size: 'XL'
            },
        
            '8902625020758': {
                itemName: 'E4A5',
                color: 'BRBLCH',
                size: 'XXL'
            },
        
            '8902625020482': {
                itemName: 'E4A5',
                color: 'DFPAOP',
                size: 'L'
            },
        
            '8902625020475': {
                itemName: 'E4A5',
                color: 'DFPAOP',
                size: 'M'
            },
        
            '8902625020468': {
                itemName: 'E4A5',
                color: 'DFPAOP',
                size: 'S'
            },
        
            '8902625020499': {
                itemName: 'E4A5',
                color: 'DFPAOP',
                size: 'XL'
            },
        
            '8902625020505': {
                itemName: 'E4A5',
                color: 'DFPAOP',
                size: 'XXL'
            },
        
            '8902625020437': {
                itemName: 'E4A5',
                color: 'FPGAOP',
                size: 'L'
            },
        
            '8902625020420': {
                itemName: 'E4A5',
                color: 'FPGAOP',
                size: 'M'
            },
        
            '8902625020413': {
                itemName: 'E4A5',
                color: 'FPGAOP',
                size: 'S'
            },
        
            '8902625020444': {
                itemName: 'E4A5',
                color: 'FPGAOP',
                size: 'XL'
            },
        
            '8902625020451': {
                itemName: 'E4A5',
                color: 'FPGAOP',
                size: 'XXL'
            },
        
            '8902625020680': {
                itemName: 'E4A5',
                color: 'ORHUCH',
                size: 'L'
            },
        
            '8902625020673': {
                itemName: 'E4A5',
                color: 'ORHUCH',
                size: 'M'
            },
        
            '8902625020666': {
                itemName: 'E4A5',
                color: 'ORHUCH',
                size: 'S'
            },
        
            '8902625020697': {
                itemName: 'E4A5',
                color: 'ORHUCH',
                size: 'XL'
            },
        
            '8902625020703': {
                itemName: 'E4A5',
                color: 'ORHUCH',
                size: 'XXL'
            },
        
            '8902625020536': {
                itemName: 'E4A5',
                color: 'PBTAOP',
                size: 'L'
            },
        
            '8902625020529': {
                itemName: 'E4A5',
                color: 'PBTAOP',
                size: 'M'
            },
        
            '8902625020512': {
                itemName: 'E4A5',
                color: 'PBTAOP',
                size: 'S'
            },
        
            '8902625020543': {
                itemName: 'E4A5',
                color: 'PBTAOP',
                size: 'XL'
            },
        
            '8902625020550': {
                itemName: 'E4A5',
                color: 'PBTAOP',
                size: 'XXL'
            },
        
            '8902625020833': {
                itemName: 'E4A5',
                color: 'ROUGCH',
                size: 'L'
            },
        
            '8902625020826': {
                itemName: 'E4A5',
                color: 'ROUGCH',
                size: 'M'
            },
        
            '8902625020819': {
                itemName: 'E4A5',
                color: 'ROUGCH',
                size: 'S'
            },
        
            '8902625020840': {
                itemName: 'E4A5',
                color: 'ROUGCH',
                size: 'XL'
            },
        
            '8902625020857': {
                itemName: 'E4A5',
                color: 'ROUGCH',
                size: 'XXL'
            },
        
            '8902625003058': {
                itemName: 'E7A1',
                color: 'BOTSTK',
                size: 'L'
            },
        
            '8902625003065': {
                itemName: 'E7A1',
                color: 'BOTSTK',
                size: 'M'
            },
        
            '8902625003072': {
                itemName: 'E7A1',
                color: 'BOTSTK',
                size: 'S'
            },
        
            '8902625003089': {
                itemName: 'E7A1',
                color: 'BOTSTK',
                size: 'XL'
            },
        
            '8902625003096': {
                itemName: 'E7A1',
                color: 'BOTSTK',
                size: 'XXL'
            },
        
            '8902625020932': {
                itemName: 'E7A1',
                color: 'FPGAOP',
                size: 'L'
            },
        
            '8902625020925': {
                itemName: 'E7A1',
                color: 'FPGAOP',
                size: 'M'
            },
        
            '8902625020918': {
                itemName: 'E7A1',
                color: 'FPGAOP',
                size: 'S'
            },
        
            '8902625020949': {
                itemName: 'E7A1',
                color: 'FPGAOP',
                size: 'XL'
            },
        
            '8902625020956': {
                itemName: 'E7A1',
                color: 'FPGAOP',
                size: 'XXL'
            },
        
            '8902625003102': {
                itemName: 'E7A1',
                color: 'IVYSTR',
                size: 'L'
            },
        
            '8902625003119': {
                itemName: 'E7A1',
                color: 'IVYSTR',
                size: 'M'
            },
        
            '8902625003126': {
                itemName: 'E7A1',
                color: 'IVYSTR',
                size: 'S'
            },
        
            '8902625003133': {
                itemName: 'E7A1',
                color: 'IVYSTR',
                size: 'XL'
            },
        
            '8902625003751': {
                itemName: 'E7A1',
                color: 'MTLAOP',
                size: 'L'
            },
        
            '8902625003768': {
                itemName: 'E7A1',
                color: 'MTLAOP',
                size: 'M'
            },
        
            '8902625003775': {
                itemName: 'E7A1',
                color: 'MTLAOP',
                size: 'S'
            },
        
            '8902625003782': {
                itemName: 'E7A1',
                color: 'MTLAOP',
                size: 'XL'
            },
        
            '8902625021045': {
                itemName: 'E7A1',
                color: 'PBTAOP',
                size: 'L'
            },
        
            '8902625021021': {
                itemName: 'E7A1',
                color: 'PBTAOP',
                size: 'M'
            },
        
            '8902625021014': {
                itemName: 'E7A1',
                color: 'PBTAOP',
                size: 'S'
            },
        
            '8902625021052': {
                itemName: 'E7A1',
                color: 'PBTAOP',
                size: 'XL'
            },
        
            '8902625021069': {
                itemName: 'E7A1',
                color: 'PBTAOP',
                size: 'XXL'
            },
        
            '8902625002853': {
                itemName: 'E7A1',
                color: 'PLEVPD',
                size: 'L'
            },
        
            '8902625002860': {
                itemName: 'E7A1',
                color: 'PLEVPD',
                size: 'M'
            },
        
            '8902625002877': {
                itemName: 'E7A1',
                color: 'PLEVPD',
                size: 'S'
            },
        
            '8902625002884': {
                itemName: 'E7A1',
                color: 'PLEVPD',
                size: 'XL'
            },
        
            '8902625589668': {
                itemName: 'E801',
                color: 'JBO',
                size: 'L'
            },
        
            '8902625589675': {
                itemName: 'E801',
                color: 'JBO',
                size: 'M'
            },
        
            '8902625589682': {
                itemName: 'E801',
                color: 'JBO',
                size: 'S'
            },
        
            '8902625589699': {
                itemName: 'E801',
                color: 'JBO',
                size: 'XL'
            },
        
            '8902625589705': {
                itemName: 'E801',
                color: 'JBO',
                size: 'XXL'
            },
        
            '8902625546692': {
                itemName: 'E801',
                color: 'JWC',
                size: 'L'
            },
        
            '8902625546708': {
                itemName: 'E801',
                color: 'JWC',
                size: 'M'
            },
        
            '8902625546715': {
                itemName: 'E801',
                color: 'JWC',
                size: 'S'
            },
        
            '8902625546722': {
                itemName: 'E801',
                color: 'JWC',
                size: 'XL'
            },
        
            '8902625546739': {
                itemName: 'E801',
                color: 'JWC',
                size: 'XXL'
            },
        
            '8902625589712': {
                itemName: 'E801',
                color: 'NYL',
                size: 'L'
            },
        
            '8902625589729': {
                itemName: 'E801',
                color: 'NYL',
                size: 'M'
            },
        
            '8902625589736': {
                itemName: 'E801',
                color: 'NYL',
                size: 'S'
            },
        
            '8902625589743': {
                itemName: 'E801',
                color: 'NYL',
                size: 'XL'
            },
        
            '8902625589750': {
                itemName: 'E801',
                color: 'NYL',
                size: 'XXL'
            },
        
            '8902625589767': {
                itemName: 'E801',
                color: 'PDL',
                size: 'L'
            },
        
            '8902625589774': {
                itemName: 'E801',
                color: 'PDL',
                size: 'M'
            },
        
            '8902625589781': {
                itemName: 'E801',
                color: 'PDL',
                size: 'S'
            },
        
            '8902625589798': {
                itemName: 'E801',
                color: 'PDL',
                size: 'XL'
            },
        
            '8902625589804': {
                itemName: 'E801',
                color: 'PDL',
                size: 'XXL'
            },
        
            '8902625589811': {
                itemName: 'E801',
                color: 'ROV',
                size: 'L'
            },
        
            '8902625589828': {
                itemName: 'E801',
                color: 'ROV',
                size: 'M'
            },
        
            '8902625589835': {
                itemName: 'E801',
                color: 'ROV',
                size: 'S'
            },
        
            '8902625589842': {
                itemName: 'E801',
                color: 'ROV',
                size: 'XL'
            },
        
            '8902625589859': {
                itemName: 'E801',
                color: 'ROV',
                size: 'XXL'
            },
        
            '8902625587817': {
                itemName: 'E802',
                color: 'BGH',
                size: 'L'
            },
        
            '8902625587824': {
                itemName: 'E802',
                color: 'BGH',
                size: 'M'
            },
        
            '8902625587831': {
                itemName: 'E802',
                color: 'BGH',
                size: 'S'
            },
        
            '8902625587848': {
                itemName: 'E802',
                color: 'BGH',
                size: 'XL'
            },
        
            '8902625587855': {
                itemName: 'E802',
                color: 'BGH',
                size: 'XXL'
            },
        
            '8902625824813': {
                itemName: 'E802',
                color: 'JGG',
                size: 'L'
            },
        
            '8902625824820': {
                itemName: 'E802',
                color: 'JGG',
                size: 'M'
            },
        
            '8902625824837': {
                itemName: 'E802',
                color: 'JGG',
                size: 'S'
            },
        
            '8902625824844': {
                itemName: 'E802',
                color: 'JGG',
                size: 'XL'
            },
        
            '8902625824851': {
                itemName: 'E802',
                color: 'JGG',
                size: 'XXL'
            },
        
            '8902625837257': {
                itemName: 'E802',
                color: 'MPGRMG',
                size: 'L'
            },
        
            '8902625837240': {
                itemName: 'E802',
                color: 'MPGRMG',
                size: 'M'
            },
        
            '8902625837288': {
                itemName: 'E802',
                color: 'MPGRMG',
                size: 'S'
            },
        
            '8902625837264': {
                itemName: 'E802',
                color: 'MPGRMG',
                size: 'XL'
            },
        
            '8902625837271': {
                itemName: 'E802',
                color: 'MPGRMG',
                size: 'XXL'
            },
        
            '8902625836946': {
                itemName: 'E802',
                color: 'NVYDGR',
                size: 'L'
            },
        
            '8902625836953': {
                itemName: 'E802',
                color: 'NVYDGR',
                size: 'M'
            },
        
            '8902625836960': {
                itemName: 'E802',
                color: 'NVYDGR',
                size: 'S'
            },
        
            '8902625836977': {
                itemName: 'E802',
                color: 'NVYDGR',
                size: 'XL'
            },
        
            '8902625836984': {
                itemName: 'E802',
                color: 'NVYDGR',
                size: 'XXL'
            },
        
            '8902625616227': {
                itemName: 'E802',
                color: 'PSF',
                size: 'L'
            },
        
            '8902625616234': {
                itemName: 'E802',
                color: 'PSF',
                size: 'M'
            },
        
            '8902625616241': {
                itemName: 'E802',
                color: 'PSF',
                size: 'S'
            },
        
            '8902625616258': {
                itemName: 'E802',
                color: 'PSF',
                size: 'XL'
            },
        
            '8902625616265': {
                itemName: 'E802',
                color: 'PSF',
                size: 'XXL'
            },
        
            '8902625587916': {
                itemName: 'E8S2',
                color: 'BTH',
                size: 'L'
            },
        
            '8902625587923': {
                itemName: 'E8S2',
                color: 'BTH',
                size: 'M'
            },
        
            '8902625587930': {
                itemName: 'E8S2',
                color: 'BTH',
                size: 'S'
            },
        
            '8902625587947': {
                itemName: 'E8S2',
                color: 'BTH',
                size: 'XL'
            },
        
            '8902625587954': {
                itemName: 'E8S2',
                color: 'BTH',
                size: 'XXL'
            },
        
            '8902625587961': {
                itemName: 'E8S2',
                color: 'BWU',
                size: 'L'
            },
        
            '8902625587978': {
                itemName: 'E8S2',
                color: 'BWU',
                size: 'M'
            },
        
            '8902625587985': {
                itemName: 'E8S2',
                color: 'BWU',
                size: 'S'
            },
        
            '8902625587992': {
                itemName: 'E8S2',
                color: 'BWU',
                size: 'XL'
            },
        
            '8902625588005': {
                itemName: 'E8S2',
                color: 'BWU',
                size: 'XXL'
            },
        
            '8902625588012': {
                itemName: 'E8S2',
                color: 'MSL',
                size: 'L'
            },
        
            '8902625588029': {
                itemName: 'E8S2',
                color: 'MSL',
                size: 'M'
            },
        
            '8902625588036': {
                itemName: 'E8S2',
                color: 'MSL',
                size: 'S'
            },
        
            '8902625588043': {
                itemName: 'E8S2',
                color: 'MSL',
                size: 'XL'
            },
        
            '8902625588050': {
                itemName: 'E8S2',
                color: 'MSL',
                size: 'XXL'
            },
        
            '8902625617323': {
                itemName: 'E901',
                color: 'AFG',
                size: 'L'
            },
        
            '8902625617330': {
                itemName: 'E901',
                color: 'AFG',
                size: 'M'
            },
        
            '8902625617347': {
                itemName: 'E901',
                color: 'AFG',
                size: 'S'
            },
        
            '8902625617354': {
                itemName: 'E901',
                color: 'AFG',
                size: 'XL'
            },
        
            '8902625617361': {
                itemName: 'E901',
                color: 'AFG',
                size: 'XXL'
            },
        
            '8902625617279': {
                itemName: 'E901',
                color: 'AGFG',
                size: 'L'
            },
        
            '8902625617286': {
                itemName: 'E901',
                color: 'AGFG',
                size: 'M'
            },
        
            '8902625617293': {
                itemName: 'E901',
                color: 'AGFG',
                size: 'S'
            },
        
            '8902625617309': {
                itemName: 'E901',
                color: 'AGFG',
                size: 'XL'
            },
        
            '8902625617316': {
                itemName: 'E901',
                color: 'AGFG',
                size: 'XXL'
            },
        
            '8902625481276': {
                itemName: 'E901',
                color: 'CWR',
                size: 'L'
            },
        
            '8902625481283': {
                itemName: 'E901',
                color: 'CWR',
                size: 'M'
            },
        
            '8902625481290': {
                itemName: 'E901',
                color: 'CWR',
                size: 'S'
            },
        
            '8902625481306': {
                itemName: 'E901',
                color: 'CWR',
                size: 'XL'
            },
        
            '8902625481313': {
                itemName: 'E901',
                color: 'CWR',
                size: 'XXL'
            },
        
            '8902625617378': {
                itemName: 'E901',
                color: 'JBFG',
                size: 'L'
            },
        
            '8902625617385': {
                itemName: 'E901',
                color: 'JBFG',
                size: 'M'
            },
        
            '8902625617392': {
                itemName: 'E901',
                color: 'JBFG',
                size: 'S'
            },
        
            '8902625617408': {
                itemName: 'E901',
                color: 'JBFG',
                size: 'XL'
            },
        
            '8902625617415': {
                itemName: 'E901',
                color: 'JBFG',
                size: 'XXL'
            },
        
            '8902625481320': {
                itemName: 'E901',
                color: 'JWL',
                size: 'L'
            },
        
            '8902625481337': {
                itemName: 'E901',
                color: 'JWL',
                size: 'M'
            },
        
            '8902625481344': {
                itemName: 'E901',
                color: 'JWL',
                size: 'S'
            },
        
            '8902625481351': {
                itemName: 'E901',
                color: 'JWL',
                size: 'XL'
            },
        
            '8902625009524': {
                itemName: 'E903',
                color: 'DYB',
                size: 'L'
            },
        
            '8902625009517': {
                itemName: 'E903',
                color: 'DYB',
                size: 'M'
            },
        
            '8902625009500': {
                itemName: 'E903',
                color: 'DYB',
                size: 'S'
            },
        
            '8902625009531': {
                itemName: 'E903',
                color: 'DYB',
                size: 'XL'
            },
        
            '8902625009548': {
                itemName: 'E903',
                color: 'DYB',
                size: 'XXL'
            },
        
            '8902625009579': {
                itemName: 'E903',
                color: 'MLD',
                size: 'L'
            },
        
            '8902625009562': {
                itemName: 'E903',
                color: 'MLD',
                size: 'M'
            },
        
            '8902625009555': {
                itemName: 'E903',
                color: 'MLD',
                size: 'S'
            },
        
            '8902625009586': {
                itemName: 'E903',
                color: 'MLD',
                size: 'XL'
            },
        
            '8902625009593': {
                itemName: 'E903',
                color: 'MLD',
                size: 'XXL'
            },
        
            '8902625043368': {
                itemName: 'E904',
                color: 'BBELL',
                size: 'L'
            },
        
            '8902625043351': {
                itemName: 'E904',
                color: 'BBELL',
                size: 'M'
            },
        
            '8902625043344': {
                itemName: 'E904',
                color: 'BBELL',
                size: 'S'
            },
        
            '8902625043375': {
                itemName: 'E904',
                color: 'BBELL',
                size: 'XL'
            },
        
            '8902625043382': {
                itemName: 'E904',
                color: 'BBELL',
                size: 'XXL'
            },
        
            '8902625043313': {
                itemName: 'E904',
                color: 'BLKMEL',
                size: 'L'
            },
        
            '8902625043306': {
                itemName: 'E904',
                color: 'BLKMEL',
                size: 'M'
            },
        
            '8902625043290': {
                itemName: 'E904',
                color: 'BLKMEL',
                size: 'S'
            },
        
            '8902625043320': {
                itemName: 'E904',
                color: 'BLKMEL',
                size: 'XL'
            },
        
            '8902625043337': {
                itemName: 'E904',
                color: 'BLKMEL',
                size: 'XXL'
            },
        
            '8902625043412': {
                itemName: 'E904',
                color: 'MDBMEL',
                size: 'L'
            },
        
            '8902625043405': {
                itemName: 'E904',
                color: 'MDBMEL',
                size: 'M'
            },
        
            '8902625043399': {
                itemName: 'E904',
                color: 'MDBMEL',
                size: 'S'
            },
        
            '8902625043429': {
                itemName: 'E904',
                color: 'MDBMEL',
                size: 'XL'
            },
        
            '8902625043436': {
                itemName: 'E904',
                color: 'MDBMEL',
                size: 'XXL'
            },
        
            '8902625043467': {
                itemName: 'E904',
                color: 'REOC',
                size: 'L'
            },
        
            '8902625043450': {
                itemName: 'E904',
                color: 'REOC',
                size: 'M'
            },
        
            '8902625043443': {
                itemName: 'E904',
                color: 'REOC',
                size: 'S'
            },
        
            '8902625043474': {
                itemName: 'E904',
                color: 'REOC',
                size: 'XL'
            },
        
            '8902625043481': {
                itemName: 'E904',
                color: 'REOC',
                size: 'XXL'
            },
        
            '8902625042040': {
                itemName: 'E9G2',
                color: 'CAPTGR',
                size: 'L'
            },
        
            '8902625042033': {
                itemName: 'E9G2',
                color: 'CAPTGR',
                size: 'M'
            },
        
            '8902625042026': {
                itemName: 'E9G2',
                color: 'CAPTGR',
                size: 'S'
            },
        
            '8902625042057': {
                itemName: 'E9G2',
                color: 'CAPTGR',
                size: 'XL'
            },
        
            '8902625042064': {
                itemName: 'E9G2',
                color: 'CAPTGR',
                size: 'XXL'
            },
        
            '8902625042149': {
                itemName: 'E9G2',
                color: 'JBNSGR',
                size: 'L'
            },
        
            '8902625042132': {
                itemName: 'E9G2',
                color: 'JBNSGR',
                size: 'M'
            },
        
            '8902625042125': {
                itemName: 'E9G2',
                color: 'JBNSGR',
                size: 'S'
            },
        
            '8902625042156': {
                itemName: 'E9G2',
                color: 'JBNSGR',
                size: 'XL'
            },
        
            '8902625042163': {
                itemName: 'E9G2',
                color: 'JBNSGR',
                size: 'XXL'
            },
        
            '8902625041999': {
                itemName: 'E9G2',
                color: 'ROUTGR',
                size: 'L'
            },
        
            '8902625041982': {
                itemName: 'E9G2',
                color: 'ROUTGR',
                size: 'M'
            },
        
            '8902625041975': {
                itemName: 'E9G2',
                color: 'ROUTGR',
                size: 'S'
            },
        
            '8902625042002': {
                itemName: 'E9G2',
                color: 'ROUTGR',
                size: 'XL'
            },
        
            '8902625042019': {
                itemName: 'E9G2',
                color: 'ROUTGR',
                size: 'XXL'
            },
        
            '8902625042095': {
                itemName: 'E9G2',
                color: 'SSNSGR',
                size: 'L'
            },
        
            '8902625042088': {
                itemName: 'E9G2',
                color: 'SSNSGR',
                size: 'M'
            },
        
            '8902625042071': {
                itemName: 'E9G2',
                color: 'SSNSGR',
                size: 'S'
            },
        
            '8902625042101': {
                itemName: 'E9G2',
                color: 'SSNSGR',
                size: 'XL'
            },
        
            '8902625042118': {
                itemName: 'E9G2',
                color: 'SSNSGR',
                size: 'XXL'
            },
        
            '8902625824868': {
                itemName: 'EA61',
                color: 'BWI',
                size: 'L'
            },
        
            '8902625824875': {
                itemName: 'EA61',
                color: 'BWI',
                size: 'M'
            },
        
            '8902625824882': {
                itemName: 'EA61',
                color: 'BWI',
                size: 'XL'
            },
        
            '8902625824899': {
                itemName: 'EA61',
                color: 'BWI',
                size: 'XXL'
            },
        
            '8902625617828': {
                itemName: 'EA61',
                color: 'DBRSG',
                size: 'L'
            },
        
            '8902625617835': {
                itemName: 'EA61',
                color: 'DBRSG',
                size: 'M'
            },
        
            '8902625617842': {
                itemName: 'EA61',
                color: 'DBRSG',
                size: 'XL'
            },
        
            '8902625617859': {
                itemName: 'EA61',
                color: 'DBRSG',
                size: 'XXL'
            },
        
            '8902625824905': {
                itemName: 'EA61',
                color: 'FGS',
                size: 'L'
            },
        
            '8902625824912': {
                itemName: 'EA61',
                color: 'FGS',
                size: 'M'
            },
        
            '8902625824929': {
                itemName: 'EA61',
                color: 'FGS',
                size: 'XL'
            },
        
            '8902625824936': {
                itemName: 'EA61',
                color: 'FGS',
                size: 'XXL'
            },
        
            '8902625617866': {
                itemName: 'EA61',
                color: 'GSSR',
                size: 'L'
            },
        
            '8902625617873': {
                itemName: 'EA61',
                color: 'GSSR',
                size: 'M'
            },
        
            '8902625617880': {
                itemName: 'EA61',
                color: 'GSSR',
                size: 'XL'
            },
        
            '8902625617897': {
                itemName: 'EA61',
                color: 'GSSR',
                size: 'XXL'
            },
        
            '8902625840844': {
                itemName: 'EA64',
                color: 'BLKPAO',
                size: 'L'
            },
        
            '8902625840851': {
                itemName: 'EA64',
                color: 'BLKPAO',
                size: 'M'
            },
        
            '8902625840868': {
                itemName: 'EA64',
                color: 'BLKPAO',
                size: 'S'
            },
        
            '8902625840875': {
                itemName: 'EA64',
                color: 'BLKPAO',
                size: 'XL'
            },
        
            '8902625840899': {
                itemName: 'EA64',
                color: 'LVNDMA',
                size: 'L'
            },
        
            '8902625840905': {
                itemName: 'EA64',
                color: 'LVNDMA',
                size: 'M'
            },
        
            '8902625840912': {
                itemName: 'EA64',
                color: 'LVNDMA',
                size: 'S'
            },
        
            '8902625840929': {
                itemName: 'EA64',
                color: 'LVNDMA',
                size: 'XL'
            },
        
            '8902625840936': {
                itemName: 'EA64',
                color: 'LVNDMA',
                size: 'XXL'
            },
        
            '8902625604552': {
                itemName: 'EA64',
                color: 'NSO',
                size: 'L'
            },
        
            '8902625604569': {
                itemName: 'EA64',
                color: 'NSO',
                size: 'M'
            },
        
            '8902625604576': {
                itemName: 'EA64',
                color: 'NSO',
                size: 'S'
            },
        
            '8902625604583': {
                itemName: 'EA64',
                color: 'NSO',
                size: 'XL'
            },
        
            '8902625840943': {
                itemName: 'EA64',
                color: 'NVYOA',
                size: 'L'
            },
        
            '8902625840950': {
                itemName: 'EA64',
                color: 'NVYOA',
                size: 'M'
            },
        
            '8902625840967': {
                itemName: 'EA64',
                color: 'NVYOA',
                size: 'S'
            },
        
            '8902625840974': {
                itemName: 'EA64',
                color: 'NVYOA',
                size: 'XL'
            },
        
            '8902625840981': {
                itemName: 'EA64',
                color: 'NVYOA',
                size: 'XXL'
            },
        
            '8902625840998': {
                itemName: 'EA64',
                color: 'STRBDD',
                size: 'L'
            },
        
            '8902625841001': {
                itemName: 'EA64',
                color: 'STRBDD',
                size: 'M'
            },
        
            '8902625841018': {
                itemName: 'EA64',
                color: 'STRBDD',
                size: 'S'
            },
        
            '8902625841025': {
                itemName: 'EA64',
                color: 'STRBDD',
                size: 'XL'
            },
        
            '8902625841032': {
                itemName: 'EA64',
                color: 'STRBDD',
                size: 'XXL'
            },
        
            '8902625838193': {
                itemName: 'EC13',
                color: 'BLKBAO',
                size: 'L'
            },
        
            '8902625838209': {
                itemName: 'EC13',
                color: 'BLKBAO',
                size: 'M'
            },
        
            '8902625838216': {
                itemName: 'EC13',
                color: 'BLKBAO',
                size: 'S'
            },
        
            '8902625838223': {
                itemName: 'EC13',
                color: 'BLKBAO',
                size: 'XL'
            },
        
            '8902625838230': {
                itemName: 'EC13',
                color: 'BLKBAO',
                size: 'XXL'
            },
        
            '8902625605733': {
                itemName: 'EC13',
                color: 'NHO',
                size: 'L'
            },
        
            '8902625605740': {
                itemName: 'EC13',
                color: 'NHO',
                size: 'M'
            },
        
            '8902625605757': {
                itemName: 'EC13',
                color: 'NHO',
                size: 'S'
            },
        
            '8902625605764': {
                itemName: 'EC13',
                color: 'NHO',
                size: 'XL'
            },
        
            '8902625838247': {
                itemName: 'EC13',
                color: 'RBNBA',
                size: 'L'
            },
        
            '8902625838254': {
                itemName: 'EC13',
                color: 'RBNBA',
                size: 'M'
            },
        
            '8902625838261': {
                itemName: 'EC13',
                color: 'RBNBA',
                size: 'S'
            },
        
            '8902625838278': {
                itemName: 'EC13',
                color: 'RBNBA',
                size: 'XL'
            },
        
            '8902625838285': {
                itemName: 'EC13',
                color: 'RBNBA',
                size: 'XXL'
            },
        
            '8902625838346': {
                itemName: 'EC13',
                color: 'SFPBPA',
                size: 'L'
            },
        
            '8902625838353': {
                itemName: 'EC13',
                color: 'SFPBPA',
                size: 'M'
            },
        
            '8902625838360': {
                itemName: 'EC13',
                color: 'SFPBPA',
                size: 'S'
            },
        
            '8902625838377': {
                itemName: 'EC13',
                color: 'SFPBPA',
                size: 'XL'
            },
        
            '8902625838384': {
                itemName: 'EC13',
                color: 'SFPBPA',
                size: 'XXL'
            },
        
            '8902625838292': {
                itemName: 'EC13',
                color: 'SFTGBA',
                size: 'L'
            },
        
            '8902625838308': {
                itemName: 'EC13',
                color: 'SFTGBA',
                size: 'M'
            },
        
            '8902625838315': {
                itemName: 'EC13',
                color: 'SFTGBA',
                size: 'S'
            },
        
            '8902625838322': {
                itemName: 'EC13',
                color: 'SFTGBA',
                size: 'XL'
            },
        
            '8902625838339': {
                itemName: 'EC13',
                color: 'SFTGBA',
                size: 'XXL'
            },
        
            '8902625605832': {
                itemName: 'EC14',
                color: 'BDY',
                size: 'L'
            },
        
            '8902625605849': {
                itemName: 'EC14',
                color: 'BDY',
                size: 'M'
            },
        
            '8902625605856': {
                itemName: 'EC14',
                color: 'BDY',
                size: 'S'
            },
        
            '8902625605863': {
                itemName: 'EC14',
                color: 'BDY',
                size: 'XL'
            },
        
            '8902625605870': {
                itemName: 'EC14',
                color: 'BDY',
                size: 'XXL'
            },
        
            '8902625841049': {
                itemName: 'EC14',
                color: 'JBOP',
                size: 'L'
            },
        
            '8902625841056': {
                itemName: 'EC14',
                color: 'JBOP',
                size: 'M'
            },
        
            '8902625841063': {
                itemName: 'EC14',
                color: 'JBOP',
                size: 'S'
            },
        
            '8902625841070': {
                itemName: 'EC14',
                color: 'JBOP',
                size: 'XL'
            },
        
            '8902625841087': {
                itemName: 'EC14',
                color: 'JBOP',
                size: 'XXL'
            },
        
            '8902625605887': {
                itemName: 'EC14',
                color: 'JCY',
                size: 'L'
            },
        
            '8902625605894': {
                itemName: 'EC14',
                color: 'JCY',
                size: 'M'
            },
        
            '8902625605900': {
                itemName: 'EC14',
                color: 'JCY',
                size: 'S'
            },
        
            '8902625605917': {
                itemName: 'EC14',
                color: 'JCY',
                size: 'XL'
            },
        
            '8902625605924': {
                itemName: 'EC14',
                color: 'JCY',
                size: 'XXL'
            },
        
            '8902625841094': {
                itemName: 'EC14',
                color: 'NSTDA',
                size: 'L'
            },
        
            '8902625841100': {
                itemName: 'EC14',
                color: 'NSTDA',
                size: 'M'
            },
        
            '8902625841117': {
                itemName: 'EC14',
                color: 'NSTDA',
                size: 'S'
            },
        
            '8902625841124': {
                itemName: 'EC14',
                color: 'NSTDA',
                size: 'XL'
            },
        
            '8902625841131': {
                itemName: 'EC14',
                color: 'NSTDA',
                size: 'XXL'
            },
        
            '8902625605931': {
                itemName: 'EC14',
                color: 'NVTAOP',
                size: 'L'
            },
        
            '8902625605948': {
                itemName: 'EC14',
                color: 'NVTAOP',
                size: 'M'
            },
        
            '8902625605955': {
                itemName: 'EC14',
                color: 'NVTAOP',
                size: 'S'
            },
        
            '8902625605962': {
                itemName: 'EC14',
                color: 'NVTAOP',
                size: 'XL'
            },
        
            '8902625841148': {
                itemName: 'EC14',
                color: 'PTSTDA',
                size: 'L'
            },
        
            '8902625841155': {
                itemName: 'EC14',
                color: 'PTSTDA',
                size: 'M'
            },
        
            '8902625841162': {
                itemName: 'EC14',
                color: 'PTSTDA',
                size: 'S'
            },
        
            '8902625841179': {
                itemName: 'EC14',
                color: 'PTSTDA',
                size: 'XL'
            },
        
            '8902625841186': {
                itemName: 'EC14',
                color: 'PTSTDA',
                size: 'XXL'
            },
        
            '8902625605986': {
                itemName: 'EC14',
                color: 'RIY',
                size: 'L'
            },
        
            '8902625605993': {
                itemName: 'EC14',
                color: 'RIY',
                size: 'M'
            },
        
            '8902625606006': {
                itemName: 'EC14',
                color: 'RIY',
                size: 'S'
            },
        
            '8902625606013': {
                itemName: 'EC14',
                color: 'RIY',
                size: 'XL'
            },
        
            '8902625606020': {
                itemName: 'EC14',
                color: 'RIY',
                size: 'XXL'
            },
        
            '8902625841193': {
                itemName: 'EC14',
                color: 'SGSTDA',
                size: 'L'
            },
        
            '8902625841209': {
                itemName: 'EC14',
                color: 'SGSTDA',
                size: 'M'
            },
        
            '8902625841216': {
                itemName: 'EC14',
                color: 'SGSTDA',
                size: 'S'
            },
        
            '8902625841223': {
                itemName: 'EC14',
                color: 'SGSTDA',
                size: 'XL'
            },
        
            '8902625841230': {
                itemName: 'EC14',
                color: 'SGSTDA',
                size: 'XXL'
            },
        
            '8902625841247': {
                itemName: 'EC16',
                color: 'JTBMNC',
                size: 'L'
            },
        
            '8902625841254': {
                itemName: 'EC16',
                color: 'JTBMNC',
                size: 'M'
            },
        
            '8902625841261': {
                itemName: 'EC16',
                color: 'JTBMNC',
                size: 'S'
            },
        
            '8902625841278': {
                itemName: 'EC16',
                color: 'JTBMNC',
                size: 'XL'
            },
        
            '8902625841285': {
                itemName: 'EC16',
                color: 'JTBMNC',
                size: 'XXL'
            },
        
            '8902625841292': {
                itemName: 'EC16',
                color: 'NVYSCM',
                size: 'L'
            },
        
            '8902625841308': {
                itemName: 'EC16',
                color: 'NVYSCM',
                size: 'M'
            },
        
            '8902625841315': {
                itemName: 'EC16',
                color: 'NVYSCM',
                size: 'S'
            },
        
            '8902625841322': {
                itemName: 'EC16',
                color: 'NVYSCM',
                size: 'XL'
            },
        
            '8902625841339': {
                itemName: 'EC16',
                color: 'NVYSCM',
                size: 'XXL'
            },
        
            '8902625841346': {
                itemName: 'EC16',
                color: 'SFTLMC',
                size: 'L'
            },
        
            '8902625841353': {
                itemName: 'EC16',
                color: 'SFTLMC',
                size: 'M'
            },
        
            '8902625841360': {
                itemName: 'EC16',
                color: 'SFTLMC',
                size: 'S'
            },
        
            '8902625841377': {
                itemName: 'EC16',
                color: 'SFTLMC',
                size: 'XL'
            },
        
            '8902625841384': {
                itemName: 'EC16',
                color: 'SFTLMC',
                size: 'XXL'
            },
        
            '8902625841391': {
                itemName: 'EC16',
                color: 'SFTPSC',
                size: 'L'
            },
        
            '8902625841407': {
                itemName: 'EC16',
                color: 'SFTPSC',
                size: 'M'
            },
        
            '8902625841414': {
                itemName: 'EC16',
                color: 'SFTPSC',
                size: 'S'
            },
        
            '8902625841421': {
                itemName: 'EC16',
                color: 'SFTPSC',
                size: 'XL'
            },
        
            '8902625841438': {
                itemName: 'EC16',
                color: 'SFTPSC',
                size: 'XXL'
            },
        
            '8902625621283': {
                itemName: 'EC18',
                color: 'GSTDA',
                size: 'L'
            },
        
            '8902625621290': {
                itemName: 'EC18',
                color: 'GSTDA',
                size: 'M'
            },
        
            '8902625621306': {
                itemName: 'EC18',
                color: 'GSTDA',
                size: 'S'
            },
        
            '8902625621313': {
                itemName: 'EC18',
                color: 'GSTDA',
                size: 'XL'
            },
        
            '8902625621320': {
                itemName: 'EC18',
                color: 'GSTDA',
                size: 'XXL'
            },
        
            '8902625621382': {
                itemName: 'EC18',
                color: 'JCY',
                size: 'L'
            },
        
            '8902625621399': {
                itemName: 'EC18',
                color: 'JCY',
                size: 'M'
            },
        
            '8902625621405': {
                itemName: 'EC18',
                color: 'JCY',
                size: 'S'
            },
        
            '8902625621412': {
                itemName: 'EC18',
                color: 'JCY',
                size: 'XL'
            },
        
            '8902625621429': {
                itemName: 'EC18',
                color: 'JCY',
                size: 'XXL'
            },
        
            '8902625621337': {
                itemName: 'EC18',
                color: 'NVTAOP',
                size: 'L'
            },
        
            '8902625621344': {
                itemName: 'EC18',
                color: 'NVTAOP',
                size: 'M'
            },
        
            '8902625621351': {
                itemName: 'EC18',
                color: 'NVTAOP',
                size: 'S'
            },
        
            '8902625621368': {
                itemName: 'EC18',
                color: 'NVTAOP',
                size: 'XL'
            },
        
            '8902625621375': {
                itemName: 'EC18',
                color: 'NVTAOP',
                size: 'XXL'
            },
        
            '8902625621238': {
                itemName: 'EC18',
                color: 'PSD',
                size: 'L'
            },
        
            '8902625621245': {
                itemName: 'EC18',
                color: 'PSD',
                size: 'M'
            },
        
            '8902625621252': {
                itemName: 'EC18',
                color: 'PSD',
                size: 'S'
            },
        
            '8902625621269': {
                itemName: 'EC18',
                color: 'PSD',
                size: 'XL'
            },
        
            '8902625621276': {
                itemName: 'EC18',
                color: 'PSD',
                size: 'XXL'
            },
        
            '8902625621580': {
                itemName: 'EC19',
                color: 'JBSA',
                size: 'L'
            },
        
            '8902625621597': {
                itemName: 'EC19',
                color: 'JBSA',
                size: 'M'
            },
        
            '8902625621603': {
                itemName: 'EC19',
                color: 'JBSA',
                size: 'S'
            },
        
            '8902625621610': {
                itemName: 'EC19',
                color: 'JBSA',
                size: 'XL'
            },
        
            '8902625621627': {
                itemName: 'EC19',
                color: 'JBSA',
                size: 'XXL'
            },
        
            '8902625621535': {
                itemName: 'EC19',
                color: 'NVYCIR',
                size: 'L'
            },
        
            '8902625621542': {
                itemName: 'EC19',
                color: 'NVYCIR',
                size: 'M'
            },
        
            '8902625621559': {
                itemName: 'EC19',
                color: 'NVYCIR',
                size: 'S'
            },
        
            '8902625621566': {
                itemName: 'EC19',
                color: 'NVYCIR',
                size: 'XL'
            },
        
            '8902625621573': {
                itemName: 'EC19',
                color: 'NVYCIR',
                size: 'XXL'
            },
        
            '8902625621481': {
                itemName: 'EC19',
                color: 'PSSAOP',
                size: 'L'
            },
        
            '8902625621498': {
                itemName: 'EC19',
                color: 'PSSAOP',
                size: 'M'
            },
        
            '8902625621504': {
                itemName: 'EC19',
                color: 'PSSAOP',
                size: 'S'
            },
        
            '8902625621511': {
                itemName: 'EC19',
                color: 'PSSAOP',
                size: 'XL'
            },
        
            '8902625621528': {
                itemName: 'EC19',
                color: 'PSSAOP',
                size: 'XXL'
            },
        
            '8902625621436': {
                itemName: 'EC19',
                color: 'TCCA',
                size: 'L'
            },
        
            '8902625621443': {
                itemName: 'EC19',
                color: 'TCCA',
                size: 'M'
            },
        
            '8902625621450': {
                itemName: 'EC19',
                color: 'TCCA',
                size: 'S'
            },
        
            '8902625621467': {
                itemName: 'EC19',
                color: 'TCCA',
                size: 'XL'
            },
        
            '8902625621474': {
                itemName: 'EC19',
                color: 'TCCA',
                size: 'XXL'
            },
        
            '8902625552778': {
                itemName: 'A014',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625552785': {
                itemName: 'A014',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625552792': {
                itemName: 'A014',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625552815': {
                itemName: 'A014',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625552822': {
                itemName: 'A014',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625552839': {
                itemName: 'A014',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625552846': {
                itemName: 'A014',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625552860': {
                itemName: 'A014',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625552877': {
                itemName: 'A014',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625552884': {
                itemName: 'A014',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625552891': {
                itemName: 'A014',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625552907': {
                itemName: 'A014',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625552914': {
                itemName: 'A014',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625552921': {
                itemName: 'A014',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625552938': {
                itemName: 'A014',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625552945': {
                itemName: 'A014',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625552952': {
                itemName: 'A014',
                color: 'BLACK',
                size: '42B'
            },
        
            '8902625552969': {
                itemName: 'A014',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625552976': {
                itemName: 'A014',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625552983': {
                itemName: 'A014',
                color: 'BLACK',
                size: '42Z'
            },
        
            '8902625552990': {
                itemName: 'A014',
                color: 'MASAI',
                size: '34B'
            },
        
            '8902625553003': {
                itemName: 'A014',
                color: 'MASAI',
                size: '34C'
            },
        
            '8902625553010': {
                itemName: 'A014',
                color: 'MASAI',
                size: '34D'
            },
        
            '8902625553034': {
                itemName: 'A014',
                color: 'MASAI',
                size: '34Z'
            },
        
            '8902625553041': {
                itemName: 'A014',
                color: 'MASAI',
                size: '36B'
            },
        
            '8902625553058': {
                itemName: 'A014',
                color: 'MASAI',
                size: '36C'
            },
        
            '8902625553065': {
                itemName: 'A014',
                color: 'MASAI',
                size: '36D'
            },
        
            '8902625553089': {
                itemName: 'A014',
                color: 'MASAI',
                size: '36Z'
            },
        
            '8902625553096': {
                itemName: 'A014',
                color: 'MASAI',
                size: '38B'
            },
        
            '8902625553102': {
                itemName: 'A014',
                color: 'MASAI',
                size: '38C'
            },
        
            '8902625553119': {
                itemName: 'A014',
                color: 'MASAI',
                size: '38D'
            },
        
            '8902625553126': {
                itemName: 'A014',
                color: 'MASAI',
                size: '38Z'
            },
        
            '8902625553133': {
                itemName: 'A014',
                color: 'MASAI',
                size: '40B'
            },
        
            '8902625553140': {
                itemName: 'A014',
                color: 'MASAI',
                size: '40C'
            },
        
            '8902625553157': {
                itemName: 'A014',
                color: 'MASAI',
                size: '40D'
            },
        
            '8902625553164': {
                itemName: 'A014',
                color: 'MASAI',
                size: '40Z'
            },
        
            '8902625553171': {
                itemName: 'A014',
                color: 'MASAI',
                size: '42B'
            },
        
            '8902625553188': {
                itemName: 'A014',
                color: 'MASAI',
                size: '42C'
            },
        
            '8902625553195': {
                itemName: 'A014',
                color: 'MASAI',
                size: '42D'
            },
        
            '8902625553201': {
                itemName: 'A014',
                color: 'MASAI',
                size: '42Z'
            },
        
            '8902625553218': {
                itemName: 'A014',
                color: 'PEARL',
                size: '34B'
            },
        
            '8902625553225': {
                itemName: 'A014',
                color: 'PEARL',
                size: '34C'
            },
        
            '8902625553232': {
                itemName: 'A014',
                color: 'PEARL',
                size: '34D'
            },
        
            '8902625553256': {
                itemName: 'A014',
                color: 'PEARL',
                size: '34Z'
            },
        
            '8902625553263': {
                itemName: 'A014',
                color: 'PEARL',
                size: '36B'
            },
        
            '8902625553270': {
                itemName: 'A014',
                color: 'PEARL',
                size: '36C'
            },
        
            '8902625553287': {
                itemName: 'A014',
                color: 'PEARL',
                size: '36D'
            },
        
            '8902625553300': {
                itemName: 'A014',
                color: 'PEARL',
                size: '36Z'
            },
        
            '8902625553317': {
                itemName: 'A014',
                color: 'PEARL',
                size: '38B'
            },
        
            '8902625553324': {
                itemName: 'A014',
                color: 'PEARL',
                size: '38C'
            },
        
            '8902625553331': {
                itemName: 'A014',
                color: 'PEARL',
                size: '38D'
            },
        
            '8902625553348': {
                itemName: 'A014',
                color: 'PEARL',
                size: '38Z'
            },
        
            '8902625553355': {
                itemName: 'A014',
                color: 'PEARL',
                size: '40B'
            },
        
            '8902625553362': {
                itemName: 'A014',
                color: 'PEARL',
                size: '40C'
            },
        
            '8902625553379': {
                itemName: 'A014',
                color: 'PEARL',
                size: '40D'
            },
        
            '8902625553386': {
                itemName: 'A014',
                color: 'PEARL',
                size: '40Z'
            },
        
            '8902625553393': {
                itemName: 'A014',
                color: 'PEARL',
                size: '42B'
            },
        
            '8902625553409': {
                itemName: 'A014',
                color: 'PEARL',
                size: '42C'
            },
        
            '8902625553416': {
                itemName: 'A014',
                color: 'PEARL',
                size: '42D'
            },
        
            '8902625553423': {
                itemName: 'A014',
                color: 'PEARL',
                size: '42Z'
            },
        
            '8902625553430': {
                itemName: 'A014',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625553447': {
                itemName: 'A014',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625553454': {
                itemName: 'A014',
                color: 'SKIN',
                size: '34D'
            },
        
            '8902625553478': {
                itemName: 'A014',
                color: 'SKIN',
                size: '34Z'
            },
        
            '8902625553485': {
                itemName: 'A014',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625553492': {
                itemName: 'A014',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625553508': {
                itemName: 'A014',
                color: 'SKIN',
                size: '36D'
            },
        
            '8902625553522': {
                itemName: 'A014',
                color: 'SKIN',
                size: '36Z'
            },
        
            '8902625553539': {
                itemName: 'A014',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625553546': {
                itemName: 'A014',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625553553': {
                itemName: 'A014',
                color: 'SKIN',
                size: '38D'
            },
        
            '8902625553560': {
                itemName: 'A014',
                color: 'SKIN',
                size: '38Z'
            },
        
            '8902625553577': {
                itemName: 'A014',
                color: 'SKIN',
                size: '40B'
            },
        
            '8902625553584': {
                itemName: 'A014',
                color: 'SKIN',
                size: '40C'
            },
        
            '8902625553591': {
                itemName: 'A014',
                color: 'SKIN',
                size: '40D'
            },
        
            '8902625553607': {
                itemName: 'A014',
                color: 'SKIN',
                size: '40Z'
            },
        
            '8902625553614': {
                itemName: 'A014',
                color: 'SKIN',
                size: '42B'
            },
        
            '8902625553621': {
                itemName: 'A014',
                color: 'SKIN',
                size: '42C'
            },
        
            '8902625553638': {
                itemName: 'A014',
                color: 'SKIN',
                size: '42D'
            },
        
            '8902625553645': {
                itemName: 'A014',
                color: 'SKIN',
                size: '42Z'
            },
        
            '8902625593580': {
                itemName: 'A017',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625593627': {
                itemName: 'A017',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625593597': {
                itemName: 'A017',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625593603': {
                itemName: 'A017',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625593573': {
                itemName: 'A017',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625593535': {
                itemName: 'A017',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625593542': {
                itemName: 'A017',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625593566': {
                itemName: 'A017',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625593559': {
                itemName: 'A017',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625593610': {
                itemName: 'A017',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625593634': {
                itemName: 'A017',
                color: 'BLACK',
                size: '38C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '32B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '32C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '32D'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '34B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '34C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '34D'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '36B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '36C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '36D'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '38B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'BPRP',
                size: '38C'
            },
        
            '8902625551023': {
                itemName: 'A017',
                color: 'CPM',
                size: '32B'
            },
        
            '8902625551030': {
                itemName: 'A017',
                color: 'CPM',
                size: '32C'
            },
        
            '8902625551047': {
                itemName: 'A017',
                color: 'CPM',
                size: '32D'
            },
        
            '8902625553874': {
                itemName: 'A017',
                color: 'CPM',
                size: '34B'
            },
        
            '8902625553881': {
                itemName: 'A017',
                color: 'CPM',
                size: '34C'
            },
        
            '8902625553898': {
                itemName: 'A017',
                color: 'CPM',
                size: '34D'
            },
        
            '8902625553904': {
                itemName: 'A017',
                color: 'CPM',
                size: '36B'
            },
        
            '8902625553911': {
                itemName: 'A017',
                color: 'CPM',
                size: '36C'
            },
        
            '8902625553928': {
                itemName: 'A017',
                color: 'CPM',
                size: '36D'
            },
        
            '8902625553935': {
                itemName: 'A017',
                color: 'CPM',
                size: '38B'
            },
        
            '8902625553942': {
                itemName: 'A017',
                color: 'CPM',
                size: '38C'
            },
        
            '8902625607447': {
                itemName: 'A017',
                color: 'GKP',
                size: '32B'
            },
        
            '8902625607454': {
                itemName: 'A017',
                color: 'GKP',
                size: '32C'
            },
        
            '8902625607461': {
                itemName: 'A017',
                color: 'GKP',
                size: '32D'
            },
        
            '8902625607478': {
                itemName: 'A017',
                color: 'GKP',
                size: '34B'
            },
        
            '8902625607485': {
                itemName: 'A017',
                color: 'GKP',
                size: '34C'
            },
        
            '8902625607492': {
                itemName: 'A017',
                color: 'GKP',
                size: '34D'
            },
        
            '8902625607508': {
                itemName: 'A017',
                color: 'GKP',
                size: '36B'
            },
        
            '8902625607515': {
                itemName: 'A017',
                color: 'GKP',
                size: '36C'
            },
        
            '8902625607522': {
                itemName: 'A017',
                color: 'GKP',
                size: '36D'
            },
        
            '8902625607539': {
                itemName: 'A017',
                color: 'GKP',
                size: '38B'
            },
        
            '8902625607546': {
                itemName: 'A017',
                color: 'GKP',
                size: '38C'
            },
        
            '8902625551054': {
                itemName: 'A017',
                color: 'ODM',
                size: '32B'
            },
        
            '8902625551061': {
                itemName: 'A017',
                color: 'ODM',
                size: '32C'
            },
        
            '8902625551078': {
                itemName: 'A017',
                color: 'ODM',
                size: '32D'
            },
        
            '8902625553959': {
                itemName: 'A017',
                color: 'ODM',
                size: '34B'
            },
        
            '8902625553966': {
                itemName: 'A017',
                color: 'ODM',
                size: '34C'
            },
        
            '8902625553973': {
                itemName: 'A017',
                color: 'ODM',
                size: '34D'
            },
        
            '8902625553980': {
                itemName: 'A017',
                color: 'ODM',
                size: '36B'
            },
        
            '8902625553997': {
                itemName: 'A017',
                color: 'ODM',
                size: '36C'
            },
        
            '8902625554000': {
                itemName: 'A017',
                color: 'ODM',
                size: '36D'
            },
        
            '8902625554017': {
                itemName: 'A017',
                color: 'ODM',
                size: '38B'
            },
        
            '8902625554024': {
                itemName: 'A017',
                color: 'ODM',
                size: '38C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '32B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '32C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '32D'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '34B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '34C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '34D'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '36B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '36C'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '36D'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '38B'
            },
        
            'Error 2042': {
                itemName: 'A017',
                color: 'PPRP',
                size: '38C'
            },
        
            '8902625551085': {
                itemName: 'A017',
                color: 'SKIN',
                size: '32B'
            },
        
            '8902625551092': {
                itemName: 'A017',
                color: 'SKIN',
                size: '32C'
            },
        
            '8902625551108': {
                itemName: 'A017',
                color: 'SKIN',
                size: '32D'
            },
        
            '8902625554031': {
                itemName: 'A017',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625554048': {
                itemName: 'A017',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625554055': {
                itemName: 'A017',
                color: 'SKIN',
                size: '34D'
            },
        
            '8902625554062': {
                itemName: 'A017',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625554079': {
                itemName: 'A017',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625554086': {
                itemName: 'A017',
                color: 'SKIN',
                size: '36D'
            },
        
            '8902625554093': {
                itemName: 'A017',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625554109': {
                itemName: 'A017',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625016287': {
                itemName: 'A017',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625016362': {
                itemName: 'A017',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625016294': {
                itemName: 'A017',
                color: 'WHITE',
                size: '32D'
            },
        
            '8902625016300': {
                itemName: 'A017',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625016317': {
                itemName: 'A017',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625016324': {
                itemName: 'A017',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625016331': {
                itemName: 'A017',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625016348': {
                itemName: 'A017',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625016379': {
                itemName: 'A017',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625016355': {
                itemName: 'A017',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625016386': {
                itemName: 'A017',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625567048': {
                itemName: 'A019',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625567055': {
                itemName: 'A019',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625567062': {
                itemName: 'A019',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625567079': {
                itemName: 'A019',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625567086': {
                itemName: 'A019',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625567093': {
                itemName: 'A019',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625567109': {
                itemName: 'A019',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625567116': {
                itemName: 'A019',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625835970': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '32B'
            },
        
            '8902625835987': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '32C'
            },
        
            '8902625835994': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '34B'
            },
        
            '8902625836007': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '34C'
            },
        
            '8902625836014': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '36B'
            },
        
            '8902625836021': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '36C'
            },
        
            '8902625836038': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '38B'
            },
        
            '8902625836045': {
                itemName: 'A019',
                color: 'RSBLSH',
                size: '38C'
            },
        
            '8902625567208': {
                itemName: 'A019',
                color: 'SKIN',
                size: '32B'
            },
        
            '8902625567215': {
                itemName: 'A019',
                color: 'SKIN',
                size: '32C'
            },
        
            '8902625567222': {
                itemName: 'A019',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625567239': {
                itemName: 'A019',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625567246': {
                itemName: 'A019',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625567253': {
                itemName: 'A019',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625567260': {
                itemName: 'A019',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625567277': {
                itemName: 'A019',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625037510': {
                itemName: 'A022',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625567284': {
                itemName: 'A022',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625567291': {
                itemName: 'A022',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625567307': {
                itemName: 'A022',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625567314': {
                itemName: 'A022',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625037558': {
                itemName: 'A022',
                color: 'GRYMRL',
                size: '2XL'
            },
        
            '8902625567321': {
                itemName: 'A022',
                color: 'GRYMRL',
                size: 'L'
            },
        
            '8902625567338': {
                itemName: 'A022',
                color: 'GRYMRL',
                size: 'M'
            },
        
            '8902625567345': {
                itemName: 'A022',
                color: 'GRYMRL',
                size: 'S'
            },
        
            '8902625567352': {
                itemName: 'A022',
                color: 'GRYMRL',
                size: 'XL'
            },
        
            '8902625037541': {
                itemName: 'A022',
                color: 'PEARL',
                size: '2XL'
            },
        
            '8902625567369': {
                itemName: 'A022',
                color: 'PEARL',
                size: 'L'
            },
        
            '8902625567376': {
                itemName: 'A022',
                color: 'PEARL',
                size: 'M'
            },
        
            '8902625567383': {
                itemName: 'A022',
                color: 'PEARL',
                size: 'S'
            },
        
            '8902625567390': {
                itemName: 'A022',
                color: 'PEARL',
                size: 'XL'
            },
        
            '8902625037527': {
                itemName: 'A022',
                color: 'SKIN',
                size: '2XL'
            },
        
            '8902625567406': {
                itemName: 'A022',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625567413': {
                itemName: 'A022',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625567420': {
                itemName: 'A022',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625567437': {
                itemName: 'A022',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625037534': {
                itemName: 'A022',
                color: 'WHITE',
                size: '2XL'
            },
        
            '8902625567444': {
                itemName: 'A022',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625567451': {
                itemName: 'A022',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625567468': {
                itemName: 'A022',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625567475': {
                itemName: 'A022',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625568250': {
                itemName: 'A027',
                color: 'BDE',
                size: '32B'
            },
        
            '8902625568267': {
                itemName: 'A027',
                color: 'BDE',
                size: '32C'
            },
        
            '8902625568274': {
                itemName: 'A027',
                color: 'BDE',
                size: '32D'
            },
        
            '8902625568281': {
                itemName: 'A027',
                color: 'BDE',
                size: '34B'
            },
        
            '8902625568298': {
                itemName: 'A027',
                color: 'BDE',
                size: '34C'
            },
        
            '8902625568304': {
                itemName: 'A027',
                color: 'BDE',
                size: '34D'
            },
        
            '8902625568311': {
                itemName: 'A027',
                color: 'BDE',
                size: '36B'
            },
        
            '8902625568328': {
                itemName: 'A027',
                color: 'BDE',
                size: '36C'
            },
        
            '8902625568335': {
                itemName: 'A027',
                color: 'BDE',
                size: '36D'
            },
        
            '8902625568342': {
                itemName: 'A027',
                color: 'BDE',
                size: '38B'
            },
        
            '8902625568359': {
                itemName: 'A027',
                color: 'BDE',
                size: '38C'
            },
        
            '8902625568366': {
                itemName: 'A027',
                color: 'BDE',
                size: '38D'
            },
        
            '8902625568373': {
                itemName: 'A027',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625568380': {
                itemName: 'A027',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625568397': {
                itemName: 'A027',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625568403': {
                itemName: 'A027',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625568410': {
                itemName: 'A027',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625568427': {
                itemName: 'A027',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625568434': {
                itemName: 'A027',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625568441': {
                itemName: 'A027',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625568458': {
                itemName: 'A027',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625568465': {
                itemName: 'A027',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625568472': {
                itemName: 'A027',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625568489': {
                itemName: 'A027',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625568496': {
                itemName: 'A027',
                color: 'GRW',
                size: '32B'
            },
        
            '8902625568502': {
                itemName: 'A027',
                color: 'GRW',
                size: '32C'
            },
        
            '8902625568519': {
                itemName: 'A027',
                color: 'GRW',
                size: '32D'
            },
        
            '8902625568526': {
                itemName: 'A027',
                color: 'GRW',
                size: '34B'
            },
        
            '8902625568533': {
                itemName: 'A027',
                color: 'GRW',
                size: '34C'
            },
        
            '8902625568540': {
                itemName: 'A027',
                color: 'GRW',
                size: '34D'
            },
        
            '8902625568557': {
                itemName: 'A027',
                color: 'GRW',
                size: '36B'
            },
        
            '8902625568564': {
                itemName: 'A027',
                color: 'GRW',
                size: '36C'
            },
        
            '8902625568571': {
                itemName: 'A027',
                color: 'GRW',
                size: '36D'
            },
        
            '8902625568588': {
                itemName: 'A027',
                color: 'GRW',
                size: '38B'
            },
        
            '8902625568595': {
                itemName: 'A027',
                color: 'GRW',
                size: '38C'
            },
        
            '8902625568601': {
                itemName: 'A027',
                color: 'GRW',
                size: '38D'
            },
        
            '8902625827784': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '32B'
            },
        
            '8902625827791': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '32C'
            },
        
            '8902625827807': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '32D'
            },
        
            '8902625827814': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '34B'
            },
        
            '8902625827821': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '34C'
            },
        
            '8902625827838': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '34D'
            },
        
            '8902625827845': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '36B'
            },
        
            '8902625827852': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '36C'
            },
        
            '8902625827869': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '36D'
            },
        
            '8902625827876': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '38B'
            },
        
            '8902625827883': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '38C'
            },
        
            '8902625827890': {
                itemName: 'A027',
                color: 'GRYMEL',
                size: '38D'
            },
        
            '8902625568618': {
                itemName: 'A027',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625568625': {
                itemName: 'A027',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625568632': {
                itemName: 'A027',
                color: 'PLS',
                size: '32D'
            },
        
            '8902625568649': {
                itemName: 'A027',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625568656': {
                itemName: 'A027',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625568663': {
                itemName: 'A027',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625568670': {
                itemName: 'A027',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625568687': {
                itemName: 'A027',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625568694': {
                itemName: 'A027',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625568700': {
                itemName: 'A027',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625568717': {
                itemName: 'A027',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625568724': {
                itemName: 'A027',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625046581': {
                itemName: 'A027',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625046598': {
                itemName: 'A027',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625046604': {
                itemName: 'A027',
                color: 'WHITE',
                size: '32D'
            },
        
            '8902625046611': {
                itemName: 'A027',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625046628': {
                itemName: 'A027',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625046635': {
                itemName: 'A027',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625046642': {
                itemName: 'A027',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625046659': {
                itemName: 'A027',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625046666': {
                itemName: 'A027',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625046673': {
                itemName: 'A027',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625046680': {
                itemName: 'A027',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625046697': {
                itemName: 'A027',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625829153': {
                itemName: 'A032',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625829160': {
                itemName: 'A032',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625829177': {
                itemName: 'A032',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625829184': {
                itemName: 'A032',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625829191': {
                itemName: 'A032',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625829207': {
                itemName: 'A032',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625829214': {
                itemName: 'A032',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625829221': {
                itemName: 'A032',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625569745': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '32B'
            },
        
            '8902625569752': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '32C'
            },
        
            '8902625569769': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '34B'
            },
        
            '8902625569776': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '34C'
            },
        
            '8902625569783': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '36B'
            },
        
            '8902625569790': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '36C'
            },
        
            '8902625569806': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '38B'
            },
        
            '8902625569813': {
                itemName: 'A032',
                color: 'CHYBLS',
                size: '38C'
            },
        
            '8902625569820': {
                itemName: 'A032',
                color: 'ECL',
                size: '32B'
            },
        
            '8902625569837': {
                itemName: 'A032',
                color: 'ECL',
                size: '32C'
            },
        
            '8902625569844': {
                itemName: 'A032',
                color: 'ECL',
                size: '34B'
            },
        
            '8902625569851': {
                itemName: 'A032',
                color: 'ECL',
                size: '34C'
            },
        
            '8902625569868': {
                itemName: 'A032',
                color: 'ECL',
                size: '36B'
            },
        
            '8902625569875': {
                itemName: 'A032',
                color: 'ECL',
                size: '36C'
            },
        
            '8902625569882': {
                itemName: 'A032',
                color: 'ECL',
                size: '38B'
            },
        
            '8902625569899': {
                itemName: 'A032',
                color: 'ECL',
                size: '38C'
            },
        
            '8902625829238': {
                itemName: 'A032',
                color: 'RTE',
                size: '32B'
            },
        
            '8902625829245': {
                itemName: 'A032',
                color: 'RTE',
                size: '32C'
            },
        
            '8902625829252': {
                itemName: 'A032',
                color: 'RTE',
                size: '34B'
            },
        
            '8902625829269': {
                itemName: 'A032',
                color: 'RTE',
                size: '34C'
            },
        
            '8902625829276': {
                itemName: 'A032',
                color: 'RTE',
                size: '36B'
            },
        
            '8902625829283': {
                itemName: 'A032',
                color: 'RTE',
                size: '36C'
            },
        
            '8902625829290': {
                itemName: 'A032',
                color: 'RTE',
                size: '38B'
            },
        
            '8902625829306': {
                itemName: 'A032',
                color: 'RTE',
                size: '38C'
            },
        
            '8902625569905': {
                itemName: 'A032',
                color: 'SLI',
                size: '32B'
            },
        
            '8902625569912': {
                itemName: 'A032',
                color: 'SLI',
                size: '32C'
            },
        
            '8902625569929': {
                itemName: 'A032',
                color: 'SLI',
                size: '34B'
            },
        
            '8902625569936': {
                itemName: 'A032',
                color: 'SLI',
                size: '34C'
            },
        
            '8902625569943': {
                itemName: 'A032',
                color: 'SLI',
                size: '36B'
            },
        
            '8902625569950': {
                itemName: 'A032',
                color: 'SLI',
                size: '36C'
            },
        
            '8902625569967': {
                itemName: 'A032',
                color: 'SLI',
                size: '38B'
            },
        
            '8902625569974': {
                itemName: 'A032',
                color: 'SLI',
                size: '38C'
            },
        
            '8902625046840': {
                itemName: 'A032',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625046857': {
                itemName: 'A032',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625046864': {
                itemName: 'A032',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625046871': {
                itemName: 'A032',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625046888': {
                itemName: 'A032',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625046895': {
                itemName: 'A032',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625046901': {
                itemName: 'A032',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625046918': {
                itemName: 'A032',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625551207': {
                itemName: 'A039',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625551214': {
                itemName: 'A039',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625551221': {
                itemName: 'A039',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625554376': {
                itemName: 'A039',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625554383': {
                itemName: 'A039',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625554390': {
                itemName: 'A039',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625554406': {
                itemName: 'A039',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625554413': {
                itemName: 'A039',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625554420': {
                itemName: 'A039',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625554437': {
                itemName: 'A039',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625554444': {
                itemName: 'A039',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625554451': {
                itemName: 'A039',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625570796': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '32B'
            },
        
            '8902625570802': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '32C'
            },
        
            '8902625570819': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '32D'
            },
        
            '8902625570826': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '34B'
            },
        
            '8902625570833': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '34C'
            },
        
            '8902625570840': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '34D'
            },
        
            '8902625570857': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '36B'
            },
        
            '8902625570864': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '36C'
            },
        
            '8902625570871': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '36D'
            },
        
            '8902625570888': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '38B'
            },
        
            '8902625570895': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '38C'
            },
        
            '8902625570901': {
                itemName: 'A039',
                color: 'EVEBLU',
                size: '38D'
            },
        
            '8902625570918': {
                itemName: 'A039',
                color: 'GRW',
                size: '32B'
            },
        
            '8902625570925': {
                itemName: 'A039',
                color: 'GRW',
                size: '32C'
            },
        
            '8902625570932': {
                itemName: 'A039',
                color: 'GRW',
                size: '32D'
            },
        
            '8902625570949': {
                itemName: 'A039',
                color: 'GRW',
                size: '34B'
            },
        
            '8902625570956': {
                itemName: 'A039',
                color: 'GRW',
                size: '34C'
            },
        
            '8902625570963': {
                itemName: 'A039',
                color: 'GRW',
                size: '34D'
            },
        
            '8902625570970': {
                itemName: 'A039',
                color: 'GRW',
                size: '36B'
            },
        
            '8902625570987': {
                itemName: 'A039',
                color: 'GRW',
                size: '36C'
            },
        
            '8902625570994': {
                itemName: 'A039',
                color: 'GRW',
                size: '36D'
            },
        
            '8902625571007': {
                itemName: 'A039',
                color: 'GRW',
                size: '38B'
            },
        
            '8902625571014': {
                itemName: 'A039',
                color: 'GRW',
                size: '38C'
            },
        
            '8902625571021': {
                itemName: 'A039',
                color: 'GRW',
                size: '38D'
            },
        
            '8902625551238': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '32B'
            },
        
            '8902625551245': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '32C'
            },
        
            '8902625551252': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '32D'
            },
        
            '8902625554468': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '34B'
            },
        
            '8902625554475': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '34C'
            },
        
            '8902625554482': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '34D'
            },
        
            '8902625554499': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '36B'
            },
        
            '8902625554505': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '36C'
            },
        
            '8902625554512': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '36D'
            },
        
            '8902625554529': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '38B'
            },
        
            '8902625554536': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '38C'
            },
        
            '8902625554543': {
                itemName: 'A039',
                color: 'GRYMRL',
                size: '38D'
            },
        
            '8902625833990': {
                itemName: 'A039',
                color: 'LILAST',
                size: '32B'
            },
        
            '8902625834003': {
                itemName: 'A039',
                color: 'LILAST',
                size: '32C'
            },
        
            '8902625834010': {
                itemName: 'A039',
                color: 'LILAST',
                size: '32D'
            },
        
            '8902625834027': {
                itemName: 'A039',
                color: 'LILAST',
                size: '34B'
            },
        
            '8902625834034': {
                itemName: 'A039',
                color: 'LILAST',
                size: '34C'
            },
        
            '8902625834041': {
                itemName: 'A039',
                color: 'LILAST',
                size: '34D'
            },
        
            '8902625834058': {
                itemName: 'A039',
                color: 'LILAST',
                size: '36B'
            },
        
            '8902625834065': {
                itemName: 'A039',
                color: 'LILAST',
                size: '36C'
            },
        
            '8902625834072': {
                itemName: 'A039',
                color: 'LILAST',
                size: '36D'
            },
        
            '8902625834089': {
                itemName: 'A039',
                color: 'LILAST',
                size: '38B'
            },
        
            '8902625834096': {
                itemName: 'A039',
                color: 'LILAST',
                size: '38C'
            },
        
            '8902625834102': {
                itemName: 'A039',
                color: 'LILAST',
                size: '38D'
            },
        
            '8902625013347': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '32B'
            },
        
            '8902625013354': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '32C'
            },
        
            '8902625013361': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '32D'
            },
        
            '8902625013378': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '34B'
            },
        
            '8902625013385': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '34C'
            },
        
            '8902625013392': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '34D'
            },
        
            '8902625013408': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '36B'
            },
        
            '8902625013415': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '36C'
            },
        
            '8902625013422': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '36D'
            },
        
            '8902625013439': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '38B'
            },
        
            '8902625013446': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '38C'
            },
        
            '8902625013477': {
                itemName: 'A039',
                color: 'LIMAPR',
                size: '38D'
            },
        
            '8902625593863': {
                itemName: 'A039',
                color: 'PEARL',
                size: '32B'
            },
        
            '8902625571212': {
                itemName: 'A039',
                color: 'PEARL',
                size: '32C'
            },
        
            '8902625571229': {
                itemName: 'A039',
                color: 'PEARL',
                size: '32D'
            },
        
            '8902625571236': {
                itemName: 'A039',
                color: 'PEARL',
                size: '34B'
            },
        
            '8902625571243': {
                itemName: 'A039',
                color: 'PEARL',
                size: '34C'
            },
        
            '8902625571250': {
                itemName: 'A039',
                color: 'PEARL',
                size: '34D'
            },
        
            '8902625571267': {
                itemName: 'A039',
                color: 'PEARL',
                size: '36B'
            },
        
            '8902625571274': {
                itemName: 'A039',
                color: 'PEARL',
                size: '36C'
            },
        
            '8902625571281': {
                itemName: 'A039',
                color: 'PEARL',
                size: '36D'
            },
        
            '8902625571298': {
                itemName: 'A039',
                color: 'PEARL',
                size: '38B'
            },
        
            '8902625571304': {
                itemName: 'A039',
                color: 'PEARL',
                size: '38C'
            },
        
            '8902625571311': {
                itemName: 'A039',
                color: 'PEARL',
                size: '38D'
            },
        
            '8902625013224': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '32B'
            },
        
            '8902625013231': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '32C'
            },
        
            '8902625013248': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '32D'
            },
        
            '8902625013255': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '34B'
            },
        
            '8902625013262': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '34C'
            },
        
            '8902625013279': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '34D'
            },
        
            '8902625013286': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '36B'
            },
        
            '8902625013293': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '36C'
            },
        
            '8902625013309': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '36D'
            },
        
            '8902625013316': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '38B'
            },
        
            '8902625013323': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '38C'
            },
        
            '8902625013330': {
                itemName: 'A039',
                color: 'RESWPR',
                size: '38D'
            },
        
            '8902625551320': {
                itemName: 'A039',
                color: 'SKIN',
                size: '32B'
            },
        
            '8902625551337': {
                itemName: 'A039',
                color: 'SKIN',
                size: '32C'
            },
        
            '8902625551344': {
                itemName: 'A039',
                color: 'SKIN',
                size: '32D'
            },
        
            '8902625554734': {
                itemName: 'A039',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625554741': {
                itemName: 'A039',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625554758': {
                itemName: 'A039',
                color: 'SKIN',
                size: '34D'
            },
        
            '8902625554765': {
                itemName: 'A039',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625554772': {
                itemName: 'A039',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625554789': {
                itemName: 'A039',
                color: 'SKIN',
                size: '36D'
            },
        
            '8902625554796': {
                itemName: 'A039',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625554802': {
                itemName: 'A039',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625554819': {
                itemName: 'A039',
                color: 'SKIN',
                size: '38D'
            },
        
            '8902625551443': {
                itemName: 'A039',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625551450': {
                itemName: 'A039',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625551467': {
                itemName: 'A039',
                color: 'WHITE',
                size: '32D'
            },
        
            '8902625555090': {
                itemName: 'A039',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625555106': {
                itemName: 'A039',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625555113': {
                itemName: 'A039',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625555120': {
                itemName: 'A039',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625555137': {
                itemName: 'A039',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625555144': {
                itemName: 'A039',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625555151': {
                itemName: 'A039',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625555168': {
                itemName: 'A039',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625555175': {
                itemName: 'A039',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625551474': {
                itemName: 'A042',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625551481': {
                itemName: 'A042',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625551498': {
                itemName: 'A042',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625551504': {
                itemName: 'A042',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625555182': {
                itemName: 'A042',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625555199': {
                itemName: 'A042',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625555205': {
                itemName: 'A042',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625555212': {
                itemName: 'A042',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625555229': {
                itemName: 'A042',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625555236': {
                itemName: 'A042',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625555243': {
                itemName: 'A042',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625555250': {
                itemName: 'A042',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625555267': {
                itemName: 'A042',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625555274': {
                itemName: 'A042',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625555281': {
                itemName: 'A042',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625555298': {
                itemName: 'A042',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625555304': {
                itemName: 'A042',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625555311': {
                itemName: 'A042',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625555328': {
                itemName: 'A042',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625555335': {
                itemName: 'A042',
                color: 'BLACK',
                size: '42B'
            },
        
            '8902625555342': {
                itemName: 'A042',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625013750': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '32B'
            },
        
            '8902625013767': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '32C'
            },
        
            '8902625013774': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '32D'
            },
        
            '8902625013781': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '32Z'
            },
        
            '8902625013798': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '34B'
            },
        
            '8902625013804': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '34C'
            },
        
            '8902625013811': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '34D'
            },
        
            '8902625013828': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '34Z'
            },
        
            '8902625013835': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '36B'
            },
        
            '8902625013842': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '36C'
            },
        
            '8902625013859': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '36D'
            },
        
            '8902625013866': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '36Z'
            },
        
            '8902625013873': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '38B'
            },
        
            '8902625013880': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '38C'
            },
        
            '8902625013897': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '38D'
            },
        
            '8902625013903': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '38Z'
            },
        
            '8902625013910': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '40B'
            },
        
            '8902625013927': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '40C'
            },
        
            '8902625013934': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '40D'
            },
        
            '8902625013941': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '42B'
            },
        
            '8902625013958': {
                itemName: 'A042',
                color: 'CHIVIO',
                size: '42C'
            },
        
            '8902625551511': {
                itemName: 'A042',
                color: 'CMG',
                size: '32B'
            },
        
            '8902625551528': {
                itemName: 'A042',
                color: 'CMG',
                size: '32C'
            },
        
            '8902625551535': {
                itemName: 'A042',
                color: 'CMG',
                size: '32D'
            },
        
            '8902625551542': {
                itemName: 'A042',
                color: 'CMG',
                size: '32Z'
            },
        
            '8902625555359': {
                itemName: 'A042',
                color: 'CMG',
                size: '34B'
            },
        
            '8902625555366': {
                itemName: 'A042',
                color: 'CMG',
                size: '34C'
            },
        
            '8902625555373': {
                itemName: 'A042',
                color: 'CMG',
                size: '34D'
            },
        
            '8902625555380': {
                itemName: 'A042',
                color: 'CMG',
                size: '34Z'
            },
        
            '8902625555397': {
                itemName: 'A042',
                color: 'CMG',
                size: '36B'
            },
        
            '8902625555403': {
                itemName: 'A042',
                color: 'CMG',
                size: '36C'
            },
        
            '8902625555410': {
                itemName: 'A042',
                color: 'CMG',
                size: '36D'
            },
        
            '8902625555427': {
                itemName: 'A042',
                color: 'CMG',
                size: '36Z'
            },
        
            '8902625555434': {
                itemName: 'A042',
                color: 'CMG',
                size: '38B'
            },
        
            '8902625555441': {
                itemName: 'A042',
                color: 'CMG',
                size: '38C'
            },
        
            '8902625555458': {
                itemName: 'A042',
                color: 'CMG',
                size: '38D'
            },
        
            '8902625555465': {
                itemName: 'A042',
                color: 'CMG',
                size: '38Z'
            },
        
            '8902625555472': {
                itemName: 'A042',
                color: 'CMG',
                size: '40B'
            },
        
            '8902625555489': {
                itemName: 'A042',
                color: 'CMG',
                size: '40C'
            },
        
            '8902625555496': {
                itemName: 'A042',
                color: 'CMG',
                size: '40D'
            },
        
            '8902625555502': {
                itemName: 'A042',
                color: 'CMG',
                size: '42B'
            },
        
            '8902625555519': {
                itemName: 'A042',
                color: 'CMG',
                size: '42C'
            },
        
            '8902625608239': {
                itemName: 'A042',
                color: 'GSP',
                size: '32B'
            },
        
            '8902625608246': {
                itemName: 'A042',
                color: 'GSP',
                size: '32C'
            },
        
            '8902625608253': {
                itemName: 'A042',
                color: 'GSP',
                size: '32D'
            },
        
            '8902625608260': {
                itemName: 'A042',
                color: 'GSP',
                size: '32Z'
            },
        
            '8902625608277': {
                itemName: 'A042',
                color: 'GSP',
                size: '34B'
            },
        
            '8902625608284': {
                itemName: 'A042',
                color: 'GSP',
                size: '34C'
            },
        
            '8902625608291': {
                itemName: 'A042',
                color: 'GSP',
                size: '34D'
            },
        
            '8902625608307': {
                itemName: 'A042',
                color: 'GSP',
                size: '34Z'
            },
        
            '8902625608314': {
                itemName: 'A042',
                color: 'GSP',
                size: '36B'
            },
        
            '8902625608321': {
                itemName: 'A042',
                color: 'GSP',
                size: '36C'
            },
        
            '8902625608338': {
                itemName: 'A042',
                color: 'GSP',
                size: '36D'
            },
        
            '8902625608345': {
                itemName: 'A042',
                color: 'GSP',
                size: '36Z'
            },
        
            '8902625608352': {
                itemName: 'A042',
                color: 'GSP',
                size: '38B'
            },
        
            '8902625608369': {
                itemName: 'A042',
                color: 'GSP',
                size: '38C'
            },
        
            '8902625608376': {
                itemName: 'A042',
                color: 'GSP',
                size: '38D'
            },
        
            '8902625608383': {
                itemName: 'A042',
                color: 'GSP',
                size: '38Z'
            },
        
            '8902625608390': {
                itemName: 'A042',
                color: 'GSP',
                size: '40B'
            },
        
            '8902625608406': {
                itemName: 'A042',
                color: 'GSP',
                size: '40C'
            },
        
            '8902625608413': {
                itemName: 'A042',
                color: 'GSP',
                size: '40D'
            },
        
            '8902625608420': {
                itemName: 'A042',
                color: 'GSP',
                size: '42B'
            },
        
            '8902625608437': {
                itemName: 'A042',
                color: 'GSP',
                size: '42C'
            },
        
            '8902625013507': {
                itemName: 'A042',
                color: 'LPR',
                size: '32B'
            },
        
            '8902625013538': {
                itemName: 'A042',
                color: 'LPR',
                size: '32C'
            },
        
            '8902625013552': {
                itemName: 'A042',
                color: 'LPR',
                size: '32D'
            },
        
            '8902625013569': {
                itemName: 'A042',
                color: 'LPR',
                size: '32Z'
            },
        
            '8902625013576': {
                itemName: 'A042',
                color: 'LPR',
                size: '34B'
            },
        
            '8902625013583': {
                itemName: 'A042',
                color: 'LPR',
                size: '34C'
            },
        
            '8902625013590': {
                itemName: 'A042',
                color: 'LPR',
                size: '34D'
            },
        
            '8902625013606': {
                itemName: 'A042',
                color: 'LPR',
                size: '34Z'
            },
        
            '8902625013613': {
                itemName: 'A042',
                color: 'LPR',
                size: '36B'
            },
        
            '8902625013637': {
                itemName: 'A042',
                color: 'LPR',
                size: '36C'
            },
        
            '8902625013644': {
                itemName: 'A042',
                color: 'LPR',
                size: '36D'
            },
        
            '8902625013651': {
                itemName: 'A042',
                color: 'LPR',
                size: '36Z'
            },
        
            '8902625013668': {
                itemName: 'A042',
                color: 'LPR',
                size: '38B'
            },
        
            '8902625013675': {
                itemName: 'A042',
                color: 'LPR',
                size: '38C'
            },
        
            '8902625013682': {
                itemName: 'A042',
                color: 'LPR',
                size: '38D'
            },
        
            '8902625013699': {
                itemName: 'A042',
                color: 'LPR',
                size: '38Z'
            },
        
            '8902625013705': {
                itemName: 'A042',
                color: 'LPR',
                size: '40B'
            },
        
            '8902625013712': {
                itemName: 'A042',
                color: 'LPR',
                size: '40C'
            },
        
            '8902625013729': {
                itemName: 'A042',
                color: 'LPR',
                size: '40D'
            },
        
            '8902625013736': {
                itemName: 'A042',
                color: 'LPR',
                size: '42B'
            },
        
            '8902625013743': {
                itemName: 'A042',
                color: 'LPR',
                size: '42C'
            },
        
            '8902625572196': {
                itemName: 'A042',
                color: 'ODM',
                size: '32B'
            },
        
            '8902625572202': {
                itemName: 'A042',
                color: 'ODM',
                size: '32C'
            },
        
            '8902625572219': {
                itemName: 'A042',
                color: 'ODM',
                size: '32D'
            },
        
            '8902625572226': {
                itemName: 'A042',
                color: 'ODM',
                size: '32Z'
            },
        
            '8902625572233': {
                itemName: 'A042',
                color: 'ODM',
                size: '34B'
            },
        
            '8902625572240': {
                itemName: 'A042',
                color: 'ODM',
                size: '34C'
            },
        
            '8902625572257': {
                itemName: 'A042',
                color: 'ODM',
                size: '34D'
            },
        
            '8902625572264': {
                itemName: 'A042',
                color: 'ODM',
                size: '34Z'
            },
        
            '8902625572271': {
                itemName: 'A042',
                color: 'ODM',
                size: '36B'
            },
        
            '8902625572288': {
                itemName: 'A042',
                color: 'ODM',
                size: '36C'
            },
        
            '8902625572295': {
                itemName: 'A042',
                color: 'ODM',
                size: '36D'
            },
        
            '8902625572301': {
                itemName: 'A042',
                color: 'ODM',
                size: '36Z'
            },
        
            '8902625572318': {
                itemName: 'A042',
                color: 'ODM',
                size: '38B'
            },
        
            '8902625572325': {
                itemName: 'A042',
                color: 'ODM',
                size: '38C'
            },
        
            '8902625572332': {
                itemName: 'A042',
                color: 'ODM',
                size: '38D'
            },
        
            '8902625572349': {
                itemName: 'A042',
                color: 'ODM',
                size: '38Z'
            },
        
            '8902625572356': {
                itemName: 'A042',
                color: 'ODM',
                size: '40B'
            },
        
            '8902625572363': {
                itemName: 'A042',
                color: 'ODM',
                size: '40C'
            },
        
            '8902625572370': {
                itemName: 'A042',
                color: 'ODM',
                size: '40D'
            },
        
            '8902625572387': {
                itemName: 'A042',
                color: 'ODM',
                size: '42B'
            },
        
            '8902625572394': {
                itemName: 'A042',
                color: 'ODM',
                size: '42C'
            },
        
            '8902625551672': {
                itemName: 'A042',
                color: 'PEARL',
                size: '32B'
            },
        
            '8902625551689': {
                itemName: 'A042',
                color: 'PEARL',
                size: '32C'
            },
        
            '8902625551696': {
                itemName: 'A042',
                color: 'PEARL',
                size: '32D'
            },
        
            '8902625551702': {
                itemName: 'A042',
                color: 'PEARL',
                size: '32Z'
            },
        
            '8902625556035': {
                itemName: 'A042',
                color: 'PEARL',
                size: '34B'
            },
        
            '8902625556042': {
                itemName: 'A042',
                color: 'PEARL',
                size: '34C'
            },
        
            '8902625556059': {
                itemName: 'A042',
                color: 'PEARL',
                size: '34D'
            },
        
            '8902625556066': {
                itemName: 'A042',
                color: 'PEARL',
                size: '34Z'
            },
        
            '8902625556073': {
                itemName: 'A042',
                color: 'PEARL',
                size: '36B'
            },
        
            '8902625556080': {
                itemName: 'A042',
                color: 'PEARL',
                size: '36C'
            },
        
            '8902625556097': {
                itemName: 'A042',
                color: 'PEARL',
                size: '36D'
            },
        
            '8902625556103': {
                itemName: 'A042',
                color: 'PEARL',
                size: '36Z'
            },
        
            '8902625556110': {
                itemName: 'A042',
                color: 'PEARL',
                size: '38B'
            },
        
            '8902625556127': {
                itemName: 'A042',
                color: 'PEARL',
                size: '38C'
            },
        
            '8902625556134': {
                itemName: 'A042',
                color: 'PEARL',
                size: '38D'
            },
        
            '8902625556141': {
                itemName: 'A042',
                color: 'PEARL',
                size: '38Z'
            },
        
            '8902625556158': {
                itemName: 'A042',
                color: 'PEARL',
                size: '40B'
            },
        
            '8902625556165': {
                itemName: 'A042',
                color: 'PEARL',
                size: '40C'
            },
        
            '8902625556172': {
                itemName: 'A042',
                color: 'PEARL',
                size: '40D'
            },
        
            '8902625556189': {
                itemName: 'A042',
                color: 'PEARL',
                size: '42B'
            },
        
            '8902625556196': {
                itemName: 'A042',
                color: 'PEARL',
                size: '42C'
            },
        
            '8902625551719': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '32B'
            },
        
            '8902625551726': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '32C'
            },
        
            '8902625551733': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '32D'
            },
        
            '8902625551740': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '32Z'
            },
        
            '8902625556202': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '34B'
            },
        
            '8902625556219': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '34C'
            },
        
            '8902625556226': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '34D'
            },
        
            '8902625556233': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '34Z'
            },
        
            '8902625556240': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '36B'
            },
        
            '8902625556257': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '36C'
            },
        
            '8902625556264': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '36D'
            },
        
            '8902625556271': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '36Z'
            },
        
            '8902625556288': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '38B'
            },
        
            '8902625556295': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '38C'
            },
        
            '8902625556301': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '38D'
            },
        
            '8902625556318': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '38Z'
            },
        
            '8902625556325': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '40B'
            },
        
            '8902625556332': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '40C'
            },
        
            '8902625556349': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '40D'
            },
        
            '8902625556356': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '42B'
            },
        
            '8902625556363': {
                itemName: 'A042',
                color: 'PURPLE',
                size: '42C'
            },
        
            '8902625608024': {
                itemName: 'A042',
                color: 'RVL',
                size: '32B'
            },
        
            '8902625608031': {
                itemName: 'A042',
                color: 'RVL',
                size: '32C'
            },
        
            '8902625608048': {
                itemName: 'A042',
                color: 'RVL',
                size: '32D'
            },
        
            '8902625608055': {
                itemName: 'A042',
                color: 'RVL',
                size: '32Z'
            },
        
            '8902625608062': {
                itemName: 'A042',
                color: 'RVL',
                size: '34B'
            },
        
            '8902625608079': {
                itemName: 'A042',
                color: 'RVL',
                size: '34C'
            },
        
            '8902625608086': {
                itemName: 'A042',
                color: 'RVL',
                size: '34D'
            },
        
            '8902625608093': {
                itemName: 'A042',
                color: 'RVL',
                size: '34Z'
            },
        
            '8902625608109': {
                itemName: 'A042',
                color: 'RVL',
                size: '36B'
            },
        
            '8902625608116': {
                itemName: 'A042',
                color: 'RVL',
                size: '36C'
            },
        
            '8902625608123': {
                itemName: 'A042',
                color: 'RVL',
                size: '36D'
            },
        
            '8902625608130': {
                itemName: 'A042',
                color: 'RVL',
                size: '36Z'
            },
        
            '8902625608147': {
                itemName: 'A042',
                color: 'RVL',
                size: '38B'
            },
        
            '8902625608154': {
                itemName: 'A042',
                color: 'RVL',
                size: '38C'
            },
        
            '8902625608161': {
                itemName: 'A042',
                color: 'RVL',
                size: '38D'
            },
        
            '8902625608178': {
                itemName: 'A042',
                color: 'RVL',
                size: '38Z'
            },
        
            '8902625608185': {
                itemName: 'A042',
                color: 'RVL',
                size: '40B'
            },
        
            '8902625608192': {
                itemName: 'A042',
                color: 'RVL',
                size: '40C'
            },
        
            '8902625608208': {
                itemName: 'A042',
                color: 'RVL',
                size: '40D'
            },
        
            '8902625608215': {
                itemName: 'A042',
                color: 'RVL',
                size: '42B'
            },
        
            '8902625608222': {
                itemName: 'A042',
                color: 'RVL',
                size: '42C'
            },
        
            '8902625551788': {
                itemName: 'A042',
                color: 'SKIN',
                size: '32B'
            },
        
            '8902625551795': {
                itemName: 'A042',
                color: 'SKIN',
                size: '32C'
            },
        
            '8902625551801': {
                itemName: 'A042',
                color: 'SKIN',
                size: '32D'
            },
        
            '8902625551818': {
                itemName: 'A042',
                color: 'SKIN',
                size: '32Z'
            },
        
            '8902625556516': {
                itemName: 'A042',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625556523': {
                itemName: 'A042',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625556530': {
                itemName: 'A042',
                color: 'SKIN',
                size: '34D'
            },
        
            '8902625556547': {
                itemName: 'A042',
                color: 'SKIN',
                size: '34Z'
            },
        
            '8902625556554': {
                itemName: 'A042',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625556561': {
                itemName: 'A042',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625556578': {
                itemName: 'A042',
                color: 'SKIN',
                size: '36D'
            },
        
            '8902625556585': {
                itemName: 'A042',
                color: 'SKIN',
                size: '36Z'
            },
        
            '8902625556592': {
                itemName: 'A042',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625556608': {
                itemName: 'A042',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625556615': {
                itemName: 'A042',
                color: 'SKIN',
                size: '38D'
            },
        
            '8902625556622': {
                itemName: 'A042',
                color: 'SKIN',
                size: '38Z'
            },
        
            '8902625556639': {
                itemName: 'A042',
                color: 'SKIN',
                size: '40B'
            },
        
            '8902625556646': {
                itemName: 'A042',
                color: 'SKIN',
                size: '40C'
            },
        
            '8902625556653': {
                itemName: 'A042',
                color: 'SKIN',
                size: '40D'
            },
        
            '8902625556660': {
                itemName: 'A042',
                color: 'SKIN',
                size: '42B'
            },
        
            '8902625556677': {
                itemName: 'A042',
                color: 'SKIN',
                size: '42C'
            },
        
            '8902625551825': {
                itemName: 'A042',
                color: 'TMG',
                size: '32B'
            },
        
            '8902625551832': {
                itemName: 'A042',
                color: 'TMG',
                size: '32C'
            },
        
            '8902625551849': {
                itemName: 'A042',
                color: 'TMG',
                size: '32D'
            },
        
            '8902625551856': {
                itemName: 'A042',
                color: 'TMG',
                size: '32Z'
            },
        
            '8902625556684': {
                itemName: 'A042',
                color: 'TMG',
                size: '34B'
            },
        
            '8902625556691': {
                itemName: 'A042',
                color: 'TMG',
                size: '34C'
            },
        
            '8902625556707': {
                itemName: 'A042',
                color: 'TMG',
                size: '34D'
            },
        
            '8902625556714': {
                itemName: 'A042',
                color: 'TMG',
                size: '34Z'
            },
        
            '8902625556721': {
                itemName: 'A042',
                color: 'TMG',
                size: '36B'
            },
        
            '8902625556738': {
                itemName: 'A042',
                color: 'TMG',
                size: '36C'
            },
        
            '8902625556745': {
                itemName: 'A042',
                color: 'TMG',
                size: '36D'
            },
        
            '8902625556752': {
                itemName: 'A042',
                color: 'TMG',
                size: '36Z'
            },
        
            '8902625556769': {
                itemName: 'A042',
                color: 'TMG',
                size: '38B'
            },
        
            '8902625556776': {
                itemName: 'A042',
                color: 'TMG',
                size: '38C'
            },
        
            '8902625556783': {
                itemName: 'A042',
                color: 'TMG',
                size: '38D'
            },
        
            '8902625556790': {
                itemName: 'A042',
                color: 'TMG',
                size: '38Z'
            },
        
            '8902625556806': {
                itemName: 'A042',
                color: 'TMG',
                size: '40B'
            },
        
            '8902625556813': {
                itemName: 'A042',
                color: 'TMG',
                size: '40C'
            },
        
            '8902625556820': {
                itemName: 'A042',
                color: 'TMG',
                size: '40D'
            },
        
            '8902625556837': {
                itemName: 'A042',
                color: 'TMG',
                size: '42B'
            },
        
            '8902625556844': {
                itemName: 'A042',
                color: 'TMG',
                size: '42C'
            },
        
            '8902625551863': {
                itemName: 'A042',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625551870': {
                itemName: 'A042',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625551887': {
                itemName: 'A042',
                color: 'WHITE',
                size: '32D'
            },
        
            '8902625551894': {
                itemName: 'A042',
                color: 'WHITE',
                size: '32Z'
            },
        
            '8902625556851': {
                itemName: 'A042',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625556868': {
                itemName: 'A042',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625556875': {
                itemName: 'A042',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625556882': {
                itemName: 'A042',
                color: 'WHITE',
                size: '34Z'
            },
        
            '8902625556899': {
                itemName: 'A042',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625556905': {
                itemName: 'A042',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625556912': {
                itemName: 'A042',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625556929': {
                itemName: 'A042',
                color: 'WHITE',
                size: '36Z'
            },
        
            '8902625556936': {
                itemName: 'A042',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625556943': {
                itemName: 'A042',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625556950': {
                itemName: 'A042',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625556967': {
                itemName: 'A042',
                color: 'WHITE',
                size: '38Z'
            },
        
            '8902625556974': {
                itemName: 'A042',
                color: 'WHITE',
                size: '40B'
            },
        
            '8902625556981': {
                itemName: 'A042',
                color: 'WHITE',
                size: '40C'
            },
        
            '8902625556998': {
                itemName: 'A042',
                color: 'WHITE',
                size: '40D'
            },
        
            '8902625557001': {
                itemName: 'A042',
                color: 'WHITE',
                size: '42B'
            },
        
            '8902625557018': {
                itemName: 'A042',
                color: 'WHITE',
                size: '42C'
            },
        
            '8902625572400': {
                itemName: 'A055',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625572417': {
                itemName: 'A055',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625572424': {
                itemName: 'A055',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625572431': {
                itemName: 'A055',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625572448': {
                itemName: 'A055',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625572455': {
                itemName: 'A055',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625572462': {
                itemName: 'A055',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625572479': {
                itemName: 'A055',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625001641': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '32B'
            },
        
            '8902625001672': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '32C'
            },
        
            '8902625001696': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '34B'
            },
        
            '8902625001702': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '34C'
            },
        
            '8902625001719': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '36B'
            },
        
            '8902625001726': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '36C'
            },
        
            '8902625001733': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '38B'
            },
        
            '8902625001740': {
                itemName: 'A055',
                color: 'CFAUP',
                size: '38C'
            },
        
            '8902625827906': {
                itemName: 'A055',
                color: 'GRW',
                size: '32B'
            },
        
            '8902625827913': {
                itemName: 'A055',
                color: 'GRW',
                size: '32C'
            },
        
            '8902625827920': {
                itemName: 'A055',
                color: 'GRW',
                size: '34B'
            },
        
            '8902625827937': {
                itemName: 'A055',
                color: 'GRW',
                size: '34C'
            },
        
            '8902625827944': {
                itemName: 'A055',
                color: 'GRW',
                size: '36B'
            },
        
            '8902625827951': {
                itemName: 'A055',
                color: 'GRW',
                size: '36C'
            },
        
            '8902625827968': {
                itemName: 'A055',
                color: 'GRW',
                size: '38B'
            },
        
            '8902625827975': {
                itemName: 'A055',
                color: 'GRW',
                size: '38C'
            },
        
            '8902625572486': {
                itemName: 'A055',
                color: 'PEARL',
                size: '32B'
            },
        
            '8902625572493': {
                itemName: 'A055',
                color: 'PEARL',
                size: '32C'
            },
        
            '8902625572509': {
                itemName: 'A055',
                color: 'PEARL',
                size: '34B'
            },
        
            '8902625572516': {
                itemName: 'A055',
                color: 'PEARL',
                size: '34C'
            },
        
            '8902625572523': {
                itemName: 'A055',
                color: 'PEARL',
                size: '36B'
            },
        
            '8902625572530': {
                itemName: 'A055',
                color: 'PEARL',
                size: '36C'
            },
        
            '8902625572547': {
                itemName: 'A055',
                color: 'PEARL',
                size: '38B'
            },
        
            '8902625572554': {
                itemName: 'A055',
                color: 'PEARL',
                size: '38C'
            },
        
            '8902625572721': {
                itemName: 'A055',
                color: 'SKIN',
                size: '32B'
            },
        
            '8902625572738': {
                itemName: 'A055',
                color: 'SKIN',
                size: '32C'
            },
        
            '8902625572745': {
                itemName: 'A055',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625572752': {
                itemName: 'A055',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625572769': {
                itemName: 'A055',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625572776': {
                itemName: 'A055',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625572783': {
                itemName: 'A055',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625572790': {
                itemName: 'A055',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625001757': {
                itemName: 'A055',
                color: 'TLPP',
                size: '32B'
            },
        
            '8902625001764': {
                itemName: 'A055',
                color: 'TLPP',
                size: '32C'
            },
        
            '8902625001771': {
                itemName: 'A055',
                color: 'TLPP',
                size: '34B'
            },
        
            '8902625001788': {
                itemName: 'A055',
                color: 'TLPP',
                size: '34C'
            },
        
            '8902625001795': {
                itemName: 'A055',
                color: 'TLPP',
                size: '36B'
            },
        
            '8902625001801': {
                itemName: 'A055',
                color: 'TLPP',
                size: '36C'
            },
        
            '8902625001818': {
                itemName: 'A055',
                color: 'TLPP',
                size: '38B'
            },
        
            '8902625001825': {
                itemName: 'A055',
                color: 'TLPP',
                size: '38C'
            },
        
            '8902625572806': {
                itemName: 'A055',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625572813': {
                itemName: 'A055',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625572820': {
                itemName: 'A055',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625572837': {
                itemName: 'A055',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625572844': {
                itemName: 'A055',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625572851': {
                itemName: 'A055',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625572868': {
                itemName: 'A055',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625572875': {
                itemName: 'A055',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625572882': {
                itemName: 'A058',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625572899': {
                itemName: 'A058',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625572905': {
                itemName: 'A058',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625572912': {
                itemName: 'A058',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625572929': {
                itemName: 'A058',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625572936': {
                itemName: 'A058',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625572943': {
                itemName: 'A058',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625572950': {
                itemName: 'A058',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625572967': {
                itemName: 'A058',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625572974': {
                itemName: 'A058',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625572981': {
                itemName: 'A058',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625572998': {
                itemName: 'A058',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625573001': {
                itemName: 'A058',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625573018': {
                itemName: 'A058',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625573032': {
                itemName: 'A058',
                color: 'PHB',
                size: '32B'
            },
        
            '8902625573049': {
                itemName: 'A058',
                color: 'PHB',
                size: '32C'
            },
        
            '8902625573056': {
                itemName: 'A058',
                color: 'PHB',
                size: '32D'
            },
        
            '8902625573063': {
                itemName: 'A058',
                color: 'PHB',
                size: '34B'
            },
        
            '8902625573070': {
                itemName: 'A058',
                color: 'PHB',
                size: '34C'
            },
        
            '8902625573087': {
                itemName: 'A058',
                color: 'PHB',
                size: '34D'
            },
        
            '8902625573094': {
                itemName: 'A058',
                color: 'PHB',
                size: '36B'
            },
        
            '8902625573100': {
                itemName: 'A058',
                color: 'PHB',
                size: '36C'
            },
        
            '8902625573117': {
                itemName: 'A058',
                color: 'PHB',
                size: '36D'
            },
        
            '8902625573124': {
                itemName: 'A058',
                color: 'PHB',
                size: '38B'
            },
        
            '8902625573131': {
                itemName: 'A058',
                color: 'PHB',
                size: '38C'
            },
        
            '8902625573148': {
                itemName: 'A058',
                color: 'PHB',
                size: '38D'
            },
        
            '8902625573155': {
                itemName: 'A058',
                color: 'PHB',
                size: '40B'
            },
        
            '8902625573162': {
                itemName: 'A058',
                color: 'PHB',
                size: '40C'
            },
        
            '8902625573186': {
                itemName: 'A058',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625573193': {
                itemName: 'A058',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625573209': {
                itemName: 'A058',
                color: 'PLS',
                size: '32D'
            },
        
            '8902625573216': {
                itemName: 'A058',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625573223': {
                itemName: 'A058',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625573230': {
                itemName: 'A058',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625573247': {
                itemName: 'A058',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625573254': {
                itemName: 'A058',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625573261': {
                itemName: 'A058',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625573278': {
                itemName: 'A058',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625573285': {
                itemName: 'A058',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625573292': {
                itemName: 'A058',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625573308': {
                itemName: 'A058',
                color: 'PLS',
                size: '40B'
            },
        
            '8902625573315': {
                itemName: 'A058',
                color: 'PLS',
                size: '40C'
            },
        
            '8902625046703': {
                itemName: 'A058',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625046710': {
                itemName: 'A058',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625046727': {
                itemName: 'A058',
                color: 'WHITE',
                size: '32D'
            },
        
            '8902625046734': {
                itemName: 'A058',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625046741': {
                itemName: 'A058',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625046758': {
                itemName: 'A058',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625046765': {
                itemName: 'A058',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625046772': {
                itemName: 'A058',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625046789': {
                itemName: 'A058',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625046796': {
                itemName: 'A058',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625046802': {
                itemName: 'A058',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625046819': {
                itemName: 'A058',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625046826': {
                itemName: 'A058',
                color: 'WHITE',
                size: '40B'
            },
        
            '8902625046833': {
                itemName: 'A058',
                color: 'WHITE',
                size: '40C'
            },
        
            '8902625831323': {
                itemName: 'A064',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625831330': {
                itemName: 'A064',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625831347': {
                itemName: 'A064',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625831354': {
                itemName: 'A064',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625831361': {
                itemName: 'A064',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625831378': {
                itemName: 'A064',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625831385': {
                itemName: 'A064',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625831392': {
                itemName: 'A064',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625831408': {
                itemName: 'A064',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625831415': {
                itemName: 'A064',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625831422': {
                itemName: 'A064',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625831439': {
                itemName: 'A064',
                color: 'GRW',
                size: '32C'
            },
        
            '8902625831446': {
                itemName: 'A064',
                color: 'GRW',
                size: '32D'
            },
        
            '8902625831453': {
                itemName: 'A064',
                color: 'GRW',
                size: '34B'
            },
        
            '8902625831460': {
                itemName: 'A064',
                color: 'GRW',
                size: '34C'
            },
        
            '8902625831477': {
                itemName: 'A064',
                color: 'GRW',
                size: '34D'
            },
        
            '8902625831484': {
                itemName: 'A064',
                color: 'GRW',
                size: '36B'
            },
        
            '8902625831491': {
                itemName: 'A064',
                color: 'GRW',
                size: '36C'
            },
        
            '8902625831507': {
                itemName: 'A064',
                color: 'GRW',
                size: '36D'
            },
        
            '8902625831514': {
                itemName: 'A064',
                color: 'GRW',
                size: '38B'
            },
        
            '8902625831521': {
                itemName: 'A064',
                color: 'GRW',
                size: '38C'
            },
        
            '8902625831538': {
                itemName: 'A064',
                color: 'GRW',
                size: '38D'
            },
        
            '8902625831545': {
                itemName: 'A064',
                color: 'RTE',
                size: '32C'
            },
        
            '8902625831552': {
                itemName: 'A064',
                color: 'RTE',
                size: '32D'
            },
        
            '8902625831569': {
                itemName: 'A064',
                color: 'RTE',
                size: '34B'
            },
        
            '8902625831576': {
                itemName: 'A064',
                color: 'RTE',
                size: '34C'
            },
        
            '8902625831583': {
                itemName: 'A064',
                color: 'RTE',
                size: '34D'
            },
        
            '8902625831590': {
                itemName: 'A064',
                color: 'RTE',
                size: '36B'
            },
        
            '8902625831606': {
                itemName: 'A064',
                color: 'RTE',
                size: '36C'
            },
        
            '8902625831613': {
                itemName: 'A064',
                color: 'RTE',
                size: '36D'
            },
        
            '8902625831620': {
                itemName: 'A064',
                color: 'RTE',
                size: '38B'
            },
        
            '8902625831637': {
                itemName: 'A064',
                color: 'RTE',
                size: '38C'
            },
        
            '8902625831644': {
                itemName: 'A064',
                color: 'RTE',
                size: '38D'
            },
        
            '8902625835512': {
                itemName: 'A072',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625835529': {
                itemName: 'A072',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625835536': {
                itemName: 'A072',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625835543': {
                itemName: 'A072',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625835550': {
                itemName: 'A072',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625835567': {
                itemName: 'A072',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625835574': {
                itemName: 'A072',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625835581': {
                itemName: 'A072',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625835598': {
                itemName: 'A072',
                color: 'PHB',
                size: '32B'
            },
        
            '8902625835604': {
                itemName: 'A072',
                color: 'PHB',
                size: '32C'
            },
        
            '8902625835611': {
                itemName: 'A072',
                color: 'PHB',
                size: '34B'
            },
        
            '8902625835628': {
                itemName: 'A072',
                color: 'PHB',
                size: '34C'
            },
        
            '8902625835635': {
                itemName: 'A072',
                color: 'PHB',
                size: '36B'
            },
        
            '8902625835642': {
                itemName: 'A072',
                color: 'PHB',
                size: '36C'
            },
        
            '8902625835659': {
                itemName: 'A072',
                color: 'PHB',
                size: '38B'
            },
        
            '8902625835666': {
                itemName: 'A072',
                color: 'PHB',
                size: '38C'
            },
        
            '8902625835673': {
                itemName: 'A072',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625835680': {
                itemName: 'A072',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625835697': {
                itemName: 'A072',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625835703': {
                itemName: 'A072',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625835710': {
                itemName: 'A072',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625835727': {
                itemName: 'A072',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625835734': {
                itemName: 'A072',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625835741': {
                itemName: 'A072',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625835758': {
                itemName: 'A073',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625835765': {
                itemName: 'A073',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625835772': {
                itemName: 'A073',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625835789': {
                itemName: 'A073',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625835796': {
                itemName: 'A073',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625835802': {
                itemName: 'A073',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625835819': {
                itemName: 'A073',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625835826': {
                itemName: 'A073',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625835833': {
                itemName: 'A073',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625835840': {
                itemName: 'A073',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625835857': {
                itemName: 'A073',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625835864': {
                itemName: 'A073',
                color: 'SKIN',
                size: '32B'
            },
        
            '8902625835871': {
                itemName: 'A073',
                color: 'SKIN',
                size: '32C'
            },
        
            '8902625835888': {
                itemName: 'A073',
                color: 'SKIN',
                size: '32D'
            },
        
            '8902625835895': {
                itemName: 'A073',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625835901': {
                itemName: 'A073',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625835918': {
                itemName: 'A073',
                color: 'SKIN',
                size: '34D'
            },
        
            '8902625835925': {
                itemName: 'A073',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625835932': {
                itemName: 'A073',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625835949': {
                itemName: 'A073',
                color: 'SKIN',
                size: '36D'
            },
        
            '8902625835956': {
                itemName: 'A073',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625835963': {
                itemName: 'A073',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625004888': {
                itemName: 'A076',
                color: 'ECL',
                size: 'L'
            },
        
            '8902625004871': {
                itemName: 'A076',
                color: 'ECL',
                size: 'M'
            },
        
            '8902625004864': {
                itemName: 'A076',
                color: 'ECL',
                size: 'S'
            },
        
            '8902625004895': {
                itemName: 'A076',
                color: 'ECL',
                size: 'XL'
            },
        
            '8902625004925': {
                itemName: 'A076',
                color: 'OLT',
                size: 'L'
            },
        
            '8902625004918': {
                itemName: 'A076',
                color: 'OLT',
                size: 'M'
            },
        
            '8902625004901': {
                itemName: 'A076',
                color: 'OLT',
                size: 'S'
            },
        
            '8902625004932': {
                itemName: 'A076',
                color: 'OLT',
                size: 'XL'
            },
        
            '8902625004963': {
                itemName: 'A076',
                color: 'RSBLSH',
                size: 'L'
            },
        
            '8902625004956': {
                itemName: 'A076',
                color: 'RSBLSH',
                size: 'M'
            },
        
            '8902625004949': {
                itemName: 'A076',
                color: 'RSBLSH',
                size: 'S'
            },
        
            '8902625004970': {
                itemName: 'A076',
                color: 'RSBLSH',
                size: 'XL'
            },
        
            '8902625004987': {
                itemName: 'A077',
                color: 'ECL',
                size: '32B'
            },
        
            '8902625004994': {
                itemName: 'A077',
                color: 'ECL',
                size: '32C'
            },
        
            '8902625005007': {
                itemName: 'A077',
                color: 'ECL',
                size: '32D'
            },
        
            '8902625005014': {
                itemName: 'A077',
                color: 'ECL',
                size: '34B'
            },
        
            '8902625005021': {
                itemName: 'A077',
                color: 'ECL',
                size: '34C'
            },
        
            '8902625005038': {
                itemName: 'A077',
                color: 'ECL',
                size: '34D'
            },
        
            '8902625005045': {
                itemName: 'A077',
                color: 'ECL',
                size: '36B'
            },
        
            '8902625005052': {
                itemName: 'A077',
                color: 'ECL',
                size: '36C'
            },
        
            '8902625005069': {
                itemName: 'A077',
                color: 'ECL',
                size: '36D'
            },
        
            '8902625005076': {
                itemName: 'A077',
                color: 'ECL',
                size: '38B'
            },
        
            '8902625005083': {
                itemName: 'A077',
                color: 'ECL',
                size: '38C'
            },
        
            '8902625005090': {
                itemName: 'A077',
                color: 'OLT',
                size: '32B'
            },
        
            '8902625005106': {
                itemName: 'A077',
                color: 'OLT',
                size: '32C'
            },
        
            '8902625005113': {
                itemName: 'A077',
                color: 'OLT',
                size: '32D'
            },
        
            '8902625005120': {
                itemName: 'A077',
                color: 'OLT',
                size: '34B'
            },
        
            '8902625005137': {
                itemName: 'A077',
                color: 'OLT',
                size: '34C'
            },
        
            '8902625005144': {
                itemName: 'A077',
                color: 'OLT',
                size: '34D'
            },
        
            '8902625005151': {
                itemName: 'A077',
                color: 'OLT',
                size: '36B'
            },
        
            '8902625005168': {
                itemName: 'A077',
                color: 'OLT',
                size: '36C'
            },
        
            '8902625005175': {
                itemName: 'A077',
                color: 'OLT',
                size: '36D'
            },
        
            '8902625005182': {
                itemName: 'A077',
                color: 'OLT',
                size: '38B'
            },
        
            '8902625005199': {
                itemName: 'A077',
                color: 'OLT',
                size: '38C'
            },
        
            '8902625005205': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '32B'
            },
        
            '8902625005212': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '32C'
            },
        
            '8902625005229': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '32D'
            },
        
            '8902625005236': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '34B'
            },
        
            '8902625005243': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '34C'
            },
        
            '8902625005250': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '34D'
            },
        
            '8902625005267': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '36B'
            },
        
            '8902625005274': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '36C'
            },
        
            '8902625005281': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '36D'
            },
        
            '8902625005298': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '38B'
            },
        
            '8902625005304': {
                itemName: 'A077',
                color: 'RSBLSH',
                size: '38C'
            },
        
            '8902625001993': {
                itemName: 'A078',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625002006': {
                itemName: 'A078',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625002013': {
                itemName: 'A078',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625002020': {
                itemName: 'A078',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625002037': {
                itemName: 'A078',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625002044': {
                itemName: 'A078',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625002051': {
                itemName: 'A078',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625002068': {
                itemName: 'A078',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625002075': {
                itemName: 'A078',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625002082': {
                itemName: 'A078',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625002099': {
                itemName: 'A078',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625002105': {
                itemName: 'A078',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625002112': {
                itemName: 'A078',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625002129': {
                itemName: 'A078',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625002136': {
                itemName: 'A078',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625002143': {
                itemName: 'A078',
                color: 'BRI',
                size: '32B'
            },
        
            '8902625002150': {
                itemName: 'A078',
                color: 'BRI',
                size: '32C'
            },
        
            '8902625002167': {
                itemName: 'A078',
                color: 'BRI',
                size: '32D'
            },
        
            '8902625002174': {
                itemName: 'A078',
                color: 'BRI',
                size: '32Z'
            },
        
            '8902625002181': {
                itemName: 'A078',
                color: 'BRI',
                size: '34B'
            },
        
            '8902625002198': {
                itemName: 'A078',
                color: 'BRI',
                size: '34C'
            },
        
            '8902625002204': {
                itemName: 'A078',
                color: 'BRI',
                size: '34D'
            },
        
            '8902625002211': {
                itemName: 'A078',
                color: 'BRI',
                size: '34Z'
            },
        
            '8902625002228': {
                itemName: 'A078',
                color: 'BRI',
                size: '36B'
            },
        
            '8902625002235': {
                itemName: 'A078',
                color: 'BRI',
                size: '36C'
            },
        
            '8902625002242': {
                itemName: 'A078',
                color: 'BRI',
                size: '36D'
            },
        
            '8902625002259': {
                itemName: 'A078',
                color: 'BRI',
                size: '36Z'
            },
        
            '8902625002266': {
                itemName: 'A078',
                color: 'BRI',
                size: '38B'
            },
        
            '8902625002273': {
                itemName: 'A078',
                color: 'BRI',
                size: '38C'
            },
        
            '8902625002280': {
                itemName: 'A078',
                color: 'BRI',
                size: '38D'
            },
        
            '8902625002297': {
                itemName: 'A078',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625002303': {
                itemName: 'A078',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625002310': {
                itemName: 'A078',
                color: 'PLS',
                size: '32D'
            },
        
            '8902625002327': {
                itemName: 'A078',
                color: 'PLS',
                size: '32Z'
            },
        
            '8902625002334': {
                itemName: 'A078',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625002341': {
                itemName: 'A078',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625002358': {
                itemName: 'A078',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625002365': {
                itemName: 'A078',
                color: 'PLS',
                size: '34Z'
            },
        
            '8902625002372': {
                itemName: 'A078',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625002389': {
                itemName: 'A078',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625002396': {
                itemName: 'A078',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625002402': {
                itemName: 'A078',
                color: 'PLS',
                size: '36Z'
            },
        
            '8902625002419': {
                itemName: 'A078',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625002426': {
                itemName: 'A078',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625002433': {
                itemName: 'A078',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625037503': {
                itemName: 'A106',
                color: 'BDE',
                size: '2XL'
            },
        
            '8902625573339': {
                itemName: 'A106',
                color: 'BDE',
                size: 'L'
            },
        
            '8902625573346': {
                itemName: 'A106',
                color: 'BDE',
                size: 'M'
            },
        
            '8902625573353': {
                itemName: 'A106',
                color: 'BDE',
                size: 'S'
            },
        
            '8902625573360': {
                itemName: 'A106',
                color: 'BDE',
                size: 'XL'
            },
        
            '8902625573377': {
                itemName: 'A106',
                color: 'BDE',
                size: 'XS'
            },
        
            '8902625037480': {
                itemName: 'A106',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625573384': {
                itemName: 'A106',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625573391': {
                itemName: 'A106',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625573407': {
                itemName: 'A106',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625573414': {
                itemName: 'A106',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625573421': {
                itemName: 'A106',
                color: 'BLACK',
                size: 'XS'
            },
        
            '8902625037497': {
                itemName: 'A106',
                color: 'SKIN',
                size: '2XL'
            },
        
            '8902625573438': {
                itemName: 'A106',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625573445': {
                itemName: 'A106',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625573452': {
                itemName: 'A106',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625573469': {
                itemName: 'A106',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625573476': {
                itemName: 'A106',
                color: 'SKIN',
                size: 'XS'
            },
        
            '8902625037565': {
                itemName: 'A106',
                color: 'WHITE',
                size: '2XL'
            },
        
            '8902625036292': {
                itemName: 'A106',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625036285': {
                itemName: 'A106',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625036278': {
                itemName: 'A106',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625036308': {
                itemName: 'A106',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625036315': {
                itemName: 'A106',
                color: 'WHITE',
                size: 'XS'
            },
        
            '8902625557025': {
                itemName: 'A112',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625557032': {
                itemName: 'A112',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625557049': {
                itemName: 'A112',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625557056': {
                itemName: 'A112',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625557063': {
                itemName: 'A112',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625557070': {
                itemName: 'A112',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625557087': {
                itemName: 'A112',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625557094': {
                itemName: 'A112',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625557100': {
                itemName: 'A112',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625557117': {
                itemName: 'A112',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625557124': {
                itemName: 'A112',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625557131': {
                itemName: 'A112',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625557148': {
                itemName: 'A112',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625557155': {
                itemName: 'A112',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625557162': {
                itemName: 'A112',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625557179': {
                itemName: 'A112',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625557186': {
                itemName: 'A112',
                color: 'BLACK',
                size: '42B'
            },
        
            '8902625557193': {
                itemName: 'A112',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625557209': {
                itemName: 'A112',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625557216': {
                itemName: 'A112',
                color: 'BLACK',
                size: '42Z'
            },
        
            '8902625573483': {
                itemName: 'A112',
                color: 'CMG',
                size: '34B'
            },
        
            '8902625573490': {
                itemName: 'A112',
                color: 'CMG',
                size: '34C'
            },
        
            '8902625573506': {
                itemName: 'A112',
                color: 'CMG',
                size: '34D'
            },
        
            '8902625573513': {
                itemName: 'A112',
                color: 'CMG',
                size: '34Z'
            },
        
            '8902625573520': {
                itemName: 'A112',
                color: 'CMG',
                size: '36B'
            },
        
            '8902625573537': {
                itemName: 'A112',
                color: 'CMG',
                size: '36C'
            },
        
            '8902625573544': {
                itemName: 'A112',
                color: 'CMG',
                size: '36D'
            },
        
            '8902625573551': {
                itemName: 'A112',
                color: 'CMG',
                size: '36Z'
            },
        
            '8902625573568': {
                itemName: 'A112',
                color: 'CMG',
                size: '38B'
            },
        
            '8902625573575': {
                itemName: 'A112',
                color: 'CMG',
                size: '38C'
            },
        
            '8902625573582': {
                itemName: 'A112',
                color: 'CMG',
                size: '38D'
            },
        
            '8902625573599': {
                itemName: 'A112',
                color: 'CMG',
                size: '38Z'
            },
        
            '8902625573605': {
                itemName: 'A112',
                color: 'CMG',
                size: '40B'
            },
        
            '8902625573612': {
                itemName: 'A112',
                color: 'CMG',
                size: '40C'
            },
        
            '8902625573629': {
                itemName: 'A112',
                color: 'CMG',
                size: '40D'
            },
        
            '8902625573636': {
                itemName: 'A112',
                color: 'CMG',
                size: '40Z'
            },
        
            '8902625573643': {
                itemName: 'A112',
                color: 'CMG',
                size: '42B'
            },
        
            '8902625573650': {
                itemName: 'A112',
                color: 'CMG',
                size: '42C'
            },
        
            '8902625573667': {
                itemName: 'A112',
                color: 'CMG',
                size: '42D'
            },
        
            '8902625573674': {
                itemName: 'A112',
                color: 'CMG',
                size: '42Z'
            },
        
            '8902625573681': {
                itemName: 'A112',
                color: 'GRW',
                size: '34B'
            },
        
            '8902625573698': {
                itemName: 'A112',
                color: 'GRW',
                size: '34C'
            },
        
            '8902625573704': {
                itemName: 'A112',
                color: 'GRW',
                size: '34D'
            },
        
            '8902625573711': {
                itemName: 'A112',
                color: 'GRW',
                size: '34Z'
            },
        
            '8902625573728': {
                itemName: 'A112',
                color: 'GRW',
                size: '36B'
            },
        
            '8902625573735': {
                itemName: 'A112',
                color: 'GRW',
                size: '36C'
            },
        
            '8902625573742': {
                itemName: 'A112',
                color: 'GRW',
                size: '36D'
            },
        
            '8902625573759': {
                itemName: 'A112',
                color: 'GRW',
                size: '36Z'
            },
        
            '8902625573766': {
                itemName: 'A112',
                color: 'GRW',
                size: '38B'
            },
        
            '8902625573773': {
                itemName: 'A112',
                color: 'GRW',
                size: '38C'
            },
        
            '8902625573780': {
                itemName: 'A112',
                color: 'GRW',
                size: '38D'
            },
        
            '8902625573797': {
                itemName: 'A112',
                color: 'GRW',
                size: '38Z'
            },
        
            '8902625573803': {
                itemName: 'A112',
                color: 'GRW',
                size: '40B'
            },
        
            '8902625573810': {
                itemName: 'A112',
                color: 'GRW',
                size: '40C'
            },
        
            '8902625573827': {
                itemName: 'A112',
                color: 'GRW',
                size: '40D'
            },
        
            '8902625573834': {
                itemName: 'A112',
                color: 'GRW',
                size: '40Z'
            },
        
            '8902625573841': {
                itemName: 'A112',
                color: 'GRW',
                size: '42B'
            },
        
            '8902625573858': {
                itemName: 'A112',
                color: 'GRW',
                size: '42C'
            },
        
            '8902625573865': {
                itemName: 'A112',
                color: 'GRW',
                size: '42D'
            },
        
            '8902625573872': {
                itemName: 'A112',
                color: 'GRW',
                size: '42Z'
            },
        
            '8902625551900': {
                itemName: 'A112',
                color: 'PBH',
                size: '32B'
            },
        
            '8902625551917': {
                itemName: 'A112',
                color: 'PBH',
                size: '32C'
            },
        
            '8902625551924': {
                itemName: 'A112',
                color: 'PBH',
                size: '32D'
            },
        
            '8902625551931': {
                itemName: 'A112',
                color: 'PBH',
                size: '32Z'
            },
        
            '8902625557223': {
                itemName: 'A112',
                color: 'PBH',
                size: '34B'
            },
        
            '8902625557230': {
                itemName: 'A112',
                color: 'PBH',
                size: '34C'
            },
        
            '8902625557247': {
                itemName: 'A112',
                color: 'PBH',
                size: '34D'
            },
        
            '8902625557254': {
                itemName: 'A112',
                color: 'PBH',
                size: '34Z'
            },
        
            '8902625557261': {
                itemName: 'A112',
                color: 'PBH',
                size: '36B'
            },
        
            '8902625557278': {
                itemName: 'A112',
                color: 'PBH',
                size: '36C'
            },
        
            '8902625557285': {
                itemName: 'A112',
                color: 'PBH',
                size: '36D'
            },
        
            '8902625557292': {
                itemName: 'A112',
                color: 'PBH',
                size: '36Z'
            },
        
            '8902625557308': {
                itemName: 'A112',
                color: 'PBH',
                size: '38B'
            },
        
            '8902625557315': {
                itemName: 'A112',
                color: 'PBH',
                size: '38C'
            },
        
            '8902625557322': {
                itemName: 'A112',
                color: 'PBH',
                size: '38D'
            },
        
            '8902625557339': {
                itemName: 'A112',
                color: 'PBH',
                size: '38Z'
            },
        
            '8902625557346': {
                itemName: 'A112',
                color: 'PBH',
                size: '40B'
            },
        
            '8902625557353': {
                itemName: 'A112',
                color: 'PBH',
                size: '40C'
            },
        
            '8902625557360': {
                itemName: 'A112',
                color: 'PBH',
                size: '40D'
            },
        
            '8902625557377': {
                itemName: 'A112',
                color: 'PBH',
                size: '40Z'
            },
        
            '8902625557384': {
                itemName: 'A112',
                color: 'PBH',
                size: '42B'
            },
        
            '8902625557391': {
                itemName: 'A112',
                color: 'PBH',
                size: '42C'
            },
        
            '8902625557407': {
                itemName: 'A112',
                color: 'PBH',
                size: '42D'
            },
        
            '8902625557414': {
                itemName: 'A112',
                color: 'PBH',
                size: '42Z'
            },
        
            '8902625551948': {
                itemName: 'A112',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625551955': {
                itemName: 'A112',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625551962': {
                itemName: 'A112',
                color: 'PLS',
                size: '32D'
            },
        
            '8902625551979': {
                itemName: 'A112',
                color: 'PLS',
                size: '32Z'
            },
        
            '8902625557421': {
                itemName: 'A112',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625557438': {
                itemName: 'A112',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625557445': {
                itemName: 'A112',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625557452': {
                itemName: 'A112',
                color: 'PLS',
                size: '34Z'
            },
        
            '8902625557469': {
                itemName: 'A112',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625557476': {
                itemName: 'A112',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625557483': {
                itemName: 'A112',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625557490': {
                itemName: 'A112',
                color: 'PLS',
                size: '36Z'
            },
        
            '8902625557506': {
                itemName: 'A112',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625557513': {
                itemName: 'A112',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625557520': {
                itemName: 'A112',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625557537': {
                itemName: 'A112',
                color: 'PLS',
                size: '38Z'
            },
        
            '8902625557544': {
                itemName: 'A112',
                color: 'PLS',
                size: '40B'
            },
        
            '8902625557551': {
                itemName: 'A112',
                color: 'PLS',
                size: '40C'
            },
        
            '8902625557568': {
                itemName: 'A112',
                color: 'PLS',
                size: '40D'
            },
        
            '8902625557575': {
                itemName: 'A112',
                color: 'PLS',
                size: '40Z'
            },
        
            '8902625557582': {
                itemName: 'A112',
                color: 'PLS',
                size: '42B'
            },
        
            '8902625557599': {
                itemName: 'A112',
                color: 'PLS',
                size: '42C'
            },
        
            '8902625557605': {
                itemName: 'A112',
                color: 'PLS',
                size: '42D'
            },
        
            '8902625557612': {
                itemName: 'A112',
                color: 'PLS',
                size: '42Z'
            },
        
            '8902625574084': {
                itemName: 'A112',
                color: 'RTE',
                size: '34B'
            },
        
            '8902625574091': {
                itemName: 'A112',
                color: 'RTE',
                size: '34C'
            },
        
            '8902625574107': {
                itemName: 'A112',
                color: 'RTE',
                size: '34D'
            },
        
            '8902625574114': {
                itemName: 'A112',
                color: 'RTE',
                size: '34Z'
            },
        
            '8902625574121': {
                itemName: 'A112',
                color: 'RTE',
                size: '36B'
            },
        
            '8902625574138': {
                itemName: 'A112',
                color: 'RTE',
                size: '36C'
            },
        
            '8902625574145': {
                itemName: 'A112',
                color: 'RTE',
                size: '36D'
            },
        
            '8902625574152': {
                itemName: 'A112',
                color: 'RTE',
                size: '36Z'
            },
        
            '8902625574169': {
                itemName: 'A112',
                color: 'RTE',
                size: '38B'
            },
        
            '8902625574176': {
                itemName: 'A112',
                color: 'RTE',
                size: '38C'
            },
        
            '8902625574183': {
                itemName: 'A112',
                color: 'RTE',
                size: '38D'
            },
        
            '8902625574190': {
                itemName: 'A112',
                color: 'RTE',
                size: '38Z'
            },
        
            '8902625574206': {
                itemName: 'A112',
                color: 'RTE',
                size: '40B'
            },
        
            '8902625574213': {
                itemName: 'A112',
                color: 'RTE',
                size: '40C'
            },
        
            '8902625574220': {
                itemName: 'A112',
                color: 'RTE',
                size: '40D'
            },
        
            '8902625574237': {
                itemName: 'A112',
                color: 'RTE',
                size: '40Z'
            },
        
            '8902625574244': {
                itemName: 'A112',
                color: 'RTE',
                size: '42B'
            },
        
            '8902625574251': {
                itemName: 'A112',
                color: 'RTE',
                size: '42C'
            },
        
            '8902625574268': {
                itemName: 'A112',
                color: 'RTE',
                size: '42D'
            },
        
            '8902625574275': {
                itemName: 'A112',
                color: 'RTE',
                size: '42Z'
            },
        
            '8902625574282': {
                itemName: 'A112',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625574299': {
                itemName: 'A112',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625574305': {
                itemName: 'A112',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625574312': {
                itemName: 'A112',
                color: 'WHITE',
                size: '34Z'
            },
        
            '8902625574329': {
                itemName: 'A112',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625574336': {
                itemName: 'A112',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625574343': {
                itemName: 'A112',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625574350': {
                itemName: 'A112',
                color: 'WHITE',
                size: '36Z'
            },
        
            '8902625574367': {
                itemName: 'A112',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625574374': {
                itemName: 'A112',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625574381': {
                itemName: 'A112',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625574398': {
                itemName: 'A112',
                color: 'WHITE',
                size: '38Z'
            },
        
            '8902625574404': {
                itemName: 'A112',
                color: 'WHITE',
                size: '40B'
            },
        
            '8902625574411': {
                itemName: 'A112',
                color: 'WHITE',
                size: '40C'
            },
        
            '8902625574428': {
                itemName: 'A112',
                color: 'WHITE',
                size: '40D'
            },
        
            '8902625574435': {
                itemName: 'A112',
                color: 'WHITE',
                size: '40Z'
            },
        
            '8902625574442': {
                itemName: 'A112',
                color: 'WHITE',
                size: '42B'
            },
        
            '8902625574459': {
                itemName: 'A112',
                color: 'WHITE',
                size: '42C'
            },
        
            '8902625574466': {
                itemName: 'A112',
                color: 'WHITE',
                size: '42D'
            },
        
            '8902625574473': {
                itemName: 'A112',
                color: 'WHITE',
                size: '42Z'
            },
        
            '8902625036056': {
                itemName: 'A125',
                color: 'CHAMEL',
                size: 'L'
            },
        
            '8902625036049': {
                itemName: 'A125',
                color: 'CHAMEL',
                size: 'M'
            },
        
            '8902625036032': {
                itemName: 'A125',
                color: 'CHAMEL',
                size: 'S'
            },
        
            '8902625036063': {
                itemName: 'A125',
                color: 'CHAMEL',
                size: 'XL'
            },
        
            '8902625036018': {
                itemName: 'A125',
                color: 'GRYMEL',
                size: 'L'
            },
        
            '8902625036001': {
                itemName: 'A125',
                color: 'GRYMEL',
                size: 'M'
            },
        
            '8902625035998': {
                itemName: 'A125',
                color: 'GRYMEL',
                size: 'S'
            },
        
            '8902625036025': {
                itemName: 'A125',
                color: 'GRYMEL',
                size: 'XL'
            },
        
            '8902625035974': {
                itemName: 'A125',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625035967': {
                itemName: 'A125',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625035950': {
                itemName: 'A125',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625035981': {
                itemName: 'A125',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625047731': {
                itemName: 'A132',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625050090': {
                itemName: 'A132',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625050106': {
                itemName: 'A132',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625050113': {
                itemName: 'A132',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625050120': {
                itemName: 'A132',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625050137': {
                itemName: 'A132',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625050144': {
                itemName: 'A132',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625050151': {
                itemName: 'A132',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625050168': {
                itemName: 'A132',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625050175': {
                itemName: 'A132',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625050182': {
                itemName: 'A132',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625047847': {
                itemName: 'A132',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625047854': {
                itemName: 'A132',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625047861': {
                itemName: 'A132',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625047878': {
                itemName: 'A132',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625050069': {
                itemName: 'A132',
                color: 'CBP',
                size: '32B'
            },
        
            '8902625047595': {
                itemName: 'A132',
                color: 'CBP',
                size: '32C'
            },
        
            '8902625047601': {
                itemName: 'A132',
                color: 'CBP',
                size: '32D'
            },
        
            '8902625047618': {
                itemName: 'A132',
                color: 'CBP',
                size: '32Z'
            },
        
            '8902625047625': {
                itemName: 'A132',
                color: 'CBP',
                size: '34B'
            },
        
            '8902625047632': {
                itemName: 'A132',
                color: 'CBP',
                size: '34C'
            },
        
            '8902625047649': {
                itemName: 'A132',
                color: 'CBP',
                size: '34D'
            },
        
            '8902625047656': {
                itemName: 'A132',
                color: 'CBP',
                size: '34Z'
            },
        
            '8902625047663': {
                itemName: 'A132',
                color: 'CBP',
                size: '36B'
            },
        
            '8902625047670': {
                itemName: 'A132',
                color: 'CBP',
                size: '36C'
            },
        
            '8902625047687': {
                itemName: 'A132',
                color: 'CBP',
                size: '36D'
            },
        
            '8902625047694': {
                itemName: 'A132',
                color: 'CBP',
                size: '36Z'
            },
        
            '8902625050076': {
                itemName: 'A132',
                color: 'CBP',
                size: '38B'
            },
        
            '8902625047717': {
                itemName: 'A132',
                color: 'CBP',
                size: '38C'
            },
        
            '8902625050083': {
                itemName: 'A132',
                color: 'CBP',
                size: '38D'
            },
        
            '8902625049933': {
                itemName: 'A132',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625047441': {
                itemName: 'A132',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625049940': {
                itemName: 'A132',
                color: 'PLS',
                size: '32D'
            },
        
            '8902625047465': {
                itemName: 'A132',
                color: 'PLS',
                size: '32Z'
            },
        
            '8902625049957': {
                itemName: 'A132',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625049964': {
                itemName: 'A132',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625049971': {
                itemName: 'A132',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625049988': {
                itemName: 'A132',
                color: 'PLS',
                size: '34Z'
            },
        
            '8902625049995': {
                itemName: 'A132',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625050007': {
                itemName: 'A132',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625050014': {
                itemName: 'A132',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625050021': {
                itemName: 'A132',
                color: 'PLS',
                size: '36Z'
            },
        
            '8902625050038': {
                itemName: 'A132',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625050045': {
                itemName: 'A132',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625050052': {
                itemName: 'A132',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625829313': {
                itemName: 'A165',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625829320': {
                itemName: 'A165',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625829337': {
                itemName: 'A165',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625829344': {
                itemName: 'A165',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625829351': {
                itemName: 'A165',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625829368': {
                itemName: 'A165',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625829375': {
                itemName: 'A165',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625829382': {
                itemName: 'A165',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625829399': {
                itemName: 'A165',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625829405': {
                itemName: 'A165',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625829412': {
                itemName: 'A165',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625829429': {
                itemName: 'A165',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625829436': {
                itemName: 'A165',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625829443': {
                itemName: 'A165',
                color: 'PLS',
                size: '32D'
            },
        
            '8902625829450': {
                itemName: 'A165',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625829467': {
                itemName: 'A165',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625829474': {
                itemName: 'A165',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625829481': {
                itemName: 'A165',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625829498': {
                itemName: 'A165',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625829504': {
                itemName: 'A165',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625829511': {
                itemName: 'A165',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625829528': {
                itemName: 'A165',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625829535': {
                itemName: 'A165',
                color: 'TSE',
                size: '32B'
            },
        
            '8902625829542': {
                itemName: 'A165',
                color: 'TSE',
                size: '32C'
            },
        
            '8902625829559': {
                itemName: 'A165',
                color: 'TSE',
                size: '32D'
            },
        
            '8902625829566': {
                itemName: 'A165',
                color: 'TSE',
                size: '34B'
            },
        
            '8902625829573': {
                itemName: 'A165',
                color: 'TSE',
                size: '34C'
            },
        
            '8902625829580': {
                itemName: 'A165',
                color: 'TSE',
                size: '34D'
            },
        
            '8902625829597': {
                itemName: 'A165',
                color: 'TSE',
                size: '36B'
            },
        
            '8902625829603': {
                itemName: 'A165',
                color: 'TSE',
                size: '36C'
            },
        
            '8902625829610': {
                itemName: 'A165',
                color: 'TSE',
                size: '36D'
            },
        
            '8902625829627': {
                itemName: 'A165',
                color: 'TSE',
                size: '38B'
            },
        
            '8902625829634': {
                itemName: 'A165',
                color: 'TSE',
                size: '38C'
            },
        
            '8902625558107': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625558114': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625558121': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625558138': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625558145': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625558152': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625558169': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625558176': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625558183': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625558190': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625558206': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625558213': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625558220': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '42B'
            },
        
            '8902625558237': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625558244': {
                itemName: 'AB75',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625836052': {
                itemName: 'AB75',
                color: 'ODM',
                size: '34B'
            },
        
            '8902625836069': {
                itemName: 'AB75',
                color: 'ODM',
                size: '34C'
            },
        
            '8902625836076': {
                itemName: 'AB75',
                color: 'ODM',
                size: '34D'
            },
        
            '8902625836083': {
                itemName: 'AB75',
                color: 'ODM',
                size: '36B'
            },
        
            '8902625836090': {
                itemName: 'AB75',
                color: 'ODM',
                size: '36C'
            },
        
            '8902625836106': {
                itemName: 'AB75',
                color: 'ODM',
                size: '36D'
            },
        
            '8902625836113': {
                itemName: 'AB75',
                color: 'ODM',
                size: '38B'
            },
        
            '8902625836120': {
                itemName: 'AB75',
                color: 'ODM',
                size: '38C'
            },
        
            '8902625836137': {
                itemName: 'AB75',
                color: 'ODM',
                size: '38D'
            },
        
            '8902625836144': {
                itemName: 'AB75',
                color: 'ODM',
                size: '40B'
            },
        
            '8902625836151': {
                itemName: 'AB75',
                color: 'ODM',
                size: '40C'
            },
        
            '8902625836168': {
                itemName: 'AB75',
                color: 'ODM',
                size: '40D'
            },
        
            '8902625607669': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '34B'
            },
        
            '8902625607676': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '34C'
            },
        
            '8902625607683': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '34D'
            },
        
            '8902625607690': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '36B'
            },
        
            '8902625607706': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '36C'
            },
        
            '8902625607713': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '36D'
            },
        
            '8902625607720': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '38B'
            },
        
            '8902625607737': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '38C'
            },
        
            '8902625607744': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '38D'
            },
        
            '8902625607751': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '40B'
            },
        
            '8902625607768': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '40C'
            },
        
            '8902625607775': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '40D'
            },
        
            '8902625607782': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '42B'
            },
        
            '8902625607799': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '42C'
            },
        
            '8902625607805': {
                itemName: 'AB75',
                color: 'PEARL',
                size: '42D'
            },
        
            '8902625558251': {
                itemName: 'AB75',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625558268': {
                itemName: 'AB75',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625558275': {
                itemName: 'AB75',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625558282': {
                itemName: 'AB75',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625558299': {
                itemName: 'AB75',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625558305': {
                itemName: 'AB75',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625558312': {
                itemName: 'AB75',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625558329': {
                itemName: 'AB75',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625558336': {
                itemName: 'AB75',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625558343': {
                itemName: 'AB75',
                color: 'PLS',
                size: '40B'
            },
        
            '8902625558350': {
                itemName: 'AB75',
                color: 'PLS',
                size: '40C'
            },
        
            '8902625558367': {
                itemName: 'AB75',
                color: 'PLS',
                size: '40D'
            },
        
            '8902625558374': {
                itemName: 'AB75',
                color: 'PLS',
                size: '42B'
            },
        
            '8902625558381': {
                itemName: 'AB75',
                color: 'PLS',
                size: '42C'
            },
        
            '8902625558398': {
                itemName: 'AB75',
                color: 'PLS',
                size: '42D'
            },
        
            '8902625558404': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '34B'
            },
        
            '8902625558411': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '34C'
            },
        
            '8902625558428': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '34D'
            },
        
            '8902625558435': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '36B'
            },
        
            '8902625558442': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '36C'
            },
        
            '8902625558459': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '36D'
            },
        
            '8902625558466': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '38B'
            },
        
            '8902625558473': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '38C'
            },
        
            '8902625558480': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '38D'
            },
        
            '8902625558497': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '40B'
            },
        
            '8902625558503': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '40C'
            },
        
            '8902625558510': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '40D'
            },
        
            '8902625558527': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '42B'
            },
        
            '8902625558534': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '42C'
            },
        
            '8902625558541': {
                itemName: 'AB75',
                color: 'PURPLE',
                size: '42D'
            },
        
            '8902625558558': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625558565': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625558572': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625558589': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625558596': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625558602': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625558619': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625558626': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625558633': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625558640': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '40B'
            },
        
            '8902625558657': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '40C'
            },
        
            '8902625558664': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '40D'
            },
        
            '8902625558671': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '42B'
            },
        
            '8902625558688': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '42C'
            },
        
            '8902625558695': {
                itemName: 'AB75',
                color: 'WHITE',
                size: '42D'
            },
        
            '8902625575708': {
                itemName: 'BB01',
                color: 'SKIN',
                size: '2xs'
            },
        
            '8902625575678': {
                itemName: 'BB01',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625575685': {
                itemName: 'BB01',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625575692': {
                itemName: 'BB01',
                color: 'SKIN',
                size: 'XS'
            },
        
            '8902625575746': {
                itemName: 'BB01',
                color: 'WHITE',
                size: '2xs'
            },
        
            '8902625575715': {
                itemName: 'BB01',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625575722': {
                itemName: 'BB01',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625575739': {
                itemName: 'BB01',
                color: 'WHITE',
                size: 'XS'
            },
        
            '8902625575784': {
                itemName: 'BB02',
                color: 'BLACK',
                size: '2xs'
            },
        
            '8902625575753': {
                itemName: 'BB02',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625575760': {
                itemName: 'BB02',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625575777': {
                itemName: 'BB02',
                color: 'BLACK',
                size: 'XS'
            },
        
            '8902625575821': {
                itemName: 'BB02',
                color: 'PEARL',
                size: '2xs'
            },
        
            '8902625575791': {
                itemName: 'BB02',
                color: 'PEARL',
                size: 'M'
            },
        
            '8902625575807': {
                itemName: 'BB02',
                color: 'PEARL',
                size: 'S'
            },
        
            '8902625575814': {
                itemName: 'BB02',
                color: 'PEARL',
                size: 'XS'
            },
        
            '8902625575869': {
                itemName: 'BB02',
                color: 'WHITE',
                size: '2xs'
            },
        
            '8902625575838': {
                itemName: 'BB02',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625575845': {
                itemName: 'BB02',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625575852': {
                itemName: 'BB02',
                color: 'WHITE',
                size: 'XS'
            },
        
            '8902625178923': {
                itemName: 'E001',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625178930': {
                itemName: 'E001',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625178947': {
                itemName: 'E001',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625178954': {
                itemName: 'E001',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625179081': {
                itemName: 'E001',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625179098': {
                itemName: 'E001',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625179104': {
                itemName: 'E001',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625179111': {
                itemName: 'E001',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625179166': {
                itemName: 'E001',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625179173': {
                itemName: 'E001',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625179180': {
                itemName: 'E001',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625179197': {
                itemName: 'E001',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625270993': {
                itemName: 'E003',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625271006': {
                itemName: 'E003',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625271013': {
                itemName: 'E003',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625271020': {
                itemName: 'E003',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625271037': {
                itemName: 'E003',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625271044': {
                itemName: 'E003',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625271051': {
                itemName: 'E003',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625271068': {
                itemName: 'E003',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625270955': {
                itemName: 'E003',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625270962': {
                itemName: 'E003',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625270979': {
                itemName: 'E003',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625270986': {
                itemName: 'E003',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625179432': {
                itemName: 'E007',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625179449': {
                itemName: 'E007',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625179456': {
                itemName: 'E007',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625179463': {
                itemName: 'E007',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625179517': {
                itemName: 'E007',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625179524': {
                itemName: 'E007',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625179531': {
                itemName: 'E007',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625179548': {
                itemName: 'E007',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625193803': {
                itemName: 'E007',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625193810': {
                itemName: 'E007',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625193827': {
                itemName: 'E007',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625193834': {
                itemName: 'E007',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625012784': {
                itemName: 'E016',
                color: 'BTWH',
                size: '2XL'
            },
        
            '8902625012760': {
                itemName: 'E016',
                color: 'BTWH',
                size: 'L'
            },
        
            '8902625012753': {
                itemName: 'E016',
                color: 'BTWH',
                size: 'M'
            },
        
            '8902625012746': {
                itemName: 'E016',
                color: 'BTWH',
                size: 'S'
            },
        
            '8902625012777': {
                itemName: 'E016',
                color: 'BTWH',
                size: 'XL'
            },
        
            '8902625012982': {
                itemName: 'E016',
                color: 'HBSCS',
                size: '2XL'
            },
        
            '8902625012968': {
                itemName: 'E016',
                color: 'HBSCS',
                size: 'L'
            },
        
            '8902625012951': {
                itemName: 'E016',
                color: 'HBSCS',
                size: 'M'
            },
        
            '8902625012944': {
                itemName: 'E016',
                color: 'HBSCS',
                size: 'S'
            },
        
            '8902625012975': {
                itemName: 'E016',
                color: 'HBSCS',
                size: 'XL'
            },
        
            '8902625012883': {
                itemName: 'E016',
                color: 'HLMLLC',
                size: '2XL'
            },
        
            '8902625012869': {
                itemName: 'E016',
                color: 'HLMLLC',
                size: 'L'
            },
        
            '8902625012852': {
                itemName: 'E016',
                color: 'HLMLLC',
                size: 'M'
            },
        
            '8902625012845': {
                itemName: 'E016',
                color: 'HLMLLC',
                size: 'S'
            },
        
            '8902625012876': {
                itemName: 'E016',
                color: 'HLMLLC',
                size: 'XL'
            },
        
            '8902625012937': {
                itemName: 'E016',
                color: 'HTRRSE',
                size: '2XL'
            },
        
            '8902625012913': {
                itemName: 'E016',
                color: 'HTRRSE',
                size: 'L'
            },
        
            '8902625012906': {
                itemName: 'E016',
                color: 'HTRRSE',
                size: 'M'
            },
        
            '8902625012890': {
                itemName: 'E016',
                color: 'HTRRSE',
                size: 'S'
            },
        
            '8902625012920': {
                itemName: 'E016',
                color: 'HTRRSE',
                size: 'XL'
            },
        
            '8902625012739': {
                itemName: 'E016',
                color: 'JETBLK',
                size: '2XL'
            },
        
            '8902625012715': {
                itemName: 'E016',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625012708': {
                itemName: 'E016',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625012692': {
                itemName: 'E016',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625012722': {
                itemName: 'E016',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625013033': {
                itemName: 'E016',
                color: 'LGM',
                size: '2XL'
            },
        
            '8902625013019': {
                itemName: 'E016',
                color: 'LGM',
                size: 'L'
            },
        
            '8902625013002': {
                itemName: 'E016',
                color: 'LGM',
                size: 'M'
            },
        
            '8902625012999': {
                itemName: 'E016',
                color: 'LGM',
                size: 'S'
            },
        
            '8902625013026': {
                itemName: 'E016',
                color: 'LGM',
                size: 'XL'
            },
        
            '8902625013088': {
                itemName: 'E016',
                color: 'LTBM',
                size: '2XL'
            },
        
            '8902625013064': {
                itemName: 'E016',
                color: 'LTBM',
                size: 'L'
            },
        
            '8902625013057': {
                itemName: 'E016',
                color: 'LTBM',
                size: 'M'
            },
        
            '8902625013040': {
                itemName: 'E016',
                color: 'LTBM',
                size: 'S'
            },
        
            '8902625013071': {
                itemName: 'E016',
                color: 'LTBM',
                size: 'XL'
            },
        
            '8902625012838': {
                itemName: 'E016',
                color: 'SKIN',
                size: '2XL'
            },
        
            '8902625012814': {
                itemName: 'E016',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625012807': {
                itemName: 'E016',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625012791': {
                itemName: 'E016',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625012821': {
                itemName: 'E016',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625242792': {
                itemName: 'E025',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625242808': {
                itemName: 'E025',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625242815': {
                itemName: 'E025',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625242822': {
                itemName: 'E025',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625387110': {
                itemName: 'E025',
                color: 'NAVY',
                size: 'L'
            },
        
            '8902625387127': {
                itemName: 'E025',
                color: 'NAVY',
                size: 'M'
            },
        
            '8902625387134': {
                itemName: 'E025',
                color: 'NAVY',
                size: 'S'
            },
        
            '8902625387141': {
                itemName: 'E025',
                color: 'NAVY',
                size: 'XL'
            },
        
            '8902625292322': {
                itemName: 'E025',
                color: 'PHP',
                size: 'L'
            },
        
            '8902625292339': {
                itemName: 'E025',
                color: 'PHP',
                size: 'M'
            },
        
            '8902625292346': {
                itemName: 'E025',
                color: 'PHP',
                size: 'S'
            },
        
            '8902625292353': {
                itemName: 'E025',
                color: 'PHP',
                size: 'XL'
            },
        
            '8902625242839': {
                itemName: 'E025',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625242846': {
                itemName: 'E025',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625242853': {
                itemName: 'E025',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625242860': {
                itemName: 'E025',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625242679': {
                itemName: 'E032',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625242686': {
                itemName: 'E032',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625242693': {
                itemName: 'E032',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625242709': {
                itemName: 'E032',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625242716': {
                itemName: 'E032',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625242723': {
                itemName: 'E032',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625242730': {
                itemName: 'E032',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625242747': {
                itemName: 'E032',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625242631': {
                itemName: 'E032',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625242648': {
                itemName: 'E032',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625242655': {
                itemName: 'E032',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625242662': {
                itemName: 'E032',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625388964': {
                itemName: 'E095',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625388971': {
                itemName: 'E095',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625388988': {
                itemName: 'E095',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625388995': {
                itemName: 'E095',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625389008': {
                itemName: 'E095',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625389015': {
                itemName: 'E095',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625389022': {
                itemName: 'E095',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625389039': {
                itemName: 'E095',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625557629': {
                itemName: 'MT02',
                color: 'CPM',
                size: '34B'
            },
        
            '8902625557636': {
                itemName: 'MT02',
                color: 'CPM',
                size: '34C'
            },
        
            '8902625557643': {
                itemName: 'MT02',
                color: 'CPM',
                size: '34D'
            },
        
            '8902625557650': {
                itemName: 'MT02',
                color: 'CPM',
                size: '34Z'
            },
        
            '8902625557667': {
                itemName: 'MT02',
                color: 'CPM',
                size: '36B'
            },
        
            '8902625557674': {
                itemName: 'MT02',
                color: 'CPM',
                size: '36C'
            },
        
            '8902625557681': {
                itemName: 'MT02',
                color: 'CPM',
                size: '36D'
            },
        
            '8902625557698': {
                itemName: 'MT02',
                color: 'CPM',
                size: '36Z'
            },
        
            '8902625557704': {
                itemName: 'MT02',
                color: 'CPM',
                size: '38B'
            },
        
            '8902625557711': {
                itemName: 'MT02',
                color: 'CPM',
                size: '38C'
            },
        
            '8902625557728': {
                itemName: 'MT02',
                color: 'CPM',
                size: '38D'
            },
        
            '8902625557735': {
                itemName: 'MT02',
                color: 'CPM',
                size: '38Z'
            },
        
            '8902625557742': {
                itemName: 'MT02',
                color: 'CPM',
                size: '40B'
            },
        
            '8902625557759': {
                itemName: 'MT02',
                color: 'CPM',
                size: '40C'
            },
        
            '8902625557766': {
                itemName: 'MT02',
                color: 'CPM',
                size: '40D'
            },
        
            '8902625557773': {
                itemName: 'MT02',
                color: 'CPM',
                size: '40Z'
            },
        
            '8902625575951': {
                itemName: 'MT02',
                color: 'GRW',
                size: '34B'
            },
        
            '8902625575968': {
                itemName: 'MT02',
                color: 'GRW',
                size: '34C'
            },
        
            '8902625575975': {
                itemName: 'MT02',
                color: 'GRW',
                size: '34D'
            },
        
            '8902625575982': {
                itemName: 'MT02',
                color: 'GRW',
                size: '34Z'
            },
        
            '8902625575999': {
                itemName: 'MT02',
                color: 'GRW',
                size: '36B'
            },
        
            '8902625576002': {
                itemName: 'MT02',
                color: 'GRW',
                size: '36C'
            },
        
            '8902625576019': {
                itemName: 'MT02',
                color: 'GRW',
                size: '36D'
            },
        
            '8902625576026': {
                itemName: 'MT02',
                color: 'GRW',
                size: '36Z'
            },
        
            '8902625576033': {
                itemName: 'MT02',
                color: 'GRW',
                size: '38B'
            },
        
            '8902625576040': {
                itemName: 'MT02',
                color: 'GRW',
                size: '38C'
            },
        
            '8902625576057': {
                itemName: 'MT02',
                color: 'GRW',
                size: '38D'
            },
        
            '8902625576064': {
                itemName: 'MT02',
                color: 'GRW',
                size: '38Z'
            },
        
            '8902625576071': {
                itemName: 'MT02',
                color: 'GRW',
                size: '40B'
            },
        
            '8902625576088': {
                itemName: 'MT02',
                color: 'GRW',
                size: '40C'
            },
        
            '8902625576095': {
                itemName: 'MT02',
                color: 'GRW',
                size: '40D'
            },
        
            '8902625576101': {
                itemName: 'MT02',
                color: 'GRW',
                size: '40Z'
            },
        
            '8902625557780': {
                itemName: 'MT02',
                color: 'ODM',
                size: '34B'
            },
        
            '8902625557797': {
                itemName: 'MT02',
                color: 'ODM',
                size: '34C'
            },
        
            '8902625557803': {
                itemName: 'MT02',
                color: 'ODM',
                size: '34D'
            },
        
            '8902625557810': {
                itemName: 'MT02',
                color: 'ODM',
                size: '34Z'
            },
        
            '8902625557827': {
                itemName: 'MT02',
                color: 'ODM',
                size: '36B'
            },
        
            '8902625557834': {
                itemName: 'MT02',
                color: 'ODM',
                size: '36C'
            },
        
            '8902625557841': {
                itemName: 'MT02',
                color: 'ODM',
                size: '36D'
            },
        
            '8902625557858': {
                itemName: 'MT02',
                color: 'ODM',
                size: '36Z'
            },
        
            '8902625557865': {
                itemName: 'MT02',
                color: 'ODM',
                size: '38B'
            },
        
            '8902625557872': {
                itemName: 'MT02',
                color: 'ODM',
                size: '38C'
            },
        
            '8902625557889': {
                itemName: 'MT02',
                color: 'ODM',
                size: '38D'
            },
        
            '8902625557896': {
                itemName: 'MT02',
                color: 'ODM',
                size: '38Z'
            },
        
            '8902625557902': {
                itemName: 'MT02',
                color: 'ODM',
                size: '40B'
            },
        
            '8902625557919': {
                itemName: 'MT02',
                color: 'ODM',
                size: '40C'
            },
        
            '8902625557926': {
                itemName: 'MT02',
                color: 'ODM',
                size: '40D'
            },
        
            '8902625557933': {
                itemName: 'MT02',
                color: 'ODM',
                size: '40Z'
            },
        
            '8902625557940': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '34B'
            },
        
            '8902625557957': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '34C'
            },
        
            '8902625557964': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '34D'
            },
        
            '8902625557971': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '34Z'
            },
        
            '8902625557988': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '36B'
            },
        
            '8902625557995': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '36C'
            },
        
            '8902625558008': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '36D'
            },
        
            '8902625558015': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '36Z'
            },
        
            '8902625558022': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '38B'
            },
        
            '8902625558039': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '38C'
            },
        
            '8902625558046': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '38D'
            },
        
            '8902625558053': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '38Z'
            },
        
            '8902625558060': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '40B'
            },
        
            '8902625558077': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '40C'
            },
        
            '8902625558084': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '40D'
            },
        
            '8902625558091': {
                itemName: 'MT02',
                color: 'SKIN',
                size: '40Z'
            },
        
            '8902625037398': {
                itemName: 'SB06',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625558701': {
                itemName: 'SB06',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625558718': {
                itemName: 'SB06',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625558725': {
                itemName: 'SB06',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625558732': {
                itemName: 'SB06',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625558749': {
                itemName: 'SB06',
                color: 'BLACK',
                size: 'XS'
            },
        
            '8902625037435': {
                itemName: 'SB06',
                color: 'CPM',
                size: '2XL'
            },
        
            '8902625576118': {
                itemName: 'SB06',
                color: 'CPM',
                size: 'L'
            },
        
            '8902625576125': {
                itemName: 'SB06',
                color: 'CPM',
                size: 'M'
            },
        
            '8902625576132': {
                itemName: 'SB06',
                color: 'CPM',
                size: 'S'
            },
        
            '8902625576149': {
                itemName: 'SB06',
                color: 'CPM',
                size: 'XL'
            },
        
            '8902625576156': {
                itemName: 'SB06',
                color: 'CPM',
                size: 'XS'
            },
        
            '8902625037459': {
                itemName: 'SB06',
                color: 'DHP',
                size: '2XL'
            },
        
            '8902625576415': {
                itemName: 'SB06',
                color: 'DHP',
                size: 'L'
            },
        
            '8902625576422': {
                itemName: 'SB06',
                color: 'DHP',
                size: 'M'
            },
        
            '8902625576439': {
                itemName: 'SB06',
                color: 'DHP',
                size: 'S'
            },
        
            '8902625576446': {
                itemName: 'SB06',
                color: 'DHP',
                size: 'XL'
            },
        
            '8902625576453': {
                itemName: 'SB06',
                color: 'DHP',
                size: 'XS'
            },
        
            '8902625037466': {
                itemName: 'SB06',
                color: 'GRW',
                size: '2XL'
            },
        
            '8902625576460': {
                itemName: 'SB06',
                color: 'GRW',
                size: 'L'
            },
        
            '8902625576477': {
                itemName: 'SB06',
                color: 'GRW',
                size: 'M'
            },
        
            '8902625576484': {
                itemName: 'SB06',
                color: 'GRW',
                size: 'S'
            },
        
            '8902625576491': {
                itemName: 'SB06',
                color: 'GRW',
                size: 'XL'
            },
        
            '8902625576507': {
                itemName: 'SB06',
                color: 'GRW',
                size: 'XS'
            },
        
            '8902625037473': {
                itemName: 'SB06',
                color: 'GRYMRL',
                size: '2XL'
            },
        
            '8902625558800': {
                itemName: 'SB06',
                color: 'GRYMRL',
                size: 'L'
            },
        
            '8902625558817': {
                itemName: 'SB06',
                color: 'GRYMRL',
                size: 'M'
            },
        
            '8902625558824': {
                itemName: 'SB06',
                color: 'GRYMRL',
                size: 'S'
            },
        
            '8902625558831': {
                itemName: 'SB06',
                color: 'GRYMRL',
                size: 'XL'
            },
        
            '8902625558848': {
                itemName: 'SB06',
                color: 'GRYMRL',
                size: 'XS'
            },
        
            '8902625607256': {
                itemName: 'SB06',
                color: 'MFL',
                size: 'L'
            },
        
            '8902625607263': {
                itemName: 'SB06',
                color: 'MFL',
                size: 'M'
            },
        
            '8902625607270': {
                itemName: 'SB06',
                color: 'MFL',
                size: 'S'
            },
        
            '8902625607287': {
                itemName: 'SB06',
                color: 'MFL',
                size: 'XL'
            },
        
            '8902625607294': {
                itemName: 'SB06',
                color: 'MFL',
                size: 'XS'
            },
        
            '8902625037428': {
                itemName: 'SB06',
                color: 'PEARL',
                size: '2XL'
            },
        
            '8902625558909': {
                itemName: 'SB06',
                color: 'PEARL',
                size: 'L'
            },
        
            '8902625558916': {
                itemName: 'SB06',
                color: 'PEARL',
                size: 'M'
            },
        
            '8902625558923': {
                itemName: 'SB06',
                color: 'PEARL',
                size: 'S'
            },
        
            '8902625558930': {
                itemName: 'SB06',
                color: 'PEARL',
                size: 'XL'
            },
        
            '8902625558947': {
                itemName: 'SB06',
                color: 'PEARL',
                size: 'XS'
            },
        
            '8902625037404': {
                itemName: 'SB06',
                color: 'SKIN',
                size: '2XL'
            },
        
            '8902625576569': {
                itemName: 'SB06',
                color: 'SKIN',
                size: 'L'
            },
        
            '8902625576576': {
                itemName: 'SB06',
                color: 'SKIN',
                size: 'M'
            },
        
            '8902625576583': {
                itemName: 'SB06',
                color: 'SKIN',
                size: 'S'
            },
        
            '8902625576590': {
                itemName: 'SB06',
                color: 'SKIN',
                size: 'XL'
            },
        
            '8902625576606': {
                itemName: 'SB06',
                color: 'SKIN',
                size: 'XS'
            },
        
            '8902625037442': {
                itemName: 'SB06',
                color: 'TMG',
                size: '2XL'
            },
        
            '8902625576316': {
                itemName: 'SB06',
                color: 'TMG',
                size: 'L'
            },
        
            '8902625576323': {
                itemName: 'SB06',
                color: 'TMG',
                size: 'M'
            },
        
            '8902625576330': {
                itemName: 'SB06',
                color: 'TMG',
                size: 'S'
            },
        
            '8902625576347': {
                itemName: 'SB06',
                color: 'TMG',
                size: 'XL'
            },
        
            '8902625576354': {
                itemName: 'SB06',
                color: 'TMG',
                size: 'XS'
            },
        
            '8902625037411': {
                itemName: 'SB06',
                color: 'WHITE',
                size: '2XL'
            },
        
            '8902625558954': {
                itemName: 'SB06',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625558961': {
                itemName: 'SB06',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625558978': {
                itemName: 'SB06',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625558985': {
                itemName: 'SB06',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625558992': {
                itemName: 'SB06',
                color: 'WHITE',
                size: 'XS'
            },
        
            '8902625559005': {
                itemName: 'SB08',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625559012': {
                itemName: 'SB08',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625559029': {
                itemName: 'SB08',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625559036': {
                itemName: 'SB08',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625576699': {
                itemName: 'SB08',
                color: 'GRW',
                size: 'L'
            },
        
            '8902625576705': {
                itemName: 'SB08',
                color: 'GRW',
                size: 'M'
            },
        
            '8902625576712': {
                itemName: 'SB08',
                color: 'GRW',
                size: 'S'
            },
        
            '8902625576729': {
                itemName: 'SB08',
                color: 'GRW',
                size: 'XL'
            },
        
            '8902625576651': {
                itemName: 'SB08',
                color: 'GRYMEL',
                size: 'L'
            },
        
            '8902625576668': {
                itemName: 'SB08',
                color: 'GRYMEL',
                size: 'M'
            },
        
            '8902625576675': {
                itemName: 'SB08',
                color: 'GRYMEL',
                size: 'S'
            },
        
            '8902625576682': {
                itemName: 'SB08',
                color: 'GRYMEL',
                size: 'XL'
            },
        
            '8902625576774': {
                itemName: 'SB08',
                color: 'MLP',
                size: 'L'
            },
        
            '8902625576781': {
                itemName: 'SB08',
                color: 'MLP',
                size: 'M'
            },
        
            '8902625576798': {
                itemName: 'SB08',
                color: 'MLP',
                size: 'S'
            },
        
            '8902625576804': {
                itemName: 'SB08',
                color: 'MLP',
                size: 'XL'
            },
        
            '8902625607300': {
                itemName: 'SB08',
                color: 'MMV',
                size: 'L'
            },
        
            '8902625607317': {
                itemName: 'SB08',
                color: 'MMV',
                size: 'M'
            },
        
            '8902625607324': {
                itemName: 'SB08',
                color: 'MMV',
                size: 'S'
            },
        
            '8902625607331': {
                itemName: 'SB08',
                color: 'MMV',
                size: 'XL'
            },
        
            '8902625576859': {
                itemName: 'SB08',
                color: 'PEARL',
                size: 'L'
            },
        
            '8902625576866': {
                itemName: 'SB08',
                color: 'PEARL',
                size: 'M'
            },
        
            '8902625576873': {
                itemName: 'SB08',
                color: 'PEARL',
                size: 'S'
            },
        
            '8902625576880': {
                itemName: 'SB08',
                color: 'PEARL',
                size: 'XL'
            },
        
            '8902625827302': {
                itemName: 'SB28',
                color: 'BLACK',
                size: 'LAR'
            },
        
            '8902625827319': {
                itemName: 'SB28',
                color: 'BLACK',
                size: 'MED'
            },
        
            '8902625827326': {
                itemName: 'SB28',
                color: 'BLACK',
                size: 'SMA'
            },
        
            '8902625827333': {
                itemName: 'SB28',
                color: 'BLACK',
                size: 'XLA'
            },
        
            '8902625827340': {
                itemName: 'SB28',
                color: 'GRYMEL',
                size: 'LAR'
            },
        
            '8902625827357': {
                itemName: 'SB28',
                color: 'GRYMEL',
                size: 'MED'
            },
        
            '8902625827364': {
                itemName: 'SB28',
                color: 'GRYMEL',
                size: 'SMA'
            },
        
            '8902625827371': {
                itemName: 'SB28',
                color: 'GRYMEL',
                size: 'XLA'
            },
        
            '8902625827388': {
                itemName: 'SB28',
                color: 'PFI',
                size: 'LAR'
            },
        
            '8902625827395': {
                itemName: 'SB28',
                color: 'PFI',
                size: 'MED'
            },
        
            '8902625827401': {
                itemName: 'SB28',
                color: 'PFI',
                size: 'SMA'
            },
        
            '8902625827418': {
                itemName: 'SB28',
                color: 'PFI',
                size: 'XLA'
            },
        
            '8902625045324': {
                itemName: 'SB38',
                color: 'FUCPUR',
                size: 'L'
            },
        
            '8902625045317': {
                itemName: 'SB38',
                color: 'FUCPUR',
                size: 'M'
            },
        
            '8902625045300': {
                itemName: 'SB38',
                color: 'FUCPUR',
                size: 'S'
            },
        
            '8902625045331': {
                itemName: 'SB38',
                color: 'FUCPUR',
                size: 'XL'
            },
        
            '8902625045287': {
                itemName: 'SB38',
                color: 'GRA',
                size: 'L'
            },
        
            '8902625045270': {
                itemName: 'SB38',
                color: 'GRA',
                size: 'M'
            },
        
            '8902625045263': {
                itemName: 'SB38',
                color: 'GRA',
                size: 'S'
            },
        
            '8902625045294': {
                itemName: 'SB38',
                color: 'GRA',
                size: 'XL'
            },
        
            '8902625045249': {
                itemName: 'SB38',
                color: 'WHITE',
                size: 'L'
            },
        
            '8902625045232': {
                itemName: 'SB38',
                color: 'WHITE',
                size: 'M'
            },
        
            '8902625045225': {
                itemName: 'SB38',
                color: 'WHITE',
                size: 'S'
            },
        
            '8902625045256': {
                itemName: 'SB38',
                color: 'WHITE',
                size: 'XL'
            },
        
            '8902625750075': {
                itemName: 'TH01',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625750228': {
                itemName: 'TH01',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625750044': {
                itemName: 'TH01',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625750402': {
                itemName: 'TH01',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625750099': {
                itemName: 'TH01',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625750204': {
                itemName: 'TH01',
                color: 'PEI',
                size: '2XL'
            },
        
            '8902625750006': {
                itemName: 'TH01',
                color: 'PEI',
                size: 'L'
            },
        
            '8902625750242': {
                itemName: 'TH01',
                color: 'PEI',
                size: 'M'
            },
        
            '8902625750372': {
                itemName: 'TH01',
                color: 'PEI',
                size: 'S'
            },
        
            '8902625750167': {
                itemName: 'TH01',
                color: 'PEI',
                size: 'XL'
            },
        
            '8902625750174': {
                itemName: 'TH01',
                color: 'PLS',
                size: '2XL'
            },
        
            '8902625750112': {
                itemName: 'TH01',
                color: 'PLS',
                size: 'L'
            },
        
            '8902625750013': {
                itemName: 'TH01',
                color: 'PLS',
                size: 'M'
            },
        
            '8902625750037': {
                itemName: 'TH01',
                color: 'PLS',
                size: 'S'
            },
        
            '8902625750440': {
                itemName: 'TH01',
                color: 'PLS',
                size: 'XL'
            },
        
            '8902625750211': {
                itemName: 'TH02',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625750396': {
                itemName: 'TH02',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625750341': {
                itemName: 'TH02',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625750426': {
                itemName: 'TH02',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625750068': {
                itemName: 'TH02',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625750259': {
                itemName: 'TH02',
                color: 'PEI',
                size: '2XL'
            },
        
            '8902625750266': {
                itemName: 'TH02',
                color: 'PEI',
                size: 'L'
            },
        
            '8902625750273': {
                itemName: 'TH02',
                color: 'PEI',
                size: 'M'
            },
        
            '8902625750150': {
                itemName: 'TH02',
                color: 'PEI',
                size: 'S'
            },
        
            '8902625750129': {
                itemName: 'TH02',
                color: 'PEI',
                size: 'XL'
            },
        
            '8902625750389': {
                itemName: 'TH02',
                color: 'PLS',
                size: '2XL'
            },
        
            '8902625750303': {
                itemName: 'TH02',
                color: 'PLS',
                size: 'L'
            },
        
            '8902625750365': {
                itemName: 'TH02',
                color: 'PLS',
                size: 'M'
            },
        
            '8902625750105': {
                itemName: 'TH02',
                color: 'PLS',
                size: 'S'
            },
        
            '8902625750297': {
                itemName: 'TH02',
                color: 'PLS',
                size: 'XL'
            },
        
            '8902625750051': {
                itemName: 'TH03',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625750280': {
                itemName: 'TH03',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625750235': {
                itemName: 'TH03',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625750419': {
                itemName: 'TH03',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625750310': {
                itemName: 'TH03',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625750433': {
                itemName: 'TH03',
                color: 'PEI',
                size: '2XL'
            },
        
            '8902625750020': {
                itemName: 'TH03',
                color: 'PEI',
                size: 'L'
            },
        
            '8902625750358': {
                itemName: 'TH03',
                color: 'PEI',
                size: 'M'
            },
        
            '8902625750082': {
                itemName: 'TH03',
                color: 'PEI',
                size: 'S'
            },
        
            '8902625750198': {
                itemName: 'TH03',
                color: 'PEI',
                size: 'XL'
            },
        
            '8902625750181': {
                itemName: 'TH03',
                color: 'PLS',
                size: '2XL'
            },
        
            '8902625750143': {
                itemName: 'TH03',
                color: 'PLS',
                size: 'L'
            },
        
            '8902625750327': {
                itemName: 'TH03',
                color: 'PLS',
                size: 'M'
            },
        
            '8902625750334': {
                itemName: 'TH03',
                color: 'PLS',
                size: 'S'
            },
        
            '8902625750136': {
                itemName: 'TH03',
                color: 'PLS',
                size: 'XL'
            },
        
            '8902625550422': {
                itemName: 'BR08',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625550392': {
                itemName: 'BR08',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625550408': {
                itemName: 'BR08',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625550415': {
                itemName: 'BR08',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625550460': {
                itemName: 'BR08',
                color: 'BUFF',
                size: '2XL'
            },
        
            '8902625550439': {
                itemName: 'BR08',
                color: 'BUFF',
                size: 'L'
            },
        
            '8902625550446': {
                itemName: 'BR08',
                color: 'BUFF',
                size: 'M'
            },
        
            '8902625550453': {
                itemName: 'BR08',
                color: 'BUFF',
                size: 'XL'
            },
        
            '8902625016485': {
                itemName: 'BR11',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625016461': {
                itemName: 'BR11',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625016454': {
                itemName: 'BR11',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625016447': {
                itemName: 'BR11',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625016478': {
                itemName: 'BR11',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625016430': {
                itemName: 'BR11',
                color: 'HOB',
                size: '2XL'
            },
        
            '8902625016416': {
                itemName: 'BR11',
                color: 'HOB',
                size: 'L'
            },
        
            '8902625016409': {
                itemName: 'BR11',
                color: 'HOB',
                size: 'M'
            },
        
            '8902625016393': {
                itemName: 'BR11',
                color: 'HOB',
                size: 'S'
            },
        
            '8902625016423': {
                itemName: 'BR11',
                color: 'HOB',
                size: 'XL'
            },
        
            '8902625552044': {
                itemName: 'F023',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625552051': {
                itemName: 'F023',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625552068': {
                itemName: 'F023',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625559258': {
                itemName: 'F023',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625559265': {
                itemName: 'F023',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625559272': {
                itemName: 'F023',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625559289': {
                itemName: 'F023',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625559296': {
                itemName: 'F023',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625559302': {
                itemName: 'F023',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625559319': {
                itemName: 'F023',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625559326': {
                itemName: 'F023',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625034168': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '32B'
            },
        
            '8902625034175': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '32C'
            },
        
            '8902625034182': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '32D'
            },
        
            '8902625034199': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '34B'
            },
        
            '8902625034205': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '34C'
            },
        
            '8902625034212': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '34D'
            },
        
            '8902625034229': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '36B'
            },
        
            '8902625034236': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '36C'
            },
        
            '8902625034243': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '36D'
            },
        
            '8902625034250': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '38B'
            },
        
            '8902625034267': {
                itemName: 'F023',
                color: 'FRHPRT',
                size: '38C'
            },
        
            '8902625033833': {
                itemName: 'F023',
                color: 'IGY',
                size: '32B'
            },
        
            '8902625033840': {
                itemName: 'F023',
                color: 'IGY',
                size: '32C'
            },
        
            '8902625033857': {
                itemName: 'F023',
                color: 'IGY',
                size: '32D'
            },
        
            '8902625033864': {
                itemName: 'F023',
                color: 'IGY',
                size: '34B'
            },
        
            '8902625033871': {
                itemName: 'F023',
                color: 'IGY',
                size: '34C'
            },
        
            '8902625033888': {
                itemName: 'F023',
                color: 'IGY',
                size: '34D'
            },
        
            '8902625033895': {
                itemName: 'F023',
                color: 'IGY',
                size: '36B'
            },
        
            '8902625033901': {
                itemName: 'F023',
                color: 'IGY',
                size: '36C'
            },
        
            '8902625033918': {
                itemName: 'F023',
                color: 'IGY',
                size: '36D'
            },
        
            '8902625033925': {
                itemName: 'F023',
                color: 'IGY',
                size: '38B'
            },
        
            '8902625033932': {
                itemName: 'F023',
                color: 'IGY',
                size: '38C'
            },
        
            '8902625033727': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '32B'
            },
        
            '8902625033734': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '32C'
            },
        
            '8902625033741': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '32D'
            },
        
            '8902625033758': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '34B'
            },
        
            '8902625033765': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '34C'
            },
        
            '8902625033772': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '34D'
            },
        
            '8902625033789': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '36B'
            },
        
            '8902625033796': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '36C'
            },
        
            '8902625033802': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '36D'
            },
        
            '8902625033819': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '38B'
            },
        
            '8902625033826': {
                itemName: 'F023',
                color: 'NSTLGR',
                size: '38C'
            },
        
            '8902625577825': {
                itemName: 'F023',
                color: 'PWL',
                size: '32B'
            },
        
            '8902625577832': {
                itemName: 'F023',
                color: 'PWL',
                size: '32C'
            },
        
            '8902625577849': {
                itemName: 'F023',
                color: 'PWL',
                size: '32D'
            },
        
            '8902625577856': {
                itemName: 'F023',
                color: 'PWL',
                size: '34B'
            },
        
            '8902625577863': {
                itemName: 'F023',
                color: 'PWL',
                size: '34C'
            },
        
            '8902625577870': {
                itemName: 'F023',
                color: 'PWL',
                size: '34D'
            },
        
            '8902625577887': {
                itemName: 'F023',
                color: 'PWL',
                size: '36B'
            },
        
            '8902625577894': {
                itemName: 'F023',
                color: 'PWL',
                size: '36C'
            },
        
            '8902625577900': {
                itemName: 'F023',
                color: 'PWL',
                size: '36D'
            },
        
            '8902625577917': {
                itemName: 'F023',
                color: 'PWL',
                size: '38B'
            },
        
            '8902625577924': {
                itemName: 'F023',
                color: 'PWL',
                size: '38C'
            },
        
            '8902625577931': {
                itemName: 'F023',
                color: 'SIL',
                size: '32B'
            },
        
            '8902625577948': {
                itemName: 'F023',
                color: 'SIL',
                size: '32C'
            },
        
            '8902625577955': {
                itemName: 'F023',
                color: 'SIL',
                size: '32D'
            },
        
            '8902625577962': {
                itemName: 'F023',
                color: 'SIL',
                size: '34B'
            },
        
            '8902625577979': {
                itemName: 'F023',
                color: 'SIL',
                size: '34C'
            },
        
            '8902625577986': {
                itemName: 'F023',
                color: 'SIL',
                size: '34D'
            },
        
            '8902625577993': {
                itemName: 'F023',
                color: 'SIL',
                size: '36B'
            },
        
            '8902625578006': {
                itemName: 'F023',
                color: 'SIL',
                size: '36C'
            },
        
            '8902625578013': {
                itemName: 'F023',
                color: 'SIL',
                size: '36D'
            },
        
            '8902625578020': {
                itemName: 'F023',
                color: 'SIL',
                size: '38B'
            },
        
            '8902625578037': {
                itemName: 'F023',
                color: 'SIL',
                size: '38C'
            },
        
            '8902625608963': {
                itemName: 'F023',
                color: 'SOR',
                size: '32B'
            },
        
            '8902625608970': {
                itemName: 'F023',
                color: 'SOR',
                size: '32C'
            },
        
            '8902625608987': {
                itemName: 'F023',
                color: 'SOR',
                size: '32D'
            },
        
            '8902625608994': {
                itemName: 'F023',
                color: 'SOR',
                size: '34B'
            },
        
            '8902625609007': {
                itemName: 'F023',
                color: 'SOR',
                size: '34C'
            },
        
            '8902625609014': {
                itemName: 'F023',
                color: 'SOR',
                size: '34D'
            },
        
            '8902625609021': {
                itemName: 'F023',
                color: 'SOR',
                size: '36B'
            },
        
            '8902625609038': {
                itemName: 'F023',
                color: 'SOR',
                size: '36C'
            },
        
            '8902625609045': {
                itemName: 'F023',
                color: 'SOR',
                size: '36D'
            },
        
            '8902625609052': {
                itemName: 'F023',
                color: 'SOR',
                size: '38B'
            },
        
            '8902625609069': {
                itemName: 'F023',
                color: 'SOR',
                size: '38C'
            },
        
            '8902625552228': {
                itemName: 'F024',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625552235': {
                itemName: 'F024',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625552242': {
                itemName: 'F024',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625552259': {
                itemName: 'F024',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625578266': {
                itemName: 'F024',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625578273': {
                itemName: 'F024',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625578280': {
                itemName: 'F024',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625578297': {
                itemName: 'F024',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625578303': {
                itemName: 'F024',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625578310': {
                itemName: 'F024',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625578327': {
                itemName: 'F024',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625578334': {
                itemName: 'F024',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625578341': {
                itemName: 'F024',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625578358': {
                itemName: 'F024',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625578365': {
                itemName: 'F024',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625578389': {
                itemName: 'F024',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625578396': {
                itemName: 'F024',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625578402': {
                itemName: 'F024',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625578433': {
                itemName: 'F024',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625578440': {
                itemName: 'F024',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625552266': {
                itemName: 'F024',
                color: 'CON',
                size: '32B'
            },
        
            '8902625552273': {
                itemName: 'F024',
                color: 'CON',
                size: '32C'
            },
        
            '8902625552280': {
                itemName: 'F024',
                color: 'CON',
                size: '32D'
            },
        
            '8902625552297': {
                itemName: 'F024',
                color: 'CON',
                size: '32Z'
            },
        
            '8902625578464': {
                itemName: 'F024',
                color: 'CON',
                size: '34B'
            },
        
            '8902625578471': {
                itemName: 'F024',
                color: 'CON',
                size: '34C'
            },
        
            '8902625578488': {
                itemName: 'F024',
                color: 'CON',
                size: '34D'
            },
        
            '8902625578495': {
                itemName: 'F024',
                color: 'CON',
                size: '34Z'
            },
        
            '8902625578501': {
                itemName: 'F024',
                color: 'CON',
                size: '36B'
            },
        
            '8902625578518': {
                itemName: 'F024',
                color: 'CON',
                size: '36C'
            },
        
            '8902625578525': {
                itemName: 'F024',
                color: 'CON',
                size: '36D'
            },
        
            '8902625578532': {
                itemName: 'F024',
                color: 'CON',
                size: '36Z'
            },
        
            '8902625578549': {
                itemName: 'F024',
                color: 'CON',
                size: '38B'
            },
        
            '8902625578556': {
                itemName: 'F024',
                color: 'CON',
                size: '38C'
            },
        
            '8902625578563': {
                itemName: 'F024',
                color: 'CON',
                size: '38D'
            },
        
            '8902625578587': {
                itemName: 'F024',
                color: 'CON',
                size: '40B'
            },
        
            '8902625578594': {
                itemName: 'F024',
                color: 'CON',
                size: '40C'
            },
        
            '8902625578600': {
                itemName: 'F024',
                color: 'CON',
                size: '40D'
            },
        
            '8902625578631': {
                itemName: 'F024',
                color: 'CON',
                size: '42C'
            },
        
            '8902625578648': {
                itemName: 'F024',
                color: 'CON',
                size: '42D'
            },
        
            '8902625552303': {
                itemName: 'F024',
                color: 'PLS',
                size: '32B'
            },
        
            '8902625552310': {
                itemName: 'F024',
                color: 'PLS',
                size: '32C'
            },
        
            '8902625552327': {
                itemName: 'F024',
                color: 'PLS',
                size: '32D'
            },
        
            '8902625552334': {
                itemName: 'F024',
                color: 'PLS',
                size: '32Z'
            },
        
            '8902625578662': {
                itemName: 'F024',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625578679': {
                itemName: 'F024',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625578686': {
                itemName: 'F024',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625578693': {
                itemName: 'F024',
                color: 'PLS',
                size: '34Z'
            },
        
            '8902625578709': {
                itemName: 'F024',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625578716': {
                itemName: 'F024',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625578723': {
                itemName: 'F024',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625578730': {
                itemName: 'F024',
                color: 'PLS',
                size: '36Z'
            },
        
            '8902625578747': {
                itemName: 'F024',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625578754': {
                itemName: 'F024',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625578761': {
                itemName: 'F024',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625578785': {
                itemName: 'F024',
                color: 'PLS',
                size: '40B'
            },
        
            '8902625578792': {
                itemName: 'F024',
                color: 'PLS',
                size: '40C'
            },
        
            '8902625578808': {
                itemName: 'F024',
                color: 'PLS',
                size: '40D'
            },
        
            '8902625578839': {
                itemName: 'F024',
                color: 'PLS',
                size: '42C'
            },
        
            '8902625578846': {
                itemName: 'F024',
                color: 'PLS',
                size: '42D'
            },
        
            '8902625552341': {
                itemName: 'F024',
                color: 'WHITE',
                size: '32B'
            },
        
            '8902625552358': {
                itemName: 'F024',
                color: 'WHITE',
                size: '32C'
            },
        
            '8902625552365': {
                itemName: 'F024',
                color: 'WHITE',
                size: '32D'
            },
        
            '8902625552372': {
                itemName: 'F024',
                color: 'WHITE',
                size: '32Z'
            },
        
            '8902625578860': {
                itemName: 'F024',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625578877': {
                itemName: 'F024',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625578884': {
                itemName: 'F024',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625578891': {
                itemName: 'F024',
                color: 'WHITE',
                size: '34Z'
            },
        
            '8902625578907': {
                itemName: 'F024',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625578914': {
                itemName: 'F024',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625578921': {
                itemName: 'F024',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625578938': {
                itemName: 'F024',
                color: 'WHITE',
                size: '36Z'
            },
        
            '8902625578945': {
                itemName: 'F024',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625578952': {
                itemName: 'F024',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625578969': {
                itemName: 'F024',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625578983': {
                itemName: 'F024',
                color: 'WHITE',
                size: '40B'
            },
        
            '8902625578990': {
                itemName: 'F024',
                color: 'WHITE',
                size: '40C'
            },
        
            '8902625579003': {
                itemName: 'F024',
                color: 'WHITE',
                size: '40D'
            },
        
            '8902625579034': {
                itemName: 'F024',
                color: 'WHITE',
                size: '42C'
            },
        
            '8902625579041': {
                itemName: 'F024',
                color: 'WHITE',
                size: '42D'
            },
        
            '8902625579263': {
                itemName: 'F037',
                color: 'ALS',
                size: 'L'
            },
        
            '8902625579270': {
                itemName: 'F037',
                color: 'ALS',
                size: 'M'
            },
        
            '8902625579287': {
                itemName: 'F037',
                color: 'ALS',
                size: 'S'
            },
        
            '8902625579294': {
                itemName: 'F037',
                color: 'ALS',
                size: 'XL'
            },
        
            '8902625579300': {
                itemName: 'F037',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625579317': {
                itemName: 'F037',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625579324': {
                itemName: 'F037',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625579331': {
                itemName: 'F037',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625833952': {
                itemName: 'F037',
                color: 'LSBNBL',
                size: 'L'
            },
        
            '8902625833969': {
                itemName: 'F037',
                color: 'LSBNBL',
                size: 'M'
            },
        
            '8902625833976': {
                itemName: 'F037',
                color: 'LSBNBL',
                size: 'S'
            },
        
            '8902625833983': {
                itemName: 'F037',
                color: 'LSBNBL',
                size: 'XL'
            },
        
            '8902625608697': {
                itemName: 'F037',
                color: 'OCH',
                size: 'L'
            },
        
            '8902625608703': {
                itemName: 'F037',
                color: 'OCH',
                size: 'M'
            },
        
            '8902625608710': {
                itemName: 'F037',
                color: 'OCH',
                size: 'S'
            },
        
            '8902625608727': {
                itemName: 'F037',
                color: 'OCH',
                size: 'XL'
            },
        
            '8902625833914': {
                itemName: 'F037',
                color: 'PSTLIL',
                size: 'L'
            },
        
            '8902625833921': {
                itemName: 'F037',
                color: 'PSTLIL',
                size: 'M'
            },
        
            '8902625833938': {
                itemName: 'F037',
                color: 'PSTLIL',
                size: 'S'
            },
        
            '8902625833945': {
                itemName: 'F037',
                color: 'PSTLIL',
                size: 'XL'
            },
        
            '8902625582904': {
                itemName: 'F040',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625582911': {
                itemName: 'F040',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625582928': {
                itemName: 'F040',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625582935': {
                itemName: 'F040',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625582942': {
                itemName: 'F040',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625582959': {
                itemName: 'F040',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625582966': {
                itemName: 'F040',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625582973': {
                itemName: 'F040',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625582980': {
                itemName: 'F040',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625582997': {
                itemName: 'F040',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625583000': {
                itemName: 'F040',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625583017': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '32B'
            },
        
            '8902625583024': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '32C'
            },
        
            '8902625583031': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '32D'
            },
        
            '8902625583048': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '34B'
            },
        
            '8902625583055': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '34C'
            },
        
            '8902625583062': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '34D'
            },
        
            '8902625583079': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '36B'
            },
        
            '8902625583086': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '36C'
            },
        
            '8902625583093': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '36D'
            },
        
            '8902625583109': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '38B'
            },
        
            '8902625583116': {
                itemName: 'F040',
                color: 'CRMRD',
                size: '38C'
            },
        
            '8902625524928': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '32B'
            },
        
            '8902625524935': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '32C'
            },
        
            '8902625524942': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '32D'
            },
        
            '8902625524959': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '34B'
            },
        
            '8902625524966': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '34C'
            },
        
            '8902625524973': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '34D'
            },
        
            '8902625524980': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '36B'
            },
        
            '8902625524997': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '36C'
            },
        
            '8902625525000': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '36D'
            },
        
            '8902625525017': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '38B'
            },
        
            '8902625525024': {
                itemName: 'F043',
                color: 'BUTSCO',
                size: '38C'
            },
        
            '8902625524812': {
                itemName: 'F043',
                color: 'CTM',
                size: '32B'
            },
        
            '8902625524829': {
                itemName: 'F043',
                color: 'CTM',
                size: '32C'
            },
        
            '8902625524836': {
                itemName: 'F043',
                color: 'CTM',
                size: '32D'
            },
        
            '8902625524843': {
                itemName: 'F043',
                color: 'CTM',
                size: '34B'
            },
        
            '8902625524850': {
                itemName: 'F043',
                color: 'CTM',
                size: '34C'
            },
        
            '8902625524867': {
                itemName: 'F043',
                color: 'CTM',
                size: '34D'
            },
        
            '8902625524874': {
                itemName: 'F043',
                color: 'CTM',
                size: '36B'
            },
        
            '8902625524881': {
                itemName: 'F043',
                color: 'CTM',
                size: '36C'
            },
        
            '8902625524898': {
                itemName: 'F043',
                color: 'CTM',
                size: '36D'
            },
        
            '8902625524904': {
                itemName: 'F043',
                color: 'CTM',
                size: '38B'
            },
        
            '8902625524911': {
                itemName: 'F043',
                color: 'CTM',
                size: '38C'
            },
        
            '8902625579348': {
                itemName: 'F048',
                color: 'PLUM',
                size: '34B'
            },
        
            '8902625579355': {
                itemName: 'F048',
                color: 'PLUM',
                size: '34C'
            },
        
            '8902625579362': {
                itemName: 'F048',
                color: 'PLUM',
                size: '34D'
            },
        
            '8902625579379': {
                itemName: 'F048',
                color: 'PLUM',
                size: '34F'
            },
        
            '8902625579386': {
                itemName: 'F048',
                color: 'PLUM',
                size: '34Z'
            },
        
            '8902625579393': {
                itemName: 'F048',
                color: 'PLUM',
                size: '36B'
            },
        
            '8902625579409': {
                itemName: 'F048',
                color: 'PLUM',
                size: '36C'
            },
        
            '8902625579416': {
                itemName: 'F048',
                color: 'PLUM',
                size: '36D'
            },
        
            '8902625579423': {
                itemName: 'F048',
                color: 'PLUM',
                size: '36F'
            },
        
            '8902625579430': {
                itemName: 'F048',
                color: 'PLUM',
                size: '36Z'
            },
        
            '8902625579447': {
                itemName: 'F048',
                color: 'PLUM',
                size: '38B'
            },
        
            '8902625579454': {
                itemName: 'F048',
                color: 'PLUM',
                size: '38C'
            },
        
            '8902625579461': {
                itemName: 'F048',
                color: 'PLUM',
                size: '38D'
            },
        
            '8902625579478': {
                itemName: 'F048',
                color: 'PLUM',
                size: '38F'
            },
        
            '8902625579485': {
                itemName: 'F048',
                color: 'PLUM',
                size: '38Z'
            },
        
            '8902625579492': {
                itemName: 'F048',
                color: 'PLUM',
                size: '40B'
            },
        
            '8902625579508': {
                itemName: 'F048',
                color: 'PLUM',
                size: '40C'
            },
        
            '8902625579515': {
                itemName: 'F048',
                color: 'PLUM',
                size: '40D'
            },
        
            '8902625579522': {
                itemName: 'F048',
                color: 'PLUM',
                size: '40F'
            },
        
            '8902625579539': {
                itemName: 'F048',
                color: 'PLUM',
                size: '40Z'
            },
        
            '8902625579546': {
                itemName: 'F048',
                color: 'TSK',
                size: '34B'
            },
        
            '8902625579553': {
                itemName: 'F048',
                color: 'TSK',
                size: '34C'
            },
        
            '8902625579560': {
                itemName: 'F048',
                color: 'TSK',
                size: '34D'
            },
        
            '8902625579577': {
                itemName: 'F048',
                color: 'TSK',
                size: '34F'
            },
        
            '8902625579584': {
                itemName: 'F048',
                color: 'TSK',
                size: '34Z'
            },
        
            '8902625579591': {
                itemName: 'F048',
                color: 'TSK',
                size: '36B'
            },
        
            '8902625579607': {
                itemName: 'F048',
                color: 'TSK',
                size: '36C'
            },
        
            '8902625579614': {
                itemName: 'F048',
                color: 'TSK',
                size: '36D'
            },
        
            '8902625579621': {
                itemName: 'F048',
                color: 'TSK',
                size: '36F'
            },
        
            '8902625579638': {
                itemName: 'F048',
                color: 'TSK',
                size: '36Z'
            },
        
            '8902625579645': {
                itemName: 'F048',
                color: 'TSK',
                size: '38B'
            },
        
            '8902625579652': {
                itemName: 'F048',
                color: 'TSK',
                size: '38C'
            },
        
            '8902625579669': {
                itemName: 'F048',
                color: 'TSK',
                size: '38D'
            },
        
            '8902625579676': {
                itemName: 'F048',
                color: 'TSK',
                size: '38F'
            },
        
            '8902625579683': {
                itemName: 'F048',
                color: 'TSK',
                size: '38Z'
            },
        
            '8902625579690': {
                itemName: 'F048',
                color: 'TSK',
                size: '40B'
            },
        
            '8902625579706': {
                itemName: 'F048',
                color: 'TSK',
                size: '40C'
            },
        
            '8902625579713': {
                itemName: 'F048',
                color: 'TSK',
                size: '40D'
            },
        
            '8902625579720': {
                itemName: 'F048',
                color: 'TSK',
                size: '40F'
            },
        
            '8902625579737': {
                itemName: 'F048',
                color: 'TSK',
                size: '40Z'
            },
        
            '8902625583420': {
                itemName: 'F053',
                color: 'ECL',
                size: '34C'
            },
        
            '8902625583437': {
                itemName: 'F053',
                color: 'ECL',
                size: '34D'
            },
        
            '8902625583444': {
                itemName: 'F053',
                color: 'ECL',
                size: '34Z'
            },
        
            '8902625583451': {
                itemName: 'F053',
                color: 'ECL',
                size: '36B'
            },
        
            '8902625583468': {
                itemName: 'F053',
                color: 'ECL',
                size: '36C'
            },
        
            '8902625583475': {
                itemName: 'F053',
                color: 'ECL',
                size: '36D'
            },
        
            '8902625583482': {
                itemName: 'F053',
                color: 'ECL',
                size: '36Z'
            },
        
            '8902625583499': {
                itemName: 'F053',
                color: 'ECL',
                size: '38B'
            },
        
            '8902625583505': {
                itemName: 'F053',
                color: 'ECL',
                size: '38C'
            },
        
            '8902625583512': {
                itemName: 'F053',
                color: 'ECL',
                size: '38D'
            },
        
            '8902625583529': {
                itemName: 'F053',
                color: 'ECL',
                size: '38Z'
            },
        
            '8902625583536': {
                itemName: 'F053',
                color: 'ECL',
                size: '40B'
            },
        
            '8902625583543': {
                itemName: 'F053',
                color: 'ECL',
                size: '40C'
            },
        
            '8902625583550': {
                itemName: 'F053',
                color: 'ECL',
                size: '40D'
            },
        
            '8902625583567': {
                itemName: 'F053',
                color: 'ECL',
                size: '40Z'
            },
        
            '8902625583574': {
                itemName: 'F053',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625583581': {
                itemName: 'F053',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625583598': {
                itemName: 'F053',
                color: 'HOB',
                size: '34Z'
            },
        
            '8902625583604': {
                itemName: 'F053',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625583611': {
                itemName: 'F053',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625583628': {
                itemName: 'F053',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625583635': {
                itemName: 'F053',
                color: 'HOB',
                size: '36Z'
            },
        
            '8902625583642': {
                itemName: 'F053',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625583659': {
                itemName: 'F053',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625583666': {
                itemName: 'F053',
                color: 'HOB',
                size: '38D'
            },
        
            '8902625583673': {
                itemName: 'F053',
                color: 'HOB',
                size: '38Z'
            },
        
            '8902625583680': {
                itemName: 'F053',
                color: 'HOB',
                size: '40B'
            },
        
            '8902625583697': {
                itemName: 'F053',
                color: 'HOB',
                size: '40C'
            },
        
            '8902625583703': {
                itemName: 'F053',
                color: 'HOB',
                size: '40D'
            },
        
            '8902625583710': {
                itemName: 'F053',
                color: 'HOB',
                size: '40Z'
            },
        
            '8902625002723': {
                itemName: 'F057',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625002730': {
                itemName: 'F057',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625002747': {
                itemName: 'F057',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625002754': {
                itemName: 'F057',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625002761': {
                itemName: 'F057',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625002778': {
                itemName: 'F057',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625002785': {
                itemName: 'F057',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625002792': {
                itemName: 'F057',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625002808': {
                itemName: 'F057',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625002815': {
                itemName: 'F057',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625002822': {
                itemName: 'F057',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625579744': {
                itemName: 'F057',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625579751': {
                itemName: 'F057',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625579768': {
                itemName: 'F057',
                color: 'HOB',
                size: '32D'
            },
        
            '8902625579775': {
                itemName: 'F057',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625579782': {
                itemName: 'F057',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625579799': {
                itemName: 'F057',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625579805': {
                itemName: 'F057',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625579812': {
                itemName: 'F057',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625579829': {
                itemName: 'F057',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625579836': {
                itemName: 'F057',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625579843': {
                itemName: 'F057',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625579850': {
                itemName: 'F057',
                color: 'IGY',
                size: '32B'
            },
        
            '8902625579867': {
                itemName: 'F057',
                color: 'IGY',
                size: '32C'
            },
        
            '8902625579874': {
                itemName: 'F057',
                color: 'IGY',
                size: '32D'
            },
        
            '8902625579881': {
                itemName: 'F057',
                color: 'IGY',
                size: '34B'
            },
        
            '8902625579898': {
                itemName: 'F057',
                color: 'IGY',
                size: '34C'
            },
        
            '8902625579904': {
                itemName: 'F057',
                color: 'IGY',
                size: '34D'
            },
        
            '8902625579911': {
                itemName: 'F057',
                color: 'IGY',
                size: '36B'
            },
        
            '8902625579928': {
                itemName: 'F057',
                color: 'IGY',
                size: '36C'
            },
        
            '8902625579935': {
                itemName: 'F057',
                color: 'IGY',
                size: '36D'
            },
        
            '8902625579942': {
                itemName: 'F057',
                color: 'IGY',
                size: '38B'
            },
        
            '8902625579959': {
                itemName: 'F057',
                color: 'IGY',
                size: '38C'
            },
        
            '8902625609076': {
                itemName: 'F065',
                color: 'ARO',
                size: '32B'
            },
        
            '8902625609083': {
                itemName: 'F065',
                color: 'ARO',
                size: '32C'
            },
        
            '8902625609090': {
                itemName: 'F065',
                color: 'ARO',
                size: '32D'
            },
        
            '8902625609106': {
                itemName: 'F065',
                color: 'ARO',
                size: '34B'
            },
        
            '8902625609113': {
                itemName: 'F065',
                color: 'ARO',
                size: '34C'
            },
        
            '8902625609120': {
                itemName: 'F065',
                color: 'ARO',
                size: '34D'
            },
        
            '8902625609137': {
                itemName: 'F065',
                color: 'ARO',
                size: '36B'
            },
        
            '8902625609144': {
                itemName: 'F065',
                color: 'ARO',
                size: '36C'
            },
        
            '8902625609151': {
                itemName: 'F065',
                color: 'ARO',
                size: '36D'
            },
        
            '8902625609168': {
                itemName: 'F065',
                color: 'ARO',
                size: '38B'
            },
        
            '8902625609175': {
                itemName: 'F065',
                color: 'ARO',
                size: '38C'
            },
        
            '8902625580184': {
                itemName: 'F065',
                color: 'AUM',
                size: '32B'
            },
        
            '8902625580191': {
                itemName: 'F065',
                color: 'AUM',
                size: '32C'
            },
        
            '8902625580207': {
                itemName: 'F065',
                color: 'AUM',
                size: '32D'
            },
        
            '8902625580214': {
                itemName: 'F065',
                color: 'AUM',
                size: '34B'
            },
        
            '8902625580221': {
                itemName: 'F065',
                color: 'AUM',
                size: '34C'
            },
        
            '8902625580238': {
                itemName: 'F065',
                color: 'AUM',
                size: '34D'
            },
        
            '8902625580245': {
                itemName: 'F065',
                color: 'AUM',
                size: '36B'
            },
        
            '8902625580252': {
                itemName: 'F065',
                color: 'AUM',
                size: '36C'
            },
        
            '8902625580269': {
                itemName: 'F065',
                color: 'AUM',
                size: '36D'
            },
        
            '8902625580276': {
                itemName: 'F065',
                color: 'AUM',
                size: '38B'
            },
        
            '8902625580283': {
                itemName: 'F065',
                color: 'AUM',
                size: '38C'
            },
        
            '8902625552426': {
                itemName: 'F065',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625552433': {
                itemName: 'F065',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625552440': {
                itemName: 'F065',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625560773': {
                itemName: 'F065',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625560780': {
                itemName: 'F065',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625560797': {
                itemName: 'F065',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625560803': {
                itemName: 'F065',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625560810': {
                itemName: 'F065',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625560827': {
                itemName: 'F065',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625560834': {
                itemName: 'F065',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625560841': {
                itemName: 'F065',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625552488': {
                itemName: 'F065',
                color: 'CLM',
                size: '32B'
            },
        
            '8902625552495': {
                itemName: 'F065',
                color: 'CLM',
                size: '32C'
            },
        
            '8902625552501': {
                itemName: 'F065',
                color: 'CLM',
                size: '32D'
            },
        
            '8902625560957': {
                itemName: 'F065',
                color: 'CLM',
                size: '34B'
            },
        
            '8902625560964': {
                itemName: 'F065',
                color: 'CLM',
                size: '34C'
            },
        
            '8902625560971': {
                itemName: 'F065',
                color: 'CLM',
                size: '34D'
            },
        
            '8902625560988': {
                itemName: 'F065',
                color: 'CLM',
                size: '36B'
            },
        
            '8902625560995': {
                itemName: 'F065',
                color: 'CLM',
                size: '36C'
            },
        
            '8902625561008': {
                itemName: 'F065',
                color: 'CLM',
                size: '36D'
            },
        
            '8902625561015': {
                itemName: 'F065',
                color: 'CLM',
                size: '38B'
            },
        
            '8902625561022': {
                itemName: 'F065',
                color: 'CLM',
                size: '38C'
            },
        
            '8902625033949': {
                itemName: 'F065',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625033956': {
                itemName: 'F065',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625033963': {
                itemName: 'F065',
                color: 'HOB',
                size: '32D'
            },
        
            '8902625033970': {
                itemName: 'F065',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625033987': {
                itemName: 'F065',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625033994': {
                itemName: 'F065',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625034007': {
                itemName: 'F065',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625034014': {
                itemName: 'F065',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625034021': {
                itemName: 'F065',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625034038': {
                itemName: 'F065',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625034045': {
                itemName: 'F065',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625552594': {
                itemName: 'F065',
                color: 'WFM',
                size: '32B'
            },
        
            '8902625552600': {
                itemName: 'F065',
                color: 'WFM',
                size: '32C'
            },
        
            '8902625552617': {
                itemName: 'F065',
                color: 'WFM',
                size: '32D'
            },
        
            '8902625561275': {
                itemName: 'F065',
                color: 'WFM',
                size: '34B'
            },
        
            '8902625561282': {
                itemName: 'F065',
                color: 'WFM',
                size: '34C'
            },
        
            '8902625561299': {
                itemName: 'F065',
                color: 'WFM',
                size: '34D'
            },
        
            '8902625561305': {
                itemName: 'F065',
                color: 'WFM',
                size: '36B'
            },
        
            '8902625561312': {
                itemName: 'F065',
                color: 'WFM',
                size: '36C'
            },
        
            '8902625561329': {
                itemName: 'F065',
                color: 'WFM',
                size: '36D'
            },
        
            '8902625561336': {
                itemName: 'F065',
                color: 'WFM',
                size: '38B'
            },
        
            '8902625561343': {
                itemName: 'F065',
                color: 'WFM',
                size: '38C'
            },
        
            '8902625608734': {
                itemName: 'F070',
                color: 'IGY',
                size: 'LAR'
            },
        
            '8902625608741': {
                itemName: 'F070',
                color: 'IGY',
                size: 'MED'
            },
        
            '8902625608758': {
                itemName: 'F070',
                color: 'IGY',
                size: 'SMA'
            },
        
            '8902625608765': {
                itemName: 'F070',
                color: 'IGY',
                size: 'XLA'
            },
        
            '8902625608772': {
                itemName: 'F070',
                color: 'PLS',
                size: 'LAR'
            },
        
            '8902625608789': {
                itemName: 'F070',
                color: 'PLS',
                size: 'MED'
            },
        
            '8902625608796': {
                itemName: 'F070',
                color: 'PLS',
                size: 'SMA'
            },
        
            '8902625608802': {
                itemName: 'F070',
                color: 'PLS',
                size: 'XLA'
            },
        
            '8902625004239': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '32B'
            },
        
            '8902625004246': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '32C'
            },
        
            '8902625004253': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '32D'
            },
        
            '8902625004260': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '32Z'
            },
        
            '8902625004277': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '34B'
            },
        
            '8902625004284': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '34C'
            },
        
            '8902625004291': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '34D'
            },
        
            '8902625004307': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '34Z'
            },
        
            '8902625004314': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '36B'
            },
        
            '8902625004321': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '36C'
            },
        
            '8902625004338': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '36D'
            },
        
            '8902625004345': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '36Z'
            },
        
            '8902625004352': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '38B'
            },
        
            '8902625004369': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '38C'
            },
        
            '8902625004376': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '38D'
            },
        
            '8902625004383': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '38Z'
            },
        
            '8902625004390': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '40B'
            },
        
            '8902625004406': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '40C'
            },
        
            '8902625004413': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '40D'
            },
        
            '8902625004420': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '40Z'
            },
        
            '8902625004437': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '42B'
            },
        
            '8902625004444': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '42C'
            },
        
            '8902625004451': {
                itemName: 'F074',
                color: 'BKCCL',
                size: '42D'
            },
        
            '8902625552655': {
                itemName: 'F074',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625552662': {
                itemName: 'F074',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625552679': {
                itemName: 'F074',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625552686': {
                itemName: 'F074',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625561442': {
                itemName: 'F074',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625561459': {
                itemName: 'F074',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625561466': {
                itemName: 'F074',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625561473': {
                itemName: 'F074',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625561480': {
                itemName: 'F074',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625561497': {
                itemName: 'F074',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625561503': {
                itemName: 'F074',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625561510': {
                itemName: 'F074',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625561527': {
                itemName: 'F074',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625561534': {
                itemName: 'F074',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625561541': {
                itemName: 'F074',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625561558': {
                itemName: 'F074',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625552693': {
                itemName: 'F074',
                color: 'BOS',
                size: '32B'
            },
        
            '8902625552709': {
                itemName: 'F074',
                color: 'BOS',
                size: '32C'
            },
        
            '8902625552716': {
                itemName: 'F074',
                color: 'BOS',
                size: '32D'
            },
        
            '8902625552723': {
                itemName: 'F074',
                color: 'BOS',
                size: '32Z'
            },
        
            '8902625561633': {
                itemName: 'F074',
                color: 'BOS',
                size: '34B'
            },
        
            '8902625561640': {
                itemName: 'F074',
                color: 'BOS',
                size: '34C'
            },
        
            '8902625561657': {
                itemName: 'F074',
                color: 'BOS',
                size: '34D'
            },
        
            '8902625561664': {
                itemName: 'F074',
                color: 'BOS',
                size: '34Z'
            },
        
            '8902625561671': {
                itemName: 'F074',
                color: 'BOS',
                size: '36B'
            },
        
            '8902625561688': {
                itemName: 'F074',
                color: 'BOS',
                size: '36C'
            },
        
            '8902625561695': {
                itemName: 'F074',
                color: 'BOS',
                size: '36D'
            },
        
            '8902625561701': {
                itemName: 'F074',
                color: 'BOS',
                size: '36Z'
            },
        
            '8902625561718': {
                itemName: 'F074',
                color: 'BOS',
                size: '38B'
            },
        
            '8902625561725': {
                itemName: 'F074',
                color: 'BOS',
                size: '38C'
            },
        
            '8902625561732': {
                itemName: 'F074',
                color: 'BOS',
                size: '38D'
            },
        
            '8902625561749': {
                itemName: 'F074',
                color: 'BOS',
                size: '38Z'
            },
        
            '8902625552730': {
                itemName: 'F074',
                color: 'BUFF',
                size: '32B'
            },
        
            '8902625552747': {
                itemName: 'F074',
                color: 'BUFF',
                size: '32C'
            },
        
            '8902625552754': {
                itemName: 'F074',
                color: 'BUFF',
                size: '32D'
            },
        
            '8902625552761': {
                itemName: 'F074',
                color: 'BUFF',
                size: '32Z'
            },
        
            '8902625561794': {
                itemName: 'F074',
                color: 'BUFF',
                size: '34B'
            },
        
            '8902625561800': {
                itemName: 'F074',
                color: 'BUFF',
                size: '34C'
            },
        
            '8902625561817': {
                itemName: 'F074',
                color: 'BUFF',
                size: '34D'
            },
        
            '8902625561824': {
                itemName: 'F074',
                color: 'BUFF',
                size: '34Z'
            },
        
            '8902625561831': {
                itemName: 'F074',
                color: 'BUFF',
                size: '36B'
            },
        
            '8902625561848': {
                itemName: 'F074',
                color: 'BUFF',
                size: '36C'
            },
        
            '8902625561855': {
                itemName: 'F074',
                color: 'BUFF',
                size: '36D'
            },
        
            '8902625561862': {
                itemName: 'F074',
                color: 'BUFF',
                size: '36Z'
            },
        
            '8902625561879': {
                itemName: 'F074',
                color: 'BUFF',
                size: '38B'
            },
        
            '8902625561886': {
                itemName: 'F074',
                color: 'BUFF',
                size: '38C'
            },
        
            '8902625561893': {
                itemName: 'F074',
                color: 'BUFF',
                size: '38D'
            },
        
            '8902625561909': {
                itemName: 'F074',
                color: 'BUFF',
                size: '38Z'
            },
        
            '8902625004000': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '32B'
            },
        
            '8902625004017': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '32C'
            },
        
            '8902625004024': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '32D'
            },
        
            '8902625004031': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '32Z'
            },
        
            '8902625004048': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '34B'
            },
        
            '8902625004055': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '34C'
            },
        
            '8902625004062': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '34D'
            },
        
            '8902625004079': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '34Z'
            },
        
            '8902625004086': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '36B'
            },
        
            '8902625004093': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '36C'
            },
        
            '8902625004109': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '36D'
            },
        
            '8902625004116': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '36Z'
            },
        
            '8902625004123': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '38B'
            },
        
            '8902625004130': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '38C'
            },
        
            '8902625004147': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '38D'
            },
        
            '8902625004154': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '38Z'
            },
        
            '8902625004161': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '40B'
            },
        
            '8902625004178': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '40C'
            },
        
            '8902625004185': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '40D'
            },
        
            '8902625004192': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '40Z'
            },
        
            '8902625004208': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '42B'
            },
        
            '8902625004215': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '42C'
            },
        
            '8902625004222': {
                itemName: 'F074',
                color: 'RSTLCE',
                size: '42D'
            },
        
            '8902625561985': {
                itemName: 'F084',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625561992': {
                itemName: 'F084',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625562005': {
                itemName: 'F084',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625562012': {
                itemName: 'F084',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625581655': {
                itemName: 'F084',
                color: 'NUDE',
                size: 'L'
            },
        
            '8902625581662': {
                itemName: 'F084',
                color: 'NUDE',
                size: 'M'
            },
        
            '8902625581679': {
                itemName: 'F084',
                color: 'NUDE',
                size: 'S'
            },
        
            '8902625581686': {
                itemName: 'F084',
                color: 'NUDE',
                size: 'XL'
            },
        
            '8902625562067': {
                itemName: 'F084',
                color: 'STI',
                size: 'L'
            },
        
            '8902625562074': {
                itemName: 'F084',
                color: 'STI',
                size: 'M'
            },
        
            '8902625562081': {
                itemName: 'F084',
                color: 'STI',
                size: 'S'
            },
        
            '8902625562098': {
                itemName: 'F084',
                color: 'STI',
                size: 'XL'
            },
        
            '8902625563460': {
                itemName: 'F087',
                color: 'CON',
                size: '34B'
            },
        
            '8902625563477': {
                itemName: 'F087',
                color: 'CON',
                size: '34C'
            },
        
            '8902625563484': {
                itemName: 'F087',
                color: 'CON',
                size: '34D'
            },
        
            '8902625583727': {
                itemName: 'F087',
                color: 'CON',
                size: '34Z'
            },
        
            '8902625563491': {
                itemName: 'F087',
                color: 'CON',
                size: '36B'
            },
        
            '8902625563507': {
                itemName: 'F087',
                color: 'CON',
                size: '36C'
            },
        
            '8902625563514': {
                itemName: 'F087',
                color: 'CON',
                size: '36D'
            },
        
            '8902625583734': {
                itemName: 'F087',
                color: 'CON',
                size: '36Z'
            },
        
            '8902625563521': {
                itemName: 'F087',
                color: 'CON',
                size: '38B'
            },
        
            '8902625563538': {
                itemName: 'F087',
                color: 'CON',
                size: '38C'
            },
        
            '8902625563545': {
                itemName: 'F087',
                color: 'CON',
                size: '38D'
            },
        
            '8902625583741': {
                itemName: 'F087',
                color: 'CON',
                size: '38Z'
            },
        
            '8902625563552': {
                itemName: 'F087',
                color: 'CON',
                size: '40B'
            },
        
            '8902625563569': {
                itemName: 'F087',
                color: 'CON',
                size: '40C'
            },
        
            '8902625563576': {
                itemName: 'F087',
                color: 'CON',
                size: '40D'
            },
        
            '8902625583758': {
                itemName: 'F087',
                color: 'CON',
                size: '40Z'
            },
        
            '8902625594372': {
                itemName: 'F087',
                color: 'SLI',
                size: '34B'
            },
        
            '8902625594303': {
                itemName: 'F087',
                color: 'SLI',
                size: '34C'
            },
        
            '8902625594259': {
                itemName: 'F087',
                color: 'SLI',
                size: '34D'
            },
        
            '8902625594297': {
                itemName: 'F087',
                color: 'SLI',
                size: '34Z'
            },
        
            '8902625594365': {
                itemName: 'F087',
                color: 'SLI',
                size: '36B'
            },
        
            '8902625594280': {
                itemName: 'F087',
                color: 'SLI',
                size: '36C'
            },
        
            '8902625594242': {
                itemName: 'F087',
                color: 'SLI',
                size: '36D'
            },
        
            '8902625594273': {
                itemName: 'F087',
                color: 'SLI',
                size: '36Z'
            },
        
            '8902625594389': {
                itemName: 'F087',
                color: 'SLI',
                size: '38B'
            },
        
            '8902625594327': {
                itemName: 'F087',
                color: 'SLI',
                size: '38C'
            },
        
            '8902625594266': {
                itemName: 'F087',
                color: 'SLI',
                size: '38D'
            },
        
            '8902625594341': {
                itemName: 'F087',
                color: 'SLI',
                size: '38Z'
            },
        
            '8902625524775': {
                itemName: 'F087',
                color: 'SLI',
                size: '40B'
            },
        
            '8902625594358': {
                itemName: 'F087',
                color: 'SLI',
                size: '40C'
            },
        
            '8902625594334': {
                itemName: 'F087',
                color: 'SLI',
                size: '40D'
            },
        
            '8902625594310': {
                itemName: 'F087',
                color: 'SLI',
                size: '40Z'
            },
        
            '8902625827982': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '32B'
            },
        
            '8902625827999': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '32C'
            },
        
            '8902625828002': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '32D'
            },
        
            '8902625828019': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '34B'
            },
        
            '8902625828026': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '34C'
            },
        
            '8902625828033': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '34D'
            },
        
            '8902625828040': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '36B'
            },
        
            '8902625828057': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '36C'
            },
        
            '8902625828064': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '36D'
            },
        
            '8902625828071': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '38B'
            },
        
            '8902625828088': {
                itemName: 'F091',
                color: 'FRVRR',
                size: '38C'
            },
        
            '8902625583222': {
                itemName: 'F091',
                color: 'LBLU',
                size: '32B'
            },
        
            '8902625583239': {
                itemName: 'F091',
                color: 'LBLU',
                size: '32C'
            },
        
            '8902625583246': {
                itemName: 'F091',
                color: 'LBLU',
                size: '32D'
            },
        
            '8902625583253': {
                itemName: 'F091',
                color: 'LBLU',
                size: '34B'
            },
        
            '8902625583260': {
                itemName: 'F091',
                color: 'LBLU',
                size: '34C'
            },
        
            '8902625583277': {
                itemName: 'F091',
                color: 'LBLU',
                size: '34D'
            },
        
            '8902625583284': {
                itemName: 'F091',
                color: 'LBLU',
                size: '36B'
            },
        
            '8902625583291': {
                itemName: 'F091',
                color: 'LBLU',
                size: '36C'
            },
        
            '8902625583307': {
                itemName: 'F091',
                color: 'LBLU',
                size: '38B'
            },
        
            '8902625583314': {
                itemName: 'F091',
                color: 'LBLU',
                size: '38C'
            },
        
            '8902625583321': {
                itemName: 'F091',
                color: 'PLUM',
                size: '32B'
            },
        
            '8902625583338': {
                itemName: 'F091',
                color: 'PLUM',
                size: '32C'
            },
        
            '8902625583345': {
                itemName: 'F091',
                color: 'PLUM',
                size: '32D'
            },
        
            '8902625583352': {
                itemName: 'F091',
                color: 'PLUM',
                size: '34B'
            },
        
            '8902625583369': {
                itemName: 'F091',
                color: 'PLUM',
                size: '34C'
            },
        
            '8902625583376': {
                itemName: 'F091',
                color: 'PLUM',
                size: '34D'
            },
        
            '8902625583383': {
                itemName: 'F091',
                color: 'PLUM',
                size: '36B'
            },
        
            '8902625583390': {
                itemName: 'F091',
                color: 'PLUM',
                size: '36C'
            },
        
            '8902625583406': {
                itemName: 'F091',
                color: 'PLUM',
                size: '38B'
            },
        
            '8902625583413': {
                itemName: 'F091',
                color: 'PLUM',
                size: '38C'
            },
        
            '8902625612052': {
                itemName: 'F096',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625612069': {
                itemName: 'F096',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625612076': {
                itemName: 'F096',
                color: 'BLACK',
                size: '34F'
            },
        
            '8902625612083': {
                itemName: 'F096',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625612090': {
                itemName: 'F096',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625612106': {
                itemName: 'F096',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625612113': {
                itemName: 'F096',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625612120': {
                itemName: 'F096',
                color: 'BLACK',
                size: '36F'
            },
        
            '8902625612137': {
                itemName: 'F096',
                color: 'BLACK',
                size: '36G'
            },
        
            '8902625612144': {
                itemName: 'F096',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625612168': {
                itemName: 'F096',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625612175': {
                itemName: 'F096',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625612182': {
                itemName: 'F096',
                color: 'BLACK',
                size: '38F'
            },
        
            '8902625612199': {
                itemName: 'F096',
                color: 'BLACK',
                size: '38G'
            },
        
            '8902625612205': {
                itemName: 'F096',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625612229': {
                itemName: 'F096',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625612236': {
                itemName: 'F096',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625612243': {
                itemName: 'F096',
                color: 'BLACK',
                size: '40F'
            },
        
            '8902625612250': {
                itemName: 'F096',
                color: 'BLACK',
                size: '40G'
            },
        
            '8902625612267': {
                itemName: 'F096',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625612281': {
                itemName: 'F096',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625612298': {
                itemName: 'F096',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625612304': {
                itemName: 'F096',
                color: 'BLACK',
                size: '42F'
            },
        
            '8902625612311': {
                itemName: 'F096',
                color: 'BLACK',
                size: '42G'
            },
        
            '8902625612328': {
                itemName: 'F096',
                color: 'BLACK',
                size: '42Z'
            },
        
            '8902625612342': {
                itemName: 'F096',
                color: 'BLACK',
                size: '44C'
            },
        
            '8902625612359': {
                itemName: 'F096',
                color: 'BLACK',
                size: '44D'
            },
        
            '8902625612366': {
                itemName: 'F096',
                color: 'BLACK',
                size: '44F'
            },
        
            '8902625612373': {
                itemName: 'F096',
                color: 'BLACK',
                size: '44G'
            },
        
            '8902625612380': {
                itemName: 'F096',
                color: 'BLACK',
                size: '44Z'
            },
        
            '8902625612397': {
                itemName: 'F096',
                color: 'IGY',
                size: '34C'
            },
        
            '8902625612403': {
                itemName: 'F096',
                color: 'IGY',
                size: '34D'
            },
        
            '8902625612410': {
                itemName: 'F096',
                color: 'IGY',
                size: '34F'
            },
        
            '8902625612427': {
                itemName: 'F096',
                color: 'IGY',
                size: '34Z'
            },
        
            '8902625612434': {
                itemName: 'F096',
                color: 'IGY',
                size: '36B'
            },
        
            '8902625612441': {
                itemName: 'F096',
                color: 'IGY',
                size: '36C'
            },
        
            '8902625612458': {
                itemName: 'F096',
                color: 'IGY',
                size: '36D'
            },
        
            '8902625612465': {
                itemName: 'F096',
                color: 'IGY',
                size: '36F'
            },
        
            '8902625612472': {
                itemName: 'F096',
                color: 'IGY',
                size: '36G'
            },
        
            '8902625612489': {
                itemName: 'F096',
                color: 'IGY',
                size: '36Z'
            },
        
            '8902625612502': {
                itemName: 'F096',
                color: 'IGY',
                size: '38C'
            },
        
            '8902625612519': {
                itemName: 'F096',
                color: 'IGY',
                size: '38D'
            },
        
            '8902625612526': {
                itemName: 'F096',
                color: 'IGY',
                size: '38F'
            },
        
            '8902625612533': {
                itemName: 'F096',
                color: 'IGY',
                size: '38G'
            },
        
            '8902625612540': {
                itemName: 'F096',
                color: 'IGY',
                size: '38Z'
            },
        
            '8902625612564': {
                itemName: 'F096',
                color: 'IGY',
                size: '40C'
            },
        
            '8902625612571': {
                itemName: 'F096',
                color: 'IGY',
                size: '40D'
            },
        
            '8902625612588': {
                itemName: 'F096',
                color: 'IGY',
                size: '40F'
            },
        
            '8902625612595': {
                itemName: 'F096',
                color: 'IGY',
                size: '40G'
            },
        
            '8902625612601': {
                itemName: 'F096',
                color: 'IGY',
                size: '40Z'
            },
        
            '8902625612625': {
                itemName: 'F096',
                color: 'IGY',
                size: '42C'
            },
        
            '8902625612632': {
                itemName: 'F096',
                color: 'IGY',
                size: '42D'
            },
        
            '8902625612649': {
                itemName: 'F096',
                color: 'IGY',
                size: '42F'
            },
        
            '8902625612656': {
                itemName: 'F096',
                color: 'IGY',
                size: '42G'
            },
        
            '8902625612663': {
                itemName: 'F096',
                color: 'IGY',
                size: '42Z'
            },
        
            '8902625612687': {
                itemName: 'F096',
                color: 'IGY',
                size: '44C'
            },
        
            '8902625612694': {
                itemName: 'F096',
                color: 'IGY',
                size: '44D'
            },
        
            '8902625612700': {
                itemName: 'F096',
                color: 'IGY',
                size: '44F'
            },
        
            '8902625612717': {
                itemName: 'F096',
                color: 'IGY',
                size: '44G'
            },
        
            '8902625612724': {
                itemName: 'F096',
                color: 'IGY',
                size: '44Z'
            },
        
            '8902625612731': {
                itemName: 'F096',
                color: 'PEARL',
                size: '34C'
            },
        
            '8902625612748': {
                itemName: 'F096',
                color: 'PEARL',
                size: '34D'
            },
        
            '8902625612755': {
                itemName: 'F096',
                color: 'PEARL',
                size: '34F'
            },
        
            '8902625612762': {
                itemName: 'F096',
                color: 'PEARL',
                size: '34Z'
            },
        
            '8902625612779': {
                itemName: 'F096',
                color: 'PEARL',
                size: '36B'
            },
        
            '8902625612786': {
                itemName: 'F096',
                color: 'PEARL',
                size: '36C'
            },
        
            '8902625612793': {
                itemName: 'F096',
                color: 'PEARL',
                size: '36D'
            },
        
            '8902625612809': {
                itemName: 'F096',
                color: 'PEARL',
                size: '36F'
            },
        
            '8902625612816': {
                itemName: 'F096',
                color: 'PEARL',
                size: '36G'
            },
        
            '8902625612823': {
                itemName: 'F096',
                color: 'PEARL',
                size: '36Z'
            },
        
            '8902625612847': {
                itemName: 'F096',
                color: 'PEARL',
                size: '38C'
            },
        
            '8902625612854': {
                itemName: 'F096',
                color: 'PEARL',
                size: '38D'
            },
        
            '8902625612861': {
                itemName: 'F096',
                color: 'PEARL',
                size: '38F'
            },
        
            '8902625612878': {
                itemName: 'F096',
                color: 'PEARL',
                size: '38G'
            },
        
            '8902625612885': {
                itemName: 'F096',
                color: 'PEARL',
                size: '38Z'
            },
        
            '8902625612908': {
                itemName: 'F096',
                color: 'PEARL',
                size: '40C'
            },
        
            '8902625612915': {
                itemName: 'F096',
                color: 'PEARL',
                size: '40D'
            },
        
            '8902625612922': {
                itemName: 'F096',
                color: 'PEARL',
                size: '40F'
            },
        
            '8902625612939': {
                itemName: 'F096',
                color: 'PEARL',
                size: '40G'
            },
        
            '8902625612946': {
                itemName: 'F096',
                color: 'PEARL',
                size: '40Z'
            },
        
            '8902625612960': {
                itemName: 'F096',
                color: 'PEARL',
                size: '42C'
            },
        
            '8902625612977': {
                itemName: 'F096',
                color: 'PEARL',
                size: '42D'
            },
        
            '8902625612984': {
                itemName: 'F096',
                color: 'PEARL',
                size: '42F'
            },
        
            '8902625612991': {
                itemName: 'F096',
                color: 'PEARL',
                size: '42G'
            },
        
            '8902625613004': {
                itemName: 'F096',
                color: 'PEARL',
                size: '42Z'
            },
        
            '8902625613028': {
                itemName: 'F096',
                color: 'PEARL',
                size: '44C'
            },
        
            '8902625613035': {
                itemName: 'F096',
                color: 'PEARL',
                size: '44D'
            },
        
            '8902625613042': {
                itemName: 'F096',
                color: 'PEARL',
                size: '44F'
            },
        
            '8902625613059': {
                itemName: 'F096',
                color: 'PEARL',
                size: '44G'
            },
        
            '8902625613066': {
                itemName: 'F096',
                color: 'PEARL',
                size: '44Z'
            },
        
            '8902625613073': {
                itemName: 'F097',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625613080': {
                itemName: 'F097',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625613097': {
                itemName: 'F097',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625613103': {
                itemName: 'F097',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625613110': {
                itemName: 'F097',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625613127': {
                itemName: 'F097',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625613134': {
                itemName: 'F097',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625613141': {
                itemName: 'F097',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625613158': {
                itemName: 'F097',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625613165': {
                itemName: 'F097',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625613172': {
                itemName: 'F097',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625613189': {
                itemName: 'F097',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625613196': {
                itemName: 'F097',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625613202': {
                itemName: 'F097',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625613219': {
                itemName: 'F097',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625613226': {
                itemName: 'F097',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625613233': {
                itemName: 'F097',
                color: 'BLACK',
                size: '42B'
            },
        
            '8902625613240': {
                itemName: 'F097',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625613257': {
                itemName: 'F097',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625613455': {
                itemName: 'F097',
                color: 'MNPP',
                size: '34B'
            },
        
            '8902625613462': {
                itemName: 'F097',
                color: 'MNPP',
                size: '34C'
            },
        
            '8902625613479': {
                itemName: 'F097',
                color: 'MNPP',
                size: '34D'
            },
        
            '8902625613486': {
                itemName: 'F097',
                color: 'MNPP',
                size: '34Z'
            },
        
            '8902625613493': {
                itemName: 'F097',
                color: 'MNPP',
                size: '36B'
            },
        
            '8902625613509': {
                itemName: 'F097',
                color: 'MNPP',
                size: '36C'
            },
        
            '8902625613516': {
                itemName: 'F097',
                color: 'MNPP',
                size: '36D'
            },
        
            '8902625613523': {
                itemName: 'F097',
                color: 'MNPP',
                size: '36Z'
            },
        
            '8902625613530': {
                itemName: 'F097',
                color: 'MNPP',
                size: '38B'
            },
        
            '8902625613547': {
                itemName: 'F097',
                color: 'MNPP',
                size: '38C'
            },
        
            '8902625613554': {
                itemName: 'F097',
                color: 'MNPP',
                size: '38D'
            },
        
            '8902625613561': {
                itemName: 'F097',
                color: 'MNPP',
                size: '38Z'
            },
        
            '8902625613578': {
                itemName: 'F097',
                color: 'MNPP',
                size: '40B'
            },
        
            '8902625613585': {
                itemName: 'F097',
                color: 'MNPP',
                size: '40C'
            },
        
            '8902625613592': {
                itemName: 'F097',
                color: 'MNPP',
                size: '40D'
            },
        
            '8902625613608': {
                itemName: 'F097',
                color: 'MNPP',
                size: '40Z'
            },
        
            '8902625613615': {
                itemName: 'F097',
                color: 'MNPP',
                size: '42B'
            },
        
            '8902625613622': {
                itemName: 'F097',
                color: 'MNPP',
                size: '42C'
            },
        
            '8902625613639': {
                itemName: 'F097',
                color: 'MNPP',
                size: '42D'
            },
        
            '8902625613264': {
                itemName: 'F097',
                color: 'PEARL',
                size: '34B'
            },
        
            '8902625613271': {
                itemName: 'F097',
                color: 'PEARL',
                size: '34C'
            },
        
            '8902625613288': {
                itemName: 'F097',
                color: 'PEARL',
                size: '34D'
            },
        
            '8902625613295': {
                itemName: 'F097',
                color: 'PEARL',
                size: '34Z'
            },
        
            '8902625613301': {
                itemName: 'F097',
                color: 'PEARL',
                size: '36B'
            },
        
            '8902625613318': {
                itemName: 'F097',
                color: 'PEARL',
                size: '36C'
            },
        
            '8902625613325': {
                itemName: 'F097',
                color: 'PEARL',
                size: '36D'
            },
        
            '8902625613332': {
                itemName: 'F097',
                color: 'PEARL',
                size: '36Z'
            },
        
            '8902625613349': {
                itemName: 'F097',
                color: 'PEARL',
                size: '38B'
            },
        
            '8902625613356': {
                itemName: 'F097',
                color: 'PEARL',
                size: '38C'
            },
        
            '8902625613363': {
                itemName: 'F097',
                color: 'PEARL',
                size: '38D'
            },
        
            '8902625613370': {
                itemName: 'F097',
                color: 'PEARL',
                size: '38Z'
            },
        
            '8902625613387': {
                itemName: 'F097',
                color: 'PEARL',
                size: '40B'
            },
        
            '8902625613394': {
                itemName: 'F097',
                color: 'PEARL',
                size: '40C'
            },
        
            '8902625613400': {
                itemName: 'F097',
                color: 'PEARL',
                size: '40D'
            },
        
            '8902625613417': {
                itemName: 'F097',
                color: 'PEARL',
                size: '40Z'
            },
        
            '8902625613424': {
                itemName: 'F097',
                color: 'PEARL',
                size: '42B'
            },
        
            '8902625613431': {
                itemName: 'F097',
                color: 'PEARL',
                size: '42C'
            },
        
            '8902625613448': {
                itemName: 'F097',
                color: 'PEARL',
                size: '42D'
            },
        
            '8902625826619': {
                itemName: 'F107',
                color: 'BLACK',
                size: 'LAR'
            },
        
            '8902625826626': {
                itemName: 'F107',
                color: 'BLACK',
                size: 'MED'
            },
        
            '8902625826633': {
                itemName: 'F107',
                color: 'BLACK',
                size: 'SMA'
            },
        
            '8902625826640': {
                itemName: 'F107',
                color: 'BLACK',
                size: 'XLA'
            },
        
            '8902625826695': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '32B'
            },
        
            '8902625826701': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '32C'
            },
        
            '8902625826718': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '32D'
            },
        
            '8902625826725': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '34B'
            },
        
            '8902625826732': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '34C'
            },
        
            '8902625826749': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '34D'
            },
        
            '8902625826756': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '36B'
            },
        
            '8902625826763': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '36C'
            },
        
            '8902625826770': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '36D'
            },
        
            '8902625826787': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '38B'
            },
        
            '8902625826794': {
                itemName: 'F108',
                color: 'AQGRY',
                size: '38C'
            },
        
            '8902625826800': {
                itemName: 'F108',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625826817': {
                itemName: 'F108',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625826824': {
                itemName: 'F108',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625826831': {
                itemName: 'F108',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625826848': {
                itemName: 'F108',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625826855': {
                itemName: 'F108',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625826862': {
                itemName: 'F108',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625826879': {
                itemName: 'F108',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625826886': {
                itemName: 'F108',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625826893': {
                itemName: 'F108',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625826909': {
                itemName: 'F108',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625005311': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '32B'
            },
        
            '8902625005328': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '32C'
            },
        
            '8902625005335': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '32D'
            },
        
            '8902625005342': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '34B'
            },
        
            '8902625005359': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '34C'
            },
        
            '8902625005366': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '34D'
            },
        
            '8902625005373': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '36B'
            },
        
            '8902625005380': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '36C'
            },
        
            '8902625005397': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '36D'
            },
        
            '8902625005403': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '38B'
            },
        
            '8902625005410': {
                itemName: 'F108',
                color: 'VLTTLP',
                size: '38C'
            },
        
            '8902625826916': {
                itemName: 'F109',
                color: 'AQGRY',
                size: 'LAR'
            },
        
            '8902625826923': {
                itemName: 'F109',
                color: 'AQGRY',
                size: 'MED'
            },
        
            '8902625826930': {
                itemName: 'F109',
                color: 'AQGRY',
                size: 'SMA'
            },
        
            '8902625826947': {
                itemName: 'F109',
                color: 'AQGRY',
                size: 'XLA'
            },
        
            '8902625826961': {
                itemName: 'F109',
                color: 'RTE',
                size: 'LAR'
            },
        
            '8902625826978': {
                itemName: 'F109',
                color: 'RTE',
                size: 'MED'
            },
        
            '8902625826985': {
                itemName: 'F109',
                color: 'RTE',
                size: 'SMA'
            },
        
            '8902625826992': {
                itemName: 'F109',
                color: 'RTE',
                size: 'XLA'
            },
        
            '8902625827005': {
                itemName: 'F110',
                color: 'BLACK',
                size: 'LAR'
            },
        
            '8902625827012': {
                itemName: 'F110',
                color: 'BLACK',
                size: 'MED'
            },
        
            '8902625827029': {
                itemName: 'F110',
                color: 'BLACK',
                size: 'SMA'
            },
        
            '8902625827036': {
                itemName: 'F110',
                color: 'BLACK',
                size: 'XLA'
            },
        
            '8902625827081': {
                itemName: 'F111',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625827098': {
                itemName: 'F111',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625827104': {
                itemName: 'F111',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625827111': {
                itemName: 'F111',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625827128': {
                itemName: 'F111',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625827135': {
                itemName: 'F111',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625827142': {
                itemName: 'F111',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625827159': {
                itemName: 'F111',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625827166': {
                itemName: 'F111',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625827173': {
                itemName: 'F111',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625827180': {
                itemName: 'F111',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625005465': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '32B'
            },
        
            '8902625005472': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '32C'
            },
        
            '8902625005489': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '32D'
            },
        
            '8902625005496': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '34B'
            },
        
            '8902625005502': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '34C'
            },
        
            '8902625005519': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '34D'
            },
        
            '8902625005526': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '36B'
            },
        
            '8902625005533': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '36C'
            },
        
            '8902625005540': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '36D'
            },
        
            '8902625005557': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '38B'
            },
        
            '8902625005564': {
                itemName: 'F111',
                color: 'FRVRR',
                size: '38C'
            },
        
            '8902625827197': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '32B'
            },
        
            '8902625827203': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '32C'
            },
        
            '8902625827210': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '32D'
            },
        
            '8902625827227': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '34B'
            },
        
            '8902625827234': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '34C'
            },
        
            '8902625827241': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '34D'
            },
        
            '8902625827258': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '36B'
            },
        
            '8902625827265': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '36C'
            },
        
            '8902625827272': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '36D'
            },
        
            '8902625827289': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '38B'
            },
        
            '8902625827296': {
                itemName: 'F111',
                color: 'MOLIG',
                size: '38C'
            },
        
            '8902625001832': {
                itemName: 'F114',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625001849': {
                itemName: 'F114',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625001856': {
                itemName: 'F114',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625001863': {
                itemName: 'F114',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625001870': {
                itemName: 'F114',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625001887': {
                itemName: 'F114',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625001894': {
                itemName: 'F114',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625001900': {
                itemName: 'F114',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625034441': {
                itemName: 'F114',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625034458': {
                itemName: 'F114',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625034465': {
                itemName: 'F114',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625034472': {
                itemName: 'F114',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625034489': {
                itemName: 'F114',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625034496': {
                itemName: 'F114',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625034502': {
                itemName: 'F114',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625034519': {
                itemName: 'F114',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625001917': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '32B'
            },
        
            '8902625001924': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '32C'
            },
        
            '8902625001931': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '34B'
            },
        
            '8902625001948': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '34C'
            },
        
            '8902625001955': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '36B'
            },
        
            '8902625001962': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '36C'
            },
        
            '8902625001979': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '38B'
            },
        
            '8902625001986': {
                itemName: 'F114',
                color: 'NSTLGR',
                size: '38C'
            },
        
            '8902625036407': {
                itemName: 'F115',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625036414': {
                itemName: 'F115',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625036421': {
                itemName: 'F115',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625036438': {
                itemName: 'F115',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625036445': {
                itemName: 'F115',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625036452': {
                itemName: 'F115',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625036469': {
                itemName: 'F115',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625036476': {
                itemName: 'F115',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625036322': {
                itemName: 'F115',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625036339': {
                itemName: 'F115',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625036346': {
                itemName: 'F115',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625036353': {
                itemName: 'F115',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625036360': {
                itemName: 'F115',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625036377': {
                itemName: 'F115',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625036384': {
                itemName: 'F115',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625036391': {
                itemName: 'F115',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625000002': {
                itemName: 'F116',
                color: 'BKC',
                size: '32B'
            },
        
            '8902625000019': {
                itemName: 'F116',
                color: 'BKC',
                size: '32C'
            },
        
            '8902625000026': {
                itemName: 'F116',
                color: 'BKC',
                size: '32D'
            },
        
            '8902625000033': {
                itemName: 'F116',
                color: 'BKC',
                size: '34B'
            },
        
            '8902625000040': {
                itemName: 'F116',
                color: 'BKC',
                size: '34C'
            },
        
            '8902625000057': {
                itemName: 'F116',
                color: 'BKC',
                size: '34D'
            },
        
            '8902625000064': {
                itemName: 'F116',
                color: 'BKC',
                size: '36B'
            },
        
            '8902625000071': {
                itemName: 'F116',
                color: 'BKC',
                size: '36C'
            },
        
            '8902625000088': {
                itemName: 'F116',
                color: 'BKC',
                size: '38B'
            },
        
            '8902625000095': {
                itemName: 'F116',
                color: 'BKC',
                size: '38C'
            },
        
            '8902625000101': {
                itemName: 'F116',
                color: 'DSR',
                size: '32B'
            },
        
            '8902625000118': {
                itemName: 'F116',
                color: 'DSR',
                size: '32C'
            },
        
            '8902625000125': {
                itemName: 'F116',
                color: 'DSR',
                size: '32D'
            },
        
            '8902625000132': {
                itemName: 'F116',
                color: 'DSR',
                size: '34B'
            },
        
            '8902625000149': {
                itemName: 'F116',
                color: 'DSR',
                size: '34C'
            },
        
            '8902625000156': {
                itemName: 'F116',
                color: 'DSR',
                size: '34D'
            },
        
            '8902625000163': {
                itemName: 'F116',
                color: 'DSR',
                size: '36B'
            },
        
            '8902625000170': {
                itemName: 'F116',
                color: 'DSR',
                size: '36C'
            },
        
            '8902625000187': {
                itemName: 'F116',
                color: 'DSR',
                size: '38B'
            },
        
            '8902625000194': {
                itemName: 'F116',
                color: 'DSR',
                size: '38C'
            },
        
            '8902625000286': {
                itemName: 'F118',
                color: 'DSR',
                size: '32B'
            },
        
            '8902625000293': {
                itemName: 'F118',
                color: 'DSR',
                size: '32C'
            },
        
            '8902625000309': {
                itemName: 'F118',
                color: 'DSR',
                size: '32D'
            },
        
            '8902625000316': {
                itemName: 'F118',
                color: 'DSR',
                size: '34B'
            },
        
            '8902625000323': {
                itemName: 'F118',
                color: 'DSR',
                size: '34C'
            },
        
            '8902625000330': {
                itemName: 'F118',
                color: 'DSR',
                size: '34D'
            },
        
            '8902625000347': {
                itemName: 'F118',
                color: 'DSR',
                size: '36B'
            },
        
            '8902625000354': {
                itemName: 'F118',
                color: 'DSR',
                size: '36C'
            },
        
            '8902625000361': {
                itemName: 'F118',
                color: 'DSR',
                size: '36D'
            },
        
            '8902625000378': {
                itemName: 'F118',
                color: 'DSR',
                size: '38B'
            },
        
            '8902625000385': {
                itemName: 'F118',
                color: 'DSR',
                size: '38C'
            },
        
            '8902625000392': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '32B'
            },
        
            '8902625000408': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '32C'
            },
        
            '8902625000415': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '32D'
            },
        
            '8902625000422': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '34B'
            },
        
            '8902625000439': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '34C'
            },
        
            '8902625000446': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '34D'
            },
        
            '8902625000453': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '36B'
            },
        
            '8902625000460': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '36C'
            },
        
            '8902625000477': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '36D'
            },
        
            '8902625000484': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '38B'
            },
        
            '8902625000491': {
                itemName: 'F118',
                color: 'VLTTLP',
                size: '38C'
            },
        
            '8902625001146': {
                itemName: 'F121',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625001153': {
                itemName: 'F121',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625001177': {
                itemName: 'F121',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625001207': {
                itemName: 'F121',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625001245': {
                itemName: 'F121',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625001283': {
                itemName: 'F121',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625001313': {
                itemName: 'F121',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625001337': {
                itemName: 'F121',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625001351': {
                itemName: 'F121',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625001382': {
                itemName: 'F121',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625001429': {
                itemName: 'F121',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625001467': {
                itemName: 'F121',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625001498': {
                itemName: 'F121',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625001511': {
                itemName: 'F121',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625001535': {
                itemName: 'F121',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625001566': {
                itemName: 'F121',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625001603': {
                itemName: 'F121',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625034274': {
                itemName: 'F121',
                color: 'HOB',
                size: '32D'
            },
        
            '8902625034281': {
                itemName: 'F121',
                color: 'HOB',
                size: '32Z'
            },
        
            '8902625034298': {
                itemName: 'F121',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625034304': {
                itemName: 'F121',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625034311': {
                itemName: 'F121',
                color: 'HOB',
                size: '34Z'
            },
        
            '8902625034328': {
                itemName: 'F121',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625034335': {
                itemName: 'F121',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625034342': {
                itemName: 'F121',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625034359': {
                itemName: 'F121',
                color: 'HOB',
                size: '36Z'
            },
        
            '8902625034366': {
                itemName: 'F121',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625034373': {
                itemName: 'F121',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625034380': {
                itemName: 'F121',
                color: 'HOB',
                size: '38D'
            },
        
            '8902625034397': {
                itemName: 'F121',
                color: 'HOB',
                size: '38Z'
            },
        
            '8902625034403': {
                itemName: 'F121',
                color: 'HOB',
                size: '40B'
            },
        
            '8902625034410': {
                itemName: 'F121',
                color: 'HOB',
                size: '40C'
            },
        
            '8902625034427': {
                itemName: 'F121',
                color: 'HOB',
                size: '40D'
            },
        
            '8902625034434': {
                itemName: 'F121',
                color: 'HOB',
                size: '40Z'
            },
        
            '8902625000972': {
                itemName: 'F121',
                color: 'SLI',
                size: '32D'
            },
        
            '8902625000989': {
                itemName: 'F121',
                color: 'SLI',
                size: '32Z'
            },
        
            '8902625000996': {
                itemName: 'F121',
                color: 'SLI',
                size: '34C'
            },
        
            '8902625001009': {
                itemName: 'F121',
                color: 'SLI',
                size: '34D'
            },
        
            '8902625001016': {
                itemName: 'F121',
                color: 'SLI',
                size: '34Z'
            },
        
            '8902625001023': {
                itemName: 'F121',
                color: 'SLI',
                size: '36B'
            },
        
            '8902625001030': {
                itemName: 'F121',
                color: 'SLI',
                size: '36C'
            },
        
            '8902625001047': {
                itemName: 'F121',
                color: 'SLI',
                size: '36D'
            },
        
            '8902625001054': {
                itemName: 'F121',
                color: 'SLI',
                size: '36Z'
            },
        
            '8902625001061': {
                itemName: 'F121',
                color: 'SLI',
                size: '38B'
            },
        
            '8902625001078': {
                itemName: 'F121',
                color: 'SLI',
                size: '38C'
            },
        
            '8902625001085': {
                itemName: 'F121',
                color: 'SLI',
                size: '38D'
            },
        
            '8902625001092': {
                itemName: 'F121',
                color: 'SLI',
                size: '38Z'
            },
        
            '8902625001108': {
                itemName: 'F121',
                color: 'SLI',
                size: '40B'
            },
        
            '8902625001115': {
                itemName: 'F121',
                color: 'SLI',
                size: '40C'
            },
        
            '8902625001122': {
                itemName: 'F121',
                color: 'SLI',
                size: '40D'
            },
        
            '8902625001139': {
                itemName: 'F121',
                color: 'SLI',
                size: '40Z'
            },
        
            '8902625000583': {
                itemName: 'F122',
                color: 'BKC',
                size: '34C'
            },
        
            '8902625000590': {
                itemName: 'F122',
                color: 'BKC',
                size: '34D'
            },
        
            '8902625000606': {
                itemName: 'F122',
                color: 'BKC',
                size: '34F'
            },
        
            '8902625000613': {
                itemName: 'F122',
                color: 'BKC',
                size: '34Z'
            },
        
            '8902625000620': {
                itemName: 'F122',
                color: 'BKC',
                size: '36B'
            },
        
            '8902625000637': {
                itemName: 'F122',
                color: 'BKC',
                size: '36C'
            },
        
            '8902625000644': {
                itemName: 'F122',
                color: 'BKC',
                size: '36D'
            },
        
            '8902625000651': {
                itemName: 'F122',
                color: 'BKC',
                size: '36F'
            },
        
            '8902625000668': {
                itemName: 'F122',
                color: 'BKC',
                size: '36Z'
            },
        
            '8902625000675': {
                itemName: 'F122',
                color: 'BKC',
                size: '38B'
            },
        
            '8902625000682': {
                itemName: 'F122',
                color: 'BKC',
                size: '38C'
            },
        
            '8902625000699': {
                itemName: 'F122',
                color: 'BKC',
                size: '38D'
            },
        
            '8902625000705': {
                itemName: 'F122',
                color: 'BKC',
                size: '38F'
            },
        
            '8902625000712': {
                itemName: 'F122',
                color: 'BKC',
                size: '38Z'
            },
        
            '8902625000729': {
                itemName: 'F122',
                color: 'BKC',
                size: '40B'
            },
        
            '8902625000736': {
                itemName: 'F122',
                color: 'BKC',
                size: '40C'
            },
        
            '8902625000743': {
                itemName: 'F122',
                color: 'BKC',
                size: '40D'
            },
        
            '8902625000750': {
                itemName: 'F122',
                color: 'BKC',
                size: '40F'
            },
        
            '8902625000767': {
                itemName: 'F122',
                color: 'BKC',
                size: '40Z'
            },
        
            '8902625000774': {
                itemName: 'F122',
                color: 'RTE',
                size: '34C'
            },
        
            '8902625000781': {
                itemName: 'F122',
                color: 'RTE',
                size: '34D'
            },
        
            '8902625000804': {
                itemName: 'F122',
                color: 'RTE',
                size: '34F'
            },
        
            '8902625000811': {
                itemName: 'F122',
                color: 'RTE',
                size: '34Z'
            },
        
            '8902625000828': {
                itemName: 'F122',
                color: 'RTE',
                size: '36B'
            },
        
            '8902625000835': {
                itemName: 'F122',
                color: 'RTE',
                size: '36C'
            },
        
            '8902625000842': {
                itemName: 'F122',
                color: 'RTE',
                size: '36D'
            },
        
            '8902625000859': {
                itemName: 'F122',
                color: 'RTE',
                size: '36F'
            },
        
            '8902625000866': {
                itemName: 'F122',
                color: 'RTE',
                size: '36Z'
            },
        
            '8902625000873': {
                itemName: 'F122',
                color: 'RTE',
                size: '38B'
            },
        
            '8902625000880': {
                itemName: 'F122',
                color: 'RTE',
                size: '38C'
            },
        
            '8902625000897': {
                itemName: 'F122',
                color: 'RTE',
                size: '38D'
            },
        
            '8902625000903': {
                itemName: 'F122',
                color: 'RTE',
                size: '38F'
            },
        
            '8902625000910': {
                itemName: 'F122',
                color: 'RTE',
                size: '38Z'
            },
        
            '8902625000927': {
                itemName: 'F122',
                color: 'RTE',
                size: '40B'
            },
        
            '8902625000934': {
                itemName: 'F122',
                color: 'RTE',
                size: '40C'
            },
        
            '8902625000941': {
                itemName: 'F122',
                color: 'RTE',
                size: '40D'
            },
        
            '8902625000958': {
                itemName: 'F122',
                color: 'RTE',
                size: '40F'
            },
        
            '8902625000965': {
                itemName: 'F122',
                color: 'RTE',
                size: '40Z'
            },
        
            '8902625047090': {
                itemName: 'F123',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625047106': {
                itemName: 'F123',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625047113': {
                itemName: 'F123',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625047120': {
                itemName: 'F123',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625047137': {
                itemName: 'F123',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625047144': {
                itemName: 'F123',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625047151': {
                itemName: 'F123',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625049810': {
                itemName: 'F123',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625047175': {
                itemName: 'F123',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625049827': {
                itemName: 'F123',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625047199': {
                itemName: 'F123',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625049834': {
                itemName: 'F123',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625047212': {
                itemName: 'F123',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625049841': {
                itemName: 'F123',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625047236': {
                itemName: 'F123',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625049858': {
                itemName: 'F123',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625047250': {
                itemName: 'F123',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625046925': {
                itemName: 'F123',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625046932': {
                itemName: 'F123',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625046949': {
                itemName: 'F123',
                color: 'HOB',
                size: '32D'
            },
        
            '8902625046956': {
                itemName: 'F123',
                color: 'HOB',
                size: '32Z'
            },
        
            '8902625046963': {
                itemName: 'F123',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625046970': {
                itemName: 'F123',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625046987': {
                itemName: 'F123',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625046994': {
                itemName: 'F123',
                color: 'HOB',
                size: '34Z'
            },
        
            '8902625047007': {
                itemName: 'F123',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625047014': {
                itemName: 'F123',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625047021': {
                itemName: 'F123',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625047038': {
                itemName: 'F123',
                color: 'HOB',
                size: '36Z'
            },
        
            '8902625047045': {
                itemName: 'F123',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625047052': {
                itemName: 'F123',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625047069': {
                itemName: 'F123',
                color: 'HOB',
                size: '38D'
            },
        
            '8902625047076': {
                itemName: 'F123',
                color: 'HOB',
                size: '40B'
            },
        
            '8902625047083': {
                itemName: 'F123',
                color: 'HOB',
                size: '40C'
            },
        
            '8902625049865': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '32B'
            },
        
            '8902625047274': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '32C'
            },
        
            '8902625047281': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '32D'
            },
        
            '8902625047298': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '32Z'
            },
        
            '8902625047304': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '34B'
            },
        
            '8902625049872': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '34C'
            },
        
            '8902625047328': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '34D'
            },
        
            '8902625049889': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '34Z'
            },
        
            '8902625047342': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '36B'
            },
        
            '8902625049896': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '36C'
            },
        
            '8902625047366': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '36D'
            },
        
            '8902625049902': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '36Z'
            },
        
            '8902625047380': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '38B'
            },
        
            '8902625049919': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '38C'
            },
        
            '8902625047403': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '38D'
            },
        
            '8902625049926': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '40B'
            },
        
            '8902625047427': {
                itemName: 'F123',
                color: 'NSTLGR',
                size: '40C'
            },
        
            '8902625013965': {
                itemName: 'F124',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625013989': {
                itemName: 'F124',
                color: 'BLACK',
                size: '32F'
            },
        
            '8902625013996': {
                itemName: 'F124',
                color: 'BLACK',
                size: '32G'
            },
        
            '8902625013972': {
                itemName: 'F124',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625014009': {
                itemName: 'F124',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625014016': {
                itemName: 'F124',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625014030': {
                itemName: 'F124',
                color: 'BLACK',
                size: '34F'
            },
        
            '8902625014047': {
                itemName: 'F124',
                color: 'BLACK',
                size: '34G'
            },
        
            '8902625014023': {
                itemName: 'F124',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625014054': {
                itemName: 'F124',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625014061': {
                itemName: 'F124',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625014085': {
                itemName: 'F124',
                color: 'BLACK',
                size: '36F'
            },
        
            '8902625014092': {
                itemName: 'F124',
                color: 'BLACK',
                size: '36G'
            },
        
            '8902625014078': {
                itemName: 'F124',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625014108': {
                itemName: 'F124',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625014115': {
                itemName: 'F124',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625014139': {
                itemName: 'F124',
                color: 'BLACK',
                size: '38F'
            },
        
            '8902625014146': {
                itemName: 'F124',
                color: 'BLACK',
                size: '38G'
            },
        
            '8902625014122': {
                itemName: 'F124',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625014153': {
                itemName: 'F124',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625014160': {
                itemName: 'F124',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625014184': {
                itemName: 'F124',
                color: 'BLACK',
                size: '40F'
            },
        
            '8902625014177': {
                itemName: 'F124',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625014191': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '32D'
            },
        
            '8902625014214': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '32F'
            },
        
            '8902625014221': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '32G'
            },
        
            '8902625014207': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '32Z'
            },
        
            '8902625014238': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '34C'
            },
        
            '8902625014245': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '34D'
            },
        
            '8902625014269': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '34F'
            },
        
            '8902625014276': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '34G'
            },
        
            '8902625014252': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '34Z'
            },
        
            '8902625014283': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '36C'
            },
        
            '8902625014290': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '36D'
            },
        
            '8902625014313': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '36F'
            },
        
            '8902625014320': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '36G'
            },
        
            '8902625014306': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '36Z'
            },
        
            '8902625014337': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '38C'
            },
        
            '8902625014344': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '38D'
            },
        
            '8902625014368': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '38F'
            },
        
            '8902625014375': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '38G'
            },
        
            '8902625014351': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '38Z'
            },
        
            '8902625014382': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '40C'
            },
        
            '8902625014399': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '40D'
            },
        
            '8902625014412': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '40F'
            },
        
            '8902625014405': {
                itemName: 'F124',
                color: 'CEDWOD',
                size: '40Z'
            },
        
            '8902625015884': {
                itemName: 'F125',
                color: 'CEDWOD',
                size: 'L'
            },
        
            '8902625015877': {
                itemName: 'F125',
                color: 'CEDWOD',
                size: 'M'
            },
        
            '8902625015860': {
                itemName: 'F125',
                color: 'CEDWOD',
                size: 'S'
            },
        
            '8902625015891': {
                itemName: 'F125',
                color: 'CEDWOD',
                size: 'XL'
            },
        
            '8902625015921': {
                itemName: 'F125',
                color: 'NUGGET',
                size: 'L'
            },
        
            '8902625015914': {
                itemName: 'F125',
                color: 'NUGGET',
                size: 'M'
            },
        
            '8902625015907': {
                itemName: 'F125',
                color: 'NUGGET',
                size: 'S'
            },
        
            '8902625015938': {
                itemName: 'F125',
                color: 'NUGGET',
                size: 'XL'
            },
        
            '8902625014429': {
                itemName: 'F126',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625014443': {
                itemName: 'F126',
                color: 'BLACK',
                size: '32F'
            },
        
            '8902625014450': {
                itemName: 'F126',
                color: 'BLACK',
                size: '32G'
            },
        
            '8902625014436': {
                itemName: 'F126',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625014467': {
                itemName: 'F126',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625014474': {
                itemName: 'F126',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625014498': {
                itemName: 'F126',
                color: 'BLACK',
                size: '34F'
            },
        
            '8902625014504': {
                itemName: 'F126',
                color: 'BLACK',
                size: '34G'
            },
        
            '8902625014481': {
                itemName: 'F126',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625014511': {
                itemName: 'F126',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625014528': {
                itemName: 'F126',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625014542': {
                itemName: 'F126',
                color: 'BLACK',
                size: '36F'
            },
        
            '8902625014559': {
                itemName: 'F126',
                color: 'BLACK',
                size: '36G'
            },
        
            '8902625014535': {
                itemName: 'F126',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625014566': {
                itemName: 'F126',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625014573': {
                itemName: 'F126',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625014597': {
                itemName: 'F126',
                color: 'BLACK',
                size: '38F'
            },
        
            '8902625014603': {
                itemName: 'F126',
                color: 'BLACK',
                size: '38G'
            },
        
            '8902625014580': {
                itemName: 'F126',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625014610': {
                itemName: 'F126',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625014627': {
                itemName: 'F126',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625014641': {
                itemName: 'F126',
                color: 'BLACK',
                size: '40F'
            },
        
            '8902625014634': {
                itemName: 'F126',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625014658': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '32D'
            },
        
            '8902625014672': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '32F'
            },
        
            '8902625014689': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '32G'
            },
        
            '8902625014665': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '32Z'
            },
        
            '8902625014696': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '34C'
            },
        
            '8902625014702': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '34D'
            },
        
            '8902625014726': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '34F'
            },
        
            '8902625014733': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '34G'
            },
        
            '8902625014719': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '34Z'
            },
        
            '8902625014740': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '36C'
            },
        
            '8902625014757': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '36D'
            },
        
            '8902625014771': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '36F'
            },
        
            '8902625014788': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '36G'
            },
        
            '8902625014764': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '36Z'
            },
        
            '8902625014795': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '38C'
            },
        
            '8902625014801': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '38D'
            },
        
            '8902625014825': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '38F'
            },
        
            '8902625014832': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '38G'
            },
        
            '8902625014818': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '38Z'
            },
        
            '8902625014849': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '40C'
            },
        
            '8902625014856': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '40D'
            },
        
            '8902625014870': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '40F'
            },
        
            '8902625014863': {
                itemName: 'F126',
                color: 'CEDWOD',
                size: '40Z'
            },
        
            '8902625015266': {
                itemName: 'F127',
                color: 'OLT',
                size: '32B'
            },
        
            '8902625015273': {
                itemName: 'F127',
                color: 'OLT',
                size: '32C'
            },
        
            '8902625015280': {
                itemName: 'F127',
                color: 'OLT',
                size: '32D'
            },
        
            '8902625015297': {
                itemName: 'F127',
                color: 'OLT',
                size: '34B'
            },
        
            '8902625015303': {
                itemName: 'F127',
                color: 'OLT',
                size: '34C'
            },
        
            '8902625015310': {
                itemName: 'F127',
                color: 'OLT',
                size: '34D'
            },
        
            '8902625015327': {
                itemName: 'F127',
                color: 'OLT',
                size: '36B'
            },
        
            '8902625015334': {
                itemName: 'F127',
                color: 'OLT',
                size: '36C'
            },
        
            '8902625015341': {
                itemName: 'F127',
                color: 'OLT',
                size: '36D'
            },
        
            '8902625015358': {
                itemName: 'F127',
                color: 'OLT',
                size: '38B'
            },
        
            '8902625015365': {
                itemName: 'F127',
                color: 'OLT',
                size: '38C'
            },
        
            '8902625015372': {
                itemName: 'F127',
                color: 'SLI',
                size: '32B'
            },
        
            '8902625015389': {
                itemName: 'F127',
                color: 'SLI',
                size: '32C'
            },
        
            '8902625015396': {
                itemName: 'F127',
                color: 'SLI',
                size: '32D'
            },
        
            '8902625015402': {
                itemName: 'F127',
                color: 'SLI',
                size: '34B'
            },
        
            '8902625015419': {
                itemName: 'F127',
                color: 'SLI',
                size: '34C'
            },
        
            '8902625015426': {
                itemName: 'F127',
                color: 'SLI',
                size: '34D'
            },
        
            '8902625015433': {
                itemName: 'F127',
                color: 'SLI',
                size: '36B'
            },
        
            '8902625015440': {
                itemName: 'F127',
                color: 'SLI',
                size: '36C'
            },
        
            '8902625015457': {
                itemName: 'F127',
                color: 'SLI',
                size: '36D'
            },
        
            '8902625015464': {
                itemName: 'F127',
                color: 'SLI',
                size: '38B'
            },
        
            '8902625015471': {
                itemName: 'F127',
                color: 'SLI',
                size: '38C'
            },
        
            '8902625014962': {
                itemName: 'F129',
                color: 'COSKY',
                size: '32B'
            },
        
            '8902625014979': {
                itemName: 'F129',
                color: 'COSKY',
                size: '32C'
            },
        
            '8902625014986': {
                itemName: 'F129',
                color: 'COSKY',
                size: '32D'
            },
        
            '8902625014993': {
                itemName: 'F129',
                color: 'COSKY',
                size: '32Z'
            },
        
            '8902625015006': {
                itemName: 'F129',
                color: 'COSKY',
                size: '34B'
            },
        
            '8902625015013': {
                itemName: 'F129',
                color: 'COSKY',
                size: '34C'
            },
        
            '8902625015020': {
                itemName: 'F129',
                color: 'COSKY',
                size: '34D'
            },
        
            '8902625015037': {
                itemName: 'F129',
                color: 'COSKY',
                size: '34Z'
            },
        
            '8902625015044': {
                itemName: 'F129',
                color: 'COSKY',
                size: '36B'
            },
        
            '8902625015051': {
                itemName: 'F129',
                color: 'COSKY',
                size: '36C'
            },
        
            '8902625015068': {
                itemName: 'F129',
                color: 'COSKY',
                size: '36D'
            },
        
            '8902625015075': {
                itemName: 'F129',
                color: 'COSKY',
                size: '36Z'
            },
        
            '8902625015082': {
                itemName: 'F129',
                color: 'COSKY',
                size: '38B'
            },
        
            '8902625015099': {
                itemName: 'F129',
                color: 'COSKY',
                size: '38C'
            },
        
            '8902625015105': {
                itemName: 'F129',
                color: 'COSKY',
                size: '38D'
            },
        
            '8902625015112': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '32B'
            },
        
            '8902625015129': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '32C'
            },
        
            '8902625015136': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '32D'
            },
        
            '8902625015143': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '32Z'
            },
        
            '8902625015150': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '34B'
            },
        
            '8902625015167': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '34C'
            },
        
            '8902625015174': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '34D'
            },
        
            '8902625015181': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '34Z'
            },
        
            '8902625015198': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '36B'
            },
        
            '8902625015204': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '36C'
            },
        
            '8902625015211': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '36D'
            },
        
            '8902625015228': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '36Z'
            },
        
            '8902625015235': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '38B'
            },
        
            '8902625015242': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '38C'
            },
        
            '8902625015259': {
                itemName: 'F129',
                color: 'VIOQUA',
                size: '38D'
            },
        
            '8902625015648': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '32B'
            },
        
            '8902625015655': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '32C'
            },
        
            '8902625015662': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '32D'
            },
        
            '8902625015679': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '34B'
            },
        
            '8902625015686': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '34C'
            },
        
            '8902625015693': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '34D'
            },
        
            '8902625015709': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '36B'
            },
        
            '8902625015716': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '36C'
            },
        
            '8902625015730': {
                itemName: 'F130',
                color: 'CHBLPR',
                size: '38B'
            },
        
            '8902625015754': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '32B'
            },
        
            '8902625015761': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '32C'
            },
        
            '8902625015778': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '32D'
            },
        
            '8902625015785': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '34B'
            },
        
            '8902625015792': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '34C'
            },
        
            '8902625015808': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '34D'
            },
        
            '8902625015815': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '36B'
            },
        
            '8902625015822': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '36C'
            },
        
            '8902625015846': {
                itemName: 'F130',
                color: 'WISPRT',
                size: '38B'
            },
        
            '8902625035196': {
                itemName: 'F131',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625035202': {
                itemName: 'F131',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625035219': {
                itemName: 'F131',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625035226': {
                itemName: 'F131',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625035233': {
                itemName: 'F131',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625035240': {
                itemName: 'F131',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625035257': {
                itemName: 'F131',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625035264': {
                itemName: 'F131',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625035271': {
                itemName: 'F131',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625035288': {
                itemName: 'F131',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625035295': {
                itemName: 'F131',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625035301': {
                itemName: 'F131',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625035073': {
                itemName: 'F131',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625035080': {
                itemName: 'F131',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625035097': {
                itemName: 'F131',
                color: 'HOB',
                size: '32D'
            },
        
            '8902625035103': {
                itemName: 'F131',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625035110': {
                itemName: 'F131',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625035127': {
                itemName: 'F131',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625035134': {
                itemName: 'F131',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625035141': {
                itemName: 'F131',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625035158': {
                itemName: 'F131',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625035165': {
                itemName: 'F131',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625035172': {
                itemName: 'F131',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625035189': {
                itemName: 'F131',
                color: 'HOB',
                size: '38D'
            },
        
            '8902625035318': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '32B'
            },
        
            '8902625035325': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '32C'
            },
        
            '8902625035332': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '32D'
            },
        
            '8902625035349': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '34B'
            },
        
            '8902625035356': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '34C'
            },
        
            '8902625035363': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '34D'
            },
        
            '8902625035370': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '36B'
            },
        
            '8902625035387': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '36C'
            },
        
            '8902625035394': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '36D'
            },
        
            '8902625035400': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '38B'
            },
        
            '8902625035417': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '38C'
            },
        
            '8902625035424': {
                itemName: 'F131',
                color: 'NSTLGR',
                size: '38D'
            },
        
            '8902625035431': {
                itemName: 'F132',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625035448': {
                itemName: 'F132',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625035455': {
                itemName: 'F132',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625035462': {
                itemName: 'F132',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625035479': {
                itemName: 'F132',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625035486': {
                itemName: 'F132',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625035493': {
                itemName: 'F132',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625035509': {
                itemName: 'F132',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625035516': {
                itemName: 'F132',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625035523': {
                itemName: 'F132',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625035530': {
                itemName: 'F132',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625035547': {
                itemName: 'F132',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625035554': {
                itemName: 'F132',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625035561': {
                itemName: 'F132',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625035578': {
                itemName: 'F132',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625035585': {
                itemName: 'F132',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625035592': {
                itemName: 'F132',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625035608': {
                itemName: 'F132',
                color: 'HOB',
                size: '32D'
            },
        
            '8902625035615': {
                itemName: 'F132',
                color: 'HOB',
                size: '32Z'
            },
        
            '8902625035622': {
                itemName: 'F132',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625035639': {
                itemName: 'F132',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625035646': {
                itemName: 'F132',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625035653': {
                itemName: 'F132',
                color: 'HOB',
                size: '34Z'
            },
        
            '8902625035660': {
                itemName: 'F132',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625035677': {
                itemName: 'F132',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625035684': {
                itemName: 'F132',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625035691': {
                itemName: 'F132',
                color: 'HOB',
                size: '36Z'
            },
        
            '8902625035707': {
                itemName: 'F132',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625035714': {
                itemName: 'F132',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625035721': {
                itemName: 'F132',
                color: 'HOB',
                size: '38D'
            },
        
            '8902625035738': {
                itemName: 'F133',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625035745': {
                itemName: 'F133',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625035752': {
                itemName: 'F133',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625035769': {
                itemName: 'F133',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625035776': {
                itemName: 'F133',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625035783': {
                itemName: 'F133',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625035790': {
                itemName: 'F133',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625035806': {
                itemName: 'F133',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625035813': {
                itemName: 'F133',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625035820': {
                itemName: 'F133',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625035837': {
                itemName: 'F133',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625034854': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '32B'
            },
        
            '8902625034861': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '32C'
            },
        
            '8902625034878': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '32D'
            },
        
            '8902625034885': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '34B'
            },
        
            '8902625034892': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '34C'
            },
        
            '8902625034908': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '34D'
            },
        
            '8902625034915': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '36B'
            },
        
            '8902625034922': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '36C'
            },
        
            '8902625034939': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '36D'
            },
        
            '8902625034946': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '38B'
            },
        
            '8902625034953': {
                itemName: 'F134',
                color: 'HIBRED',
                size: '38C'
            },
        
            '8902625034960': {
                itemName: 'F134',
                color: 'OLT',
                size: '32B'
            },
        
            '8902625034977': {
                itemName: 'F134',
                color: 'OLT',
                size: '32C'
            },
        
            '8902625034984': {
                itemName: 'F134',
                color: 'OLT',
                size: '32D'
            },
        
            '8902625034991': {
                itemName: 'F134',
                color: 'OLT',
                size: '34B'
            },
        
            '8902625035004': {
                itemName: 'F134',
                color: 'OLT',
                size: '34C'
            },
        
            '8902625035011': {
                itemName: 'F134',
                color: 'OLT',
                size: '34D'
            },
        
            '8902625035028': {
                itemName: 'F134',
                color: 'OLT',
                size: '36B'
            },
        
            '8902625035035': {
                itemName: 'F134',
                color: 'OLT',
                size: '36C'
            },
        
            '8902625035042': {
                itemName: 'F134',
                color: 'OLT',
                size: '36D'
            },
        
            '8902625035059': {
                itemName: 'F134',
                color: 'OLT',
                size: '38B'
            },
        
            '8902625035066': {
                itemName: 'F134',
                color: 'OLT',
                size: '38C'
            },
        
            '8902625562104': {
                itemName: 'F135',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625562111': {
                itemName: 'F135',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625562128': {
                itemName: 'F135',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625562135': {
                itemName: 'F135',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625562142': {
                itemName: 'F135',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625562159': {
                itemName: 'F135',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625562166': {
                itemName: 'F135',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625562173': {
                itemName: 'F135',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625562180': {
                itemName: 'F135',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625562197': {
                itemName: 'F135',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625562203': {
                itemName: 'F135',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625562227': {
                itemName: 'F135',
                color: 'BOS',
                size: '34C'
            },
        
            '8902625562234': {
                itemName: 'F135',
                color: 'BOS',
                size: '34D'
            },
        
            '8902625562241': {
                itemName: 'F135',
                color: 'BOS',
                size: '34Z'
            },
        
            '8902625562258': {
                itemName: 'F135',
                color: 'BOS',
                size: '36B'
            },
        
            '8902625562265': {
                itemName: 'F135',
                color: 'BOS',
                size: '36C'
            },
        
            '8902625562272': {
                itemName: 'F135',
                color: 'BOS',
                size: '36D'
            },
        
            '8902625562289': {
                itemName: 'F135',
                color: 'BOS',
                size: '36Z'
            },
        
            '8902625562296': {
                itemName: 'F135',
                color: 'BOS',
                size: '38B'
            },
        
            '8902625562302': {
                itemName: 'F135',
                color: 'BOS',
                size: '38C'
            },
        
            '8902625562319': {
                itemName: 'F135',
                color: 'BOS',
                size: '38D'
            },
        
            '8902625562326': {
                itemName: 'F135',
                color: 'BOS',
                size: '38Z'
            },
        
            '8902625581747': {
                itemName: 'F135',
                color: 'BUFF',
                size: '34C'
            },
        
            '8902625581754': {
                itemName: 'F135',
                color: 'BUFF',
                size: '34D'
            },
        
            '8902625581761': {
                itemName: 'F135',
                color: 'BUFF',
                size: '34Z'
            },
        
            '8902625581778': {
                itemName: 'F135',
                color: 'BUFF',
                size: '36B'
            },
        
            '8902625581785': {
                itemName: 'F135',
                color: 'BUFF',
                size: '36C'
            },
        
            '8902625581792': {
                itemName: 'F135',
                color: 'BUFF',
                size: '36D'
            },
        
            '8902625581808': {
                itemName: 'F135',
                color: 'BUFF',
                size: '36Z'
            },
        
            '8902625581815': {
                itemName: 'F135',
                color: 'BUFF',
                size: '38B'
            },
        
            '8902625581822': {
                itemName: 'F135',
                color: 'BUFF',
                size: '38C'
            },
        
            '8902625581839': {
                itemName: 'F135',
                color: 'BUFF',
                size: '38D'
            },
        
            '8902625581846': {
                itemName: 'F135',
                color: 'BUFF',
                size: '38Z'
            },
        
            '8902625037626': {
                itemName: 'F137',
                color: 'LSBNBL',
                size: 'L'
            },
        
            '8902625037619': {
                itemName: 'F137',
                color: 'LSBNBL',
                size: 'M'
            },
        
            '8902625037602': {
                itemName: 'F137',
                color: 'LSBNBL',
                size: 'S'
            },
        
            '8902625037633': {
                itemName: 'F137',
                color: 'LSBNBL',
                size: 'XL'
            },
        
            '8902625037664': {
                itemName: 'F137',
                color: 'PSTLIL',
                size: 'L'
            },
        
            '8902625037657': {
                itemName: 'F137',
                color: 'PSTLIL',
                size: 'M'
            },
        
            '8902625037640': {
                itemName: 'F137',
                color: 'PSTLIL',
                size: 'S'
            },
        
            '8902625037671': {
                itemName: 'F137',
                color: 'PSTLIL',
                size: 'XL'
            },
        
            '8902625034526': {
                itemName: 'F138',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625034533': {
                itemName: 'F138',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625034540': {
                itemName: 'F138',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625034557': {
                itemName: 'F138',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625034564': {
                itemName: 'F138',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625034571': {
                itemName: 'F138',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625034588': {
                itemName: 'F138',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625034595': {
                itemName: 'F138',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625034601': {
                itemName: 'F138',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625034618': {
                itemName: 'F138',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625034625': {
                itemName: 'F138',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625034748': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '32B'
            },
        
            '8902625034755': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '32C'
            },
        
            '8902625034762': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '32D'
            },
        
            '8902625034779': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '34B'
            },
        
            '8902625034786': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '34C'
            },
        
            '8902625034793': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '34D'
            },
        
            '8902625034809': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '36B'
            },
        
            '8902625034816': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '36C'
            },
        
            '8902625034823': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '36D'
            },
        
            '8902625034830': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '38B'
            },
        
            '8902625034847': {
                itemName: 'F138',
                color: 'HIBRED',
                size: '38C'
            },
        
            '8902625034632': {
                itemName: 'F138',
                color: 'OLT',
                size: '32B'
            },
        
            '8902625034649': {
                itemName: 'F138',
                color: 'OLT',
                size: '32C'
            },
        
            '8902625034656': {
                itemName: 'F138',
                color: 'OLT',
                size: '32D'
            },
        
            '8902625034663': {
                itemName: 'F138',
                color: 'OLT',
                size: '34B'
            },
        
            '8902625034670': {
                itemName: 'F138',
                color: 'OLT',
                size: '34C'
            },
        
            '8902625034687': {
                itemName: 'F138',
                color: 'OLT',
                size: '34D'
            },
        
            '8902625034694': {
                itemName: 'F138',
                color: 'OLT',
                size: '36B'
            },
        
            '8902625034700': {
                itemName: 'F138',
                color: 'OLT',
                size: '36C'
            },
        
            '8902625034717': {
                itemName: 'F138',
                color: 'OLT',
                size: '36D'
            },
        
            '8902625034724': {
                itemName: 'F138',
                color: 'OLT',
                size: '38B'
            },
        
            '8902625034731': {
                itemName: 'F138',
                color: 'OLT',
                size: '38C'
            },
        
            '8902625045348': {
                itemName: 'F141',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625045355': {
                itemName: 'F141',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625045362': {
                itemName: 'F141',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625045379': {
                itemName: 'F141',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625045386': {
                itemName: 'F141',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625045393': {
                itemName: 'F141',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625045409': {
                itemName: 'F141',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625045416': {
                itemName: 'F141',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625045423': {
                itemName: 'F141',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625045430': {
                itemName: 'F141',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625045447': {
                itemName: 'F141',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625045461': {
                itemName: 'F141',
                color: 'HAURED',
                size: '32B'
            },
        
            '8902625045478': {
                itemName: 'F141',
                color: 'HAURED',
                size: '32C'
            },
        
            '8902625045485': {
                itemName: 'F141',
                color: 'HAURED',
                size: '32D'
            },
        
            '8902625045492': {
                itemName: 'F141',
                color: 'HAURED',
                size: '34B'
            },
        
            '8902625045508': {
                itemName: 'F141',
                color: 'HAURED',
                size: '34C'
            },
        
            '8902625045515': {
                itemName: 'F141',
                color: 'HAURED',
                size: '34D'
            },
        
            '8902625045522': {
                itemName: 'F141',
                color: 'HAURED',
                size: '36B'
            },
        
            '8902625045539': {
                itemName: 'F141',
                color: 'HAURED',
                size: '36C'
            },
        
            '8902625045546': {
                itemName: 'F141',
                color: 'HAURED',
                size: '36D'
            },
        
            '8902625045553': {
                itemName: 'F141',
                color: 'HAURED',
                size: '38B'
            },
        
            '8902625045560': {
                itemName: 'F141',
                color: 'HAURED',
                size: '38C'
            },
        
            '8902625045683': {
                itemName: 'F142',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625045676': {
                itemName: 'F142',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625045669': {
                itemName: 'F142',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625045690': {
                itemName: 'F142',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625045720': {
                itemName: 'F142',
                color: 'HAURED',
                size: 'L'
            },
        
            '8902625045713': {
                itemName: 'F142',
                color: 'HAURED',
                size: 'M'
            },
        
            '8902625045706': {
                itemName: 'F142',
                color: 'HAURED',
                size: 'S'
            },
        
            '8902625045737': {
                itemName: 'F142',
                color: 'HAURED',
                size: 'XL'
            },
        
            '8902625045829': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '32B'
            },
        
            '8902625045836': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '32C'
            },
        
            '8902625045843': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '32D'
            },
        
            '8902625045850': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '34B'
            },
        
            '8902625045867': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '34C'
            },
        
            '8902625045874': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '34D'
            },
        
            '8902625045881': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '36B'
            },
        
            '8902625045898': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '36C'
            },
        
            '8902625045904': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '36D'
            },
        
            '8902625045911': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '38B'
            },
        
            '8902625045928': {
                itemName: 'F143',
                color: 'MONGRY',
                size: '38C'
            },
        
            '8902625045935': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '32B'
            },
        
            '8902625045942': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '32C'
            },
        
            '8902625045959': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '32D'
            },
        
            '8902625045966': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '34B'
            },
        
            '8902625045973': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '34C'
            },
        
            '8902625045980': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '34D'
            },
        
            '8902625045997': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '36B'
            },
        
            '8902625046000': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '36C'
            },
        
            '8902625046017': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '36D'
            },
        
            '8902625046024': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '38B'
            },
        
            '8902625046031': {
                itemName: 'F143',
                color: 'NUDROS',
                size: '38C'
            },
        
            '8902625046208': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '32B'
            },
        
            '8902625046215': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '32C'
            },
        
            '8902625046222': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '32D'
            },
        
            '8902625046239': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '34B'
            },
        
            '8902625046246': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '34C'
            },
        
            '8902625046253': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '34D'
            },
        
            '8902625046260': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '36B'
            },
        
            '8902625046277': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '36C'
            },
        
            '8902625046284': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '36D'
            },
        
            '8902625046291': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '38B'
            },
        
            '8902625046307': {
                itemName: 'F144',
                color: 'MONGRY',
                size: '38C'
            },
        
            '8902625046314': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '32B'
            },
        
            '8902625046321': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '32C'
            },
        
            '8902625046338': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '32D'
            },
        
            '8902625046345': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '34B'
            },
        
            '8902625046352': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '34C'
            },
        
            '8902625046369': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '34D'
            },
        
            '8902625046376': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '36B'
            },
        
            '8902625046383': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '36C'
            },
        
            '8902625046390': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '36D'
            },
        
            '8902625046406': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '38B'
            },
        
            '8902625046413': {
                itemName: 'F144',
                color: 'NUDROS',
                size: '38C'
            },
        
            '8902625034052': {
                itemName: 'F165',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625034069': {
                itemName: 'F165',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625034076': {
                itemName: 'F165',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625034083': {
                itemName: 'F165',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625034090': {
                itemName: 'F165',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625034106': {
                itemName: 'F165',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625034113': {
                itemName: 'F165',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625034120': {
                itemName: 'F165',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625034137': {
                itemName: 'F165',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625034144': {
                itemName: 'F165',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625034151': {
                itemName: 'F165',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625607034': {
                itemName: 'F165',
                color: 'DNT',
                size: '32B'
            },
        
            '8902625607041': {
                itemName: 'F165',
                color: 'DNT',
                size: '32C'
            },
        
            '8902625607058': {
                itemName: 'F165',
                color: 'DNT',
                size: '32D'
            },
        
            '8902625607065': {
                itemName: 'F165',
                color: 'DNT',
                size: '34B'
            },
        
            '8902625607072': {
                itemName: 'F165',
                color: 'DNT',
                size: '34C'
            },
        
            '8902625607089': {
                itemName: 'F165',
                color: 'DNT',
                size: '34D'
            },
        
            '8902625607096': {
                itemName: 'F165',
                color: 'DNT',
                size: '36B'
            },
        
            '8902625607102': {
                itemName: 'F165',
                color: 'DNT',
                size: '36C'
            },
        
            '8902625607119': {
                itemName: 'F165',
                color: 'DNT',
                size: '36D'
            },
        
            '8902625607126': {
                itemName: 'F165',
                color: 'DNT',
                size: '38B'
            },
        
            '8902625607133': {
                itemName: 'F165',
                color: 'DNT',
                size: '38C'
            },
        
            '8902625606921': {
                itemName: 'F165',
                color: 'FVP',
                size: '32B'
            },
        
            '8902625606938': {
                itemName: 'F165',
                color: 'FVP',
                size: '32C'
            },
        
            '8902625606945': {
                itemName: 'F165',
                color: 'FVP',
                size: '32D'
            },
        
            '8902625606952': {
                itemName: 'F165',
                color: 'FVP',
                size: '34B'
            },
        
            '8902625606969': {
                itemName: 'F165',
                color: 'FVP',
                size: '34C'
            },
        
            '8902625606976': {
                itemName: 'F165',
                color: 'FVP',
                size: '34D'
            },
        
            '8902625606983': {
                itemName: 'F165',
                color: 'FVP',
                size: '36B'
            },
        
            '8902625606990': {
                itemName: 'F165',
                color: 'FVP',
                size: '36C'
            },
        
            '8902625607003': {
                itemName: 'F165',
                color: 'FVP',
                size: '36D'
            },
        
            '8902625607010': {
                itemName: 'F165',
                color: 'FVP',
                size: '38B'
            },
        
            '8902625607027': {
                itemName: 'F165',
                color: 'FVP',
                size: '38C'
            },
        
            '8902625607140': {
                itemName: 'F165',
                color: 'HOB',
                size: '32B'
            },
        
            '8902625607157': {
                itemName: 'F165',
                color: 'HOB',
                size: '32C'
            },
        
            '8902625607164': {
                itemName: 'F165',
                color: 'HOB',
                size: '32D'
            },
        
            '8902625607171': {
                itemName: 'F165',
                color: 'HOB',
                size: '34B'
            },
        
            '8902625607188': {
                itemName: 'F165',
                color: 'HOB',
                size: '34C'
            },
        
            '8902625607195': {
                itemName: 'F165',
                color: 'HOB',
                size: '34D'
            },
        
            '8902625607201': {
                itemName: 'F165',
                color: 'HOB',
                size: '36B'
            },
        
            '8902625607218': {
                itemName: 'F165',
                color: 'HOB',
                size: '36C'
            },
        
            '8902625607225': {
                itemName: 'F165',
                color: 'HOB',
                size: '36D'
            },
        
            '8902625607232': {
                itemName: 'F165',
                color: 'HOB',
                size: '38B'
            },
        
            '8902625607249': {
                itemName: 'F165',
                color: 'HOB',
                size: '38C'
            },
        
            '8902625033611': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '32B'
            },
        
            '8902625033628': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '32C'
            },
        
            '8902625033635': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '32D'
            },
        
            '8902625033642': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '34B'
            },
        
            '8902625033659': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '34C'
            },
        
            '8902625033666': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '34D'
            },
        
            '8902625033673': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '36B'
            },
        
            '8902625033680': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '36C'
            },
        
            '8902625033697': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '36D'
            },
        
            '8902625033703': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '38B'
            },
        
            '8902625033710': {
                itemName: 'F165',
                color: 'PCHCRL',
                size: '38C'
            },
        
            '8902625583963': {
                itemName: 'FB06',
                color: 'BKC',
                size: '34B'
            },
        
            '8902625583970': {
                itemName: 'FB06',
                color: 'BKC',
                size: '34C'
            },
        
            '8902625583987': {
                itemName: 'FB06',
                color: 'BKC',
                size: '34D'
            },
        
            '8902625583994': {
                itemName: 'FB06',
                color: 'BKC',
                size: '34Z'
            },
        
            '8902625584007': {
                itemName: 'FB06',
                color: 'BKC',
                size: '36B'
            },
        
            '8902625584014': {
                itemName: 'FB06',
                color: 'BKC',
                size: '36C'
            },
        
            '8902625584021': {
                itemName: 'FB06',
                color: 'BKC',
                size: '36D'
            },
        
            '8902625584038': {
                itemName: 'FB06',
                color: 'BKC',
                size: '36Z'
            },
        
            '8902625584045': {
                itemName: 'FB06',
                color: 'BKC',
                size: '38B'
            },
        
            '8902625584052': {
                itemName: 'FB06',
                color: 'BKC',
                size: '38C'
            },
        
            '8902625584069': {
                itemName: 'FB06',
                color: 'BKC',
                size: '38D'
            },
        
            '8902625584076': {
                itemName: 'FB06',
                color: 'BKC',
                size: '38Z'
            },
        
            '8902625584083': {
                itemName: 'FB06',
                color: 'BKC',
                size: '40B'
            },
        
            '8902625584090': {
                itemName: 'FB06',
                color: 'BKC',
                size: '40C'
            },
        
            '8902625584106': {
                itemName: 'FB06',
                color: 'BKC',
                size: '40D'
            },
        
            '8902625584113': {
                itemName: 'FB06',
                color: 'BKC',
                size: '40Z'
            },
        
            '8902625584120': {
                itemName: 'FB06',
                color: 'BKC',
                size: '42B'
            },
        
            '8902625584137': {
                itemName: 'FB06',
                color: 'BKC',
                size: '42C'
            },
        
            '8902625584144': {
                itemName: 'FB06',
                color: 'BKC',
                size: '42D'
            },
        
            '8902625584151': {
                itemName: 'FB06',
                color: 'BKC',
                size: '42Z'
            },
        
            '8902625563705': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625563712': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625563729': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625563736': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625563743': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625563750': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625563767': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625563774': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625563781': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625563798': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625563804': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625563811': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625563828': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625563835': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625563842': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625563859': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625563866': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '42B'
            },
        
            '8902625563873': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625563880': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625563897': {
                itemName: 'FB06',
                color: 'BLACK',
                size: '42Z'
            },
        
            '8902625550743': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '34B'
            },
        
            '8902625563903': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '34C'
            },
        
            '8902625563910': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '34D'
            },
        
            '8902625563927': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '34Z'
            },
        
            '8902625563934': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '36B'
            },
        
            '8902625563941': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '36C'
            },
        
            '8902625563958': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '36D'
            },
        
            '8902625563965': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '36Z'
            },
        
            '8902625563972': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '38B'
            },
        
            '8902625563989': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '38C'
            },
        
            '8902625563996': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '38D'
            },
        
            '8902625564009': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '38Z'
            },
        
            '8902625564016': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '40B'
            },
        
            '8902625564023': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '40C'
            },
        
            '8902625564030': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '40D'
            },
        
            '8902625564047': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '40Z'
            },
        
            '8902625564054': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '42B'
            },
        
            '8902625564061': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '42C'
            },
        
            '8902625564078': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '42D'
            },
        
            '8902625564085': {
                itemName: 'FB06',
                color: 'MASAI',
                size: '42Z'
            },
        
            '8902625564092': {
                itemName: 'FB06',
                color: 'PLS',
                size: '34B'
            },
        
            '8902625564108': {
                itemName: 'FB06',
                color: 'PLS',
                size: '34C'
            },
        
            '8902625564115': {
                itemName: 'FB06',
                color: 'PLS',
                size: '34D'
            },
        
            '8902625564122': {
                itemName: 'FB06',
                color: 'PLS',
                size: '34Z'
            },
        
            '8902625564139': {
                itemName: 'FB06',
                color: 'PLS',
                size: '36B'
            },
        
            '8902625564146': {
                itemName: 'FB06',
                color: 'PLS',
                size: '36C'
            },
        
            '8902625564153': {
                itemName: 'FB06',
                color: 'PLS',
                size: '36D'
            },
        
            '8902625564160': {
                itemName: 'FB06',
                color: 'PLS',
                size: '36Z'
            },
        
            '8902625564177': {
                itemName: 'FB06',
                color: 'PLS',
                size: '38B'
            },
        
            '8902625564184': {
                itemName: 'FB06',
                color: 'PLS',
                size: '38C'
            },
        
            '8902625564191': {
                itemName: 'FB06',
                color: 'PLS',
                size: '38D'
            },
        
            '8902625564207': {
                itemName: 'FB06',
                color: 'PLS',
                size: '38Z'
            },
        
            '8902625564214': {
                itemName: 'FB06',
                color: 'PLS',
                size: '40B'
            },
        
            '8902625564221': {
                itemName: 'FB06',
                color: 'PLS',
                size: '40C'
            },
        
            '8902625564238': {
                itemName: 'FB06',
                color: 'PLS',
                size: '40D'
            },
        
            '8902625564245': {
                itemName: 'FB06',
                color: 'PLS',
                size: '40Z'
            },
        
            '8902625564252': {
                itemName: 'FB06',
                color: 'PLS',
                size: '42B'
            },
        
            '8902625564269': {
                itemName: 'FB06',
                color: 'PLS',
                size: '42C'
            },
        
            '8902625564276': {
                itemName: 'FB06',
                color: 'PLS',
                size: '42D'
            },
        
            '8902625564283': {
                itemName: 'FB06',
                color: 'PLS',
                size: '42Z'
            },
        
            '8902625564498': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625564504': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625564511': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625564528': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '34Z'
            },
        
            '8902625564535': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625564542': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625564559': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625564566': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '36Z'
            },
        
            '8902625564573': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625564580': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625564597': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625564603': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '38Z'
            },
        
            '8902625564610': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '40B'
            },
        
            '8902625564627': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '40C'
            },
        
            '8902625564634': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '40D'
            },
        
            '8902625564641': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '40Z'
            },
        
            '8902625564658': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '42B'
            },
        
            '8902625564665': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '42C'
            },
        
            '8902625564672': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '42D'
            },
        
            '8902625564689': {
                itemName: 'FB06',
                color: 'WHITE',
                size: '42Z'
            },
        
            '8902625564696': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625564702': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625564719': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625564726': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625564733': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625564740': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625564757': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625564764': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625564771': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625564788': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625564795': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625564801': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '38Z'
            },
        
            '8902625564818': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '40B'
            },
        
            '8902625564825': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '40C'
            },
        
            '8902625564832': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '40D'
            },
        
            '8902625564849': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '40Z'
            },
        
            '8902625564856': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '42B'
            },
        
            '8902625564863': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '42C'
            },
        
            '8902625564870': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '42D'
            },
        
            '8902625564887': {
                itemName: 'FB12',
                color: 'BLACK',
                size: '42Z'
            },
        
            '8902625562661': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '34B'
            },
        
            '8902625562678': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '34C'
            },
        
            '8902625562685': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '34D'
            },
        
            '8902625562692': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '34Z'
            },
        
            '8902625562708': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '36B'
            },
        
            '8902625562715': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '36C'
            },
        
            '8902625562722': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '36D'
            },
        
            '8902625562739': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '36Z'
            },
        
            '8902625562746': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '38B'
            },
        
            '8902625562753': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '38C'
            },
        
            '8902625562760': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '38D'
            },
        
            '8902625562777': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '38Z'
            },
        
            '8902625562784': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '40B'
            },
        
            '8902625562791': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '40C'
            },
        
            '8902625562807': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '40D'
            },
        
            '8902625562814': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '40Z'
            },
        
            '8902625562821': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '42B'
            },
        
            '8902625562838': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '42C'
            },
        
            '8902625562845': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '42D'
            },
        
            '8902625562852': {
                itemName: 'FB12',
                color: 'BUFF',
                size: '42Z'
            },
        
            '8902625562869': {
                itemName: 'FB12',
                color: 'CLM',
                size: '34B'
            },
        
            '8902625562876': {
                itemName: 'FB12',
                color: 'CLM',
                size: '34C'
            },
        
            '8902625562883': {
                itemName: 'FB12',
                color: 'CLM',
                size: '34D'
            },
        
            '8902625562890': {
                itemName: 'FB12',
                color: 'CLM',
                size: '34Z'
            },
        
            '8902625562906': {
                itemName: 'FB12',
                color: 'CLM',
                size: '36B'
            },
        
            '8902625562913': {
                itemName: 'FB12',
                color: 'CLM',
                size: '36C'
            },
        
            '8902625562920': {
                itemName: 'FB12',
                color: 'CLM',
                size: '36D'
            },
        
            '8902625562937': {
                itemName: 'FB12',
                color: 'CLM',
                size: '36Z'
            },
        
            '8902625562944': {
                itemName: 'FB12',
                color: 'CLM',
                size: '38B'
            },
        
            '8902625562951': {
                itemName: 'FB12',
                color: 'CLM',
                size: '38C'
            },
        
            '8902625562968': {
                itemName: 'FB12',
                color: 'CLM',
                size: '38D'
            },
        
            '8902625562975': {
                itemName: 'FB12',
                color: 'CLM',
                size: '38Z'
            },
        
            '8902625562982': {
                itemName: 'FB12',
                color: 'CLM',
                size: '40B'
            },
        
            '8902625562999': {
                itemName: 'FB12',
                color: 'CLM',
                size: '40C'
            },
        
            '8902625563002': {
                itemName: 'FB12',
                color: 'CLM',
                size: '40D'
            },
        
            '8902625563019': {
                itemName: 'FB12',
                color: 'CLM',
                size: '40Z'
            },
        
            '8902625563026': {
                itemName: 'FB12',
                color: 'CLM',
                size: '42B'
            },
        
            '8902625563033': {
                itemName: 'FB12',
                color: 'CLM',
                size: '42C'
            },
        
            '8902625563040': {
                itemName: 'FB12',
                color: 'CLM',
                size: '42D'
            },
        
            '8902625563057': {
                itemName: 'FB12',
                color: 'CLM',
                size: '42Z'
            },
        
            '8902625581853': {
                itemName: 'FB12',
                color: 'ECL',
                size: '34B'
            },
        
            '8902625581860': {
                itemName: 'FB12',
                color: 'ECL',
                size: '34C'
            },
        
            '8902625581877': {
                itemName: 'FB12',
                color: 'ECL',
                size: '34D'
            },
        
            '8902625581884': {
                itemName: 'FB12',
                color: 'ECL',
                size: '34Z'
            },
        
            '8902625581891': {
                itemName: 'FB12',
                color: 'ECL',
                size: '36B'
            },
        
            '8902625581907': {
                itemName: 'FB12',
                color: 'ECL',
                size: '36C'
            },
        
            '8902625581914': {
                itemName: 'FB12',
                color: 'ECL',
                size: '36D'
            },
        
            '8902625581921': {
                itemName: 'FB12',
                color: 'ECL',
                size: '36Z'
            },
        
            '8902625581938': {
                itemName: 'FB12',
                color: 'ECL',
                size: '38B'
            },
        
            '8902625581945': {
                itemName: 'FB12',
                color: 'ECL',
                size: '38C'
            },
        
            '8902625581952': {
                itemName: 'FB12',
                color: 'ECL',
                size: '38D'
            },
        
            '8902625581969': {
                itemName: 'FB12',
                color: 'ECL',
                size: '38Z'
            },
        
            '8902625581976': {
                itemName: 'FB12',
                color: 'ECL',
                size: '40B'
            },
        
            '8902625581983': {
                itemName: 'FB12',
                color: 'ECL',
                size: '40C'
            },
        
            '8902625581990': {
                itemName: 'FB12',
                color: 'ECL',
                size: '40D'
            },
        
            '8902625582003': {
                itemName: 'FB12',
                color: 'ECL',
                size: '40Z'
            },
        
            '8902625582010': {
                itemName: 'FB12',
                color: 'ECL',
                size: '42B'
            },
        
            '8902625582027': {
                itemName: 'FB12',
                color: 'ECL',
                size: '42C'
            },
        
            '8902625582034': {
                itemName: 'FB12',
                color: 'ECL',
                size: '42D'
            },
        
            '8902625582041': {
                itemName: 'FB12',
                color: 'ECL',
                size: '42Z'
            },
        
            '8902625563064': {
                itemName: 'FB12',
                color: 'GRW',
                size: '34B'
            },
        
            '8902625563071': {
                itemName: 'FB12',
                color: 'GRW',
                size: '34C'
            },
        
            '8902625563088': {
                itemName: 'FB12',
                color: 'GRW',
                size: '34D'
            },
        
            '8902625563095': {
                itemName: 'FB12',
                color: 'GRW',
                size: '34Z'
            },
        
            '8902625563101': {
                itemName: 'FB12',
                color: 'GRW',
                size: '36B'
            },
        
            '8902625563118': {
                itemName: 'FB12',
                color: 'GRW',
                size: '36C'
            },
        
            '8902625563125': {
                itemName: 'FB12',
                color: 'GRW',
                size: '36D'
            },
        
            '8902625563132': {
                itemName: 'FB12',
                color: 'GRW',
                size: '36Z'
            },
        
            '8902625563149': {
                itemName: 'FB12',
                color: 'GRW',
                size: '38B'
            },
        
            '8902625563156': {
                itemName: 'FB12',
                color: 'GRW',
                size: '38C'
            },
        
            '8902625563163': {
                itemName: 'FB12',
                color: 'GRW',
                size: '38D'
            },
        
            '8902625563170': {
                itemName: 'FB12',
                color: 'GRW',
                size: '38Z'
            },
        
            '8902625563187': {
                itemName: 'FB12',
                color: 'GRW',
                size: '40B'
            },
        
            '8902625563194': {
                itemName: 'FB12',
                color: 'GRW',
                size: '40C'
            },
        
            '8902625563200': {
                itemName: 'FB12',
                color: 'GRW',
                size: '40D'
            },
        
            '8902625563217': {
                itemName: 'FB12',
                color: 'GRW',
                size: '40Z'
            },
        
            '8902625563224': {
                itemName: 'FB12',
                color: 'GRW',
                size: '42B'
            },
        
            '8902625563231': {
                itemName: 'FB12',
                color: 'GRW',
                size: '42C'
            },
        
            '8902625563248': {
                itemName: 'FB12',
                color: 'GRW',
                size: '42D'
            },
        
            '8902625563255': {
                itemName: 'FB12',
                color: 'GRW',
                size: '42Z'
            },
        
            '8902625563262': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '34B'
            },
        
            '8902625563279': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '34C'
            },
        
            '8902625563286': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '34D'
            },
        
            '8902625563293': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '34Z'
            },
        
            '8902625563309': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '36B'
            },
        
            '8902625563316': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '36C'
            },
        
            '8902625563323': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '36D'
            },
        
            '8902625563330': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '36Z'
            },
        
            '8902625563347': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '38B'
            },
        
            '8902625563354': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '38C'
            },
        
            '8902625563361': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '38D'
            },
        
            '8902625563378': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '38Z'
            },
        
            '8902625563385': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '40B'
            },
        
            '8902625563392': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '40C'
            },
        
            '8902625563408': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '40D'
            },
        
            '8902625563415': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '40Z'
            },
        
            '8902625563422': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '42B'
            },
        
            '8902625563439': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '42C'
            },
        
            '8902625563446': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '42D'
            },
        
            '8902625563453': {
                itemName: 'FB12',
                color: 'MASAI',
                size: '42Z'
            },
        
            '8902625564894': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '34B'
            },
        
            '8902625564900': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '34C'
            },
        
            '8902625564917': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '34D'
            },
        
            '8902625564924': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '34Z'
            },
        
            '8902625564931': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '36B'
            },
        
            '8902625564948': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '36C'
            },
        
            '8902625564955': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '36D'
            },
        
            '8902625564962': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '36Z'
            },
        
            '8902625564979': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '38B'
            },
        
            '8902625564986': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '38C'
            },
        
            '8902625564993': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '38D'
            },
        
            '8902625565006': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '38Z'
            },
        
            '8902625565013': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '40B'
            },
        
            '8902625565020': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '40C'
            },
        
            '8902625565037': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '40D'
            },
        
            '8902625565044': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '40Z'
            },
        
            '8902625565051': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '42B'
            },
        
            '8902625565068': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '42C'
            },
        
            '8902625565075': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '42D'
            },
        
            '8902625565082': {
                itemName: 'FB12',
                color: 'WHITE',
                size: '42Z'
            },
        
            '8902625000200': {
                itemName: 'N116',
                color: 'BKC',
                size: 'L'
            },
        
            '8902625000217': {
                itemName: 'N116',
                color: 'BKC',
                size: 'M'
            },
        
            '8902625000224': {
                itemName: 'N116',
                color: 'BKC',
                size: 'S'
            },
        
            '8902625000231': {
                itemName: 'N116',
                color: 'BKC',
                size: 'XL'
            },
        
            '8902625000507': {
                itemName: 'N118',
                color: 'DSR',
                size: 'L'
            },
        
            '8902625000514': {
                itemName: 'N118',
                color: 'DSR',
                size: 'M'
            },
        
            '8902625000521': {
                itemName: 'N118',
                color: 'DSR',
                size: 'S'
            },
        
            '8902625000538': {
                itemName: 'N118',
                color: 'DSR',
                size: 'XL'
            },
        
            '8902625000545': {
                itemName: 'N118',
                color: 'VLTTLP',
                size: 'L'
            },
        
            '8902625000552': {
                itemName: 'N118',
                color: 'VLTTLP',
                size: 'M'
            },
        
            '8902625000569': {
                itemName: 'N118',
                color: 'VLTTLP',
                size: 'S'
            },
        
            '8902625000576': {
                itemName: 'N118',
                color: 'VLTTLP',
                size: 'XL'
            },
        
            '8902625016041': {
                itemName: 'N125',
                color: 'CEDWOD',
                size: 'L'
            },
        
            '8902625016034': {
                itemName: 'N125',
                color: 'CEDWOD',
                size: 'M'
            },
        
            '8902625016027': {
                itemName: 'N125',
                color: 'CEDWOD',
                size: 'S'
            },
        
            '8902625016058': {
                itemName: 'N125',
                color: 'CEDWOD',
                size: 'XL'
            },
        
            '8902625016089': {
                itemName: 'N125',
                color: 'NUGGET',
                size: 'L'
            },
        
            '8902625016072': {
                itemName: 'N125',
                color: 'NUGGET',
                size: 'M'
            },
        
            '8902625016065': {
                itemName: 'N125',
                color: 'NUGGET',
                size: 'S'
            },
        
            '8902625016096': {
                itemName: 'N125',
                color: 'NUGGET',
                size: 'XL'
            },
        
            '8902625015587': {
                itemName: 'N127',
                color: 'OLT',
                size: 'L'
            },
        
            '8902625015570': {
                itemName: 'N127',
                color: 'OLT',
                size: 'M'
            },
        
            '8902625015563': {
                itemName: 'N127',
                color: 'OLT',
                size: 'S'
            },
        
            '8902625015594': {
                itemName: 'N127',
                color: 'OLT',
                size: 'XL'
            },
        
            '8902625015624': {
                itemName: 'N127',
                color: 'SLI',
                size: 'L'
            },
        
            '8902625015617': {
                itemName: 'N127',
                color: 'SLI',
                size: 'M'
            },
        
            '8902625015600': {
                itemName: 'N127',
                color: 'SLI',
                size: 'S'
            },
        
            '8902625015631': {
                itemName: 'N127',
                color: 'SLI',
                size: 'XL'
            },
        
            '8902625036216': {
                itemName: 'N138',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625036209': {
                itemName: 'N138',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625036193': {
                itemName: 'N138',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625036223': {
                itemName: 'N138',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625036254': {
                itemName: 'N138',
                color: 'HIBRED',
                size: 'L'
            },
        
            '8902625036247': {
                itemName: 'N138',
                color: 'HIBRED',
                size: 'M'
            },
        
            '8902625036230': {
                itemName: 'N138',
                color: 'HIBRED',
                size: 'S'
            },
        
            '8902625036261': {
                itemName: 'N138',
                color: 'HIBRED',
                size: 'XL'
            },
        
            '8902625046147': {
                itemName: 'N143',
                color: 'MONGRY',
                size: 'L'
            },
        
            '8902625046130': {
                itemName: 'N143',
                color: 'MONGRY',
                size: 'M'
            },
        
            '8902625046123': {
                itemName: 'N143',
                color: 'MONGRY',
                size: 'S'
            },
        
            '8902625046154': {
                itemName: 'N143',
                color: 'MONGRY',
                size: 'XL'
            },
        
            '8902625046185': {
                itemName: 'N143',
                color: 'NUDROS',
                size: 'L'
            },
        
            '8902625046178': {
                itemName: 'N143',
                color: 'NUDROS',
                size: 'M'
            },
        
            '8902625046161': {
                itemName: 'N143',
                color: 'NUDROS',
                size: 'S'
            },
        
            '8902625046192': {
                itemName: 'N143',
                color: 'NUDROS',
                size: 'XL'
            },
        
            '8902625610737': {
                itemName: 'P000',
                color: 'ARO',
                size: '2XL'
            },
        
            '8902625609182': {
                itemName: 'P000',
                color: 'ARO',
                size: 'L'
            },
        
            '8902625609199': {
                itemName: 'P000',
                color: 'ARO',
                size: 'M'
            },
        
            '8902625609205': {
                itemName: 'P000',
                color: 'ARO',
                size: 'S'
            },
        
            '8902625609212': {
                itemName: 'P000',
                color: 'ARO',
                size: 'XL'
            },
        
            '8902625549549': {
                itemName: 'P000',
                color: 'AUM',
                size: '2XL'
            },
        
            '8902625549501': {
                itemName: 'P000',
                color: 'AUM',
                size: 'L'
            },
        
            '8902625549518': {
                itemName: 'P000',
                color: 'AUM',
                size: 'M'
            },
        
            '8902625549525': {
                itemName: 'P000',
                color: 'AUM',
                size: 'S'
            },
        
            '8902625549532': {
                itemName: 'P000',
                color: 'AUM',
                size: 'XL'
            },
        
            '8902625549747': {
                itemName: 'P000',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625549709': {
                itemName: 'P000',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625549716': {
                itemName: 'P000',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625549723': {
                itemName: 'P000',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625036520': {
                itemName: 'P000',
                color: 'FRHPRT',
                size: '2XL'
            },
        
            '8902625036506': {
                itemName: 'P000',
                color: 'FRHPRT',
                size: 'L'
            },
        
            '8902625036490': {
                itemName: 'P000',
                color: 'FRHPRT',
                size: 'M'
            },
        
            '8902625036483': {
                itemName: 'P000',
                color: 'FRHPRT',
                size: 'S'
            },
        
            '8902625036513': {
                itemName: 'P000',
                color: 'FRHPRT',
                size: 'XL'
            },
        
            '8902625827678': {
                itemName: 'P000',
                color: 'GRNTR',
                size: '2XL'
            },
        
            '8902625827630': {
                itemName: 'P000',
                color: 'GRNTR',
                size: 'L'
            },
        
            '8902625827647': {
                itemName: 'P000',
                color: 'GRNTR',
                size: 'M'
            },
        
            '8902625827654': {
                itemName: 'P000',
                color: 'GRNTR',
                size: 'S'
            },
        
            '8902625827661': {
                itemName: 'P000',
                color: 'GRNTR',
                size: 'XL'
            },
        
            '8902625827685': {
                itemName: 'P000',
                color: 'MNBLU',
                size: 'L'
            },
        
            '8902625827692': {
                itemName: 'P000',
                color: 'MNBLU',
                size: 'M'
            },
        
            '8902625827708': {
                itemName: 'P000',
                color: 'MNBLU',
                size: 'S'
            },
        
            '8902625827715': {
                itemName: 'P000',
                color: 'MNBLU',
                size: 'XL'
            },
        
            '8902625549693': {
                itemName: 'P000',
                color: 'PWL',
                size: '2XL'
            },
        
            '8902625549655': {
                itemName: 'P000',
                color: 'PWL',
                size: 'L'
            },
        
            '8902625549662': {
                itemName: 'P000',
                color: 'PWL',
                size: 'M'
            },
        
            '8902625549679': {
                itemName: 'P000',
                color: 'PWL',
                size: 'S'
            },
        
            '8902625549686': {
                itemName: 'P000',
                color: 'PWL',
                size: 'XL'
            },
        
            '8902625549457': {
                itemName: 'P000',
                color: 'SIL',
                size: '2XL'
            },
        
            '8902625549419': {
                itemName: 'P000',
                color: 'SIL',
                size: 'L'
            },
        
            '8902625549426': {
                itemName: 'P000',
                color: 'SIL',
                size: 'M'
            },
        
            '8902625549433': {
                itemName: 'P000',
                color: 'SIL',
                size: 'S'
            },
        
            '8902625549440': {
                itemName: 'P000',
                color: 'SIL',
                size: 'XL'
            },
        
            '8902625610744': {
                itemName: 'P000',
                color: 'SOR',
                size: '2XL'
            },
        
            '8902625609236': {
                itemName: 'P000',
                color: 'SOR',
                size: 'L'
            },
        
            '8902625609243': {
                itemName: 'P000',
                color: 'SOR',
                size: 'M'
            },
        
            '8902625609250': {
                itemName: 'P000',
                color: 'SOR',
                size: 'S'
            },
        
            '8902625609267': {
                itemName: 'P000',
                color: 'SOR',
                size: 'XL'
            },
        
            '8902625549808': {
                itemName: 'P000',
                color: 'WFM',
                size: 'L'
            },
        
            '8902625549815': {
                itemName: 'P000',
                color: 'WFM',
                size: 'M'
            },
        
            '8902625549822': {
                itemName: 'P000',
                color: 'WFM',
                size: 'S'
            },
        
            '8902625549839': {
                itemName: 'P000',
                color: 'WFM',
                size: 'XL'
            },
        
            '8902625037787': {
                itemName: 'P037',
                color: 'ALS',
                size: 'L'
            },
        
            '8902625037770': {
                itemName: 'P037',
                color: 'ALS',
                size: 'M'
            },
        
            '8902625037763': {
                itemName: 'P037',
                color: 'ALS',
                size: 'S'
            },
        
            '8902625037794': {
                itemName: 'P037',
                color: 'ALS',
                size: 'XL'
            },
        
            '8902625037701': {
                itemName: 'P037',
                color: 'LSBNBL',
                size: 'L'
            },
        
            '8902625037695': {
                itemName: 'P037',
                color: 'LSBNBL',
                size: 'M'
            },
        
            '8902625037688': {
                itemName: 'P037',
                color: 'LSBNBL',
                size: 'S'
            },
        
            '8902625037718': {
                itemName: 'P037',
                color: 'LSBNBL',
                size: 'XL'
            },
        
            '8902625037749': {
                itemName: 'P037',
                color: 'PSTLIL',
                size: 'L'
            },
        
            '8902625037732': {
                itemName: 'P037',
                color: 'PSTLIL',
                size: 'M'
            },
        
            '8902625037725': {
                itemName: 'P037',
                color: 'PSTLIL',
                size: 'S'
            },
        
            '8902625037756': {
                itemName: 'P037',
                color: 'PSTLIL',
                size: 'XL'
            },
        
            '8902625594600': {
                itemName: 'P040',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625594617': {
                itemName: 'P040',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625594624': {
                itemName: 'P040',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625594631': {
                itemName: 'P040',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625594648': {
                itemName: 'P040',
                color: 'CRMRD',
                size: 'L'
            },
        
            '8902625594655': {
                itemName: 'P040',
                color: 'CRMRD',
                size: 'M'
            },
        
            '8902625594662': {
                itemName: 'P040',
                color: 'CRMRD',
                size: 'S'
            },
        
            '8902625594679': {
                itemName: 'P040',
                color: 'CRMRD',
                size: 'XL'
            },
        
            '8902625525079': {
                itemName: 'P043',
                color: 'BUTSCO',
                size: 'L'
            },
        
            '8902625525086': {
                itemName: 'P043',
                color: 'BUTSCO',
                size: 'M'
            },
        
            '8902625525093': {
                itemName: 'P043',
                color: 'BUTSCO',
                size: 'S'
            },
        
            '8902625525109': {
                itemName: 'P043',
                color: 'BUTSCO',
                size: 'XL'
            },
        
            '8902625525031': {
                itemName: 'P043',
                color: 'CTM',
                size: 'L'
            },
        
            '8902625525048': {
                itemName: 'P043',
                color: 'CTM',
                size: 'M'
            },
        
            '8902625525055': {
                itemName: 'P043',
                color: 'CTM',
                size: 'S'
            },
        
            '8902625525062': {
                itemName: 'P043',
                color: 'CTM',
                size: 'XL'
            },
        
            '8902625594723': {
                itemName: 'P087',
                color: 'CON',
                size: '2XL'
            },
        
            '8902625594686': {
                itemName: 'P087',
                color: 'CON',
                size: 'L'
            },
        
            '8902625594693': {
                itemName: 'P087',
                color: 'CON',
                size: 'M'
            },
        
            '8902625594709': {
                itemName: 'P087',
                color: 'CON',
                size: 'S'
            },
        
            '8902625594716': {
                itemName: 'P087',
                color: 'CON',
                size: 'XL'
            },
        
            '8902625594839': {
                itemName: 'P087',
                color: 'SLI',
                size: 'L'
            },
        
            '8902625594846': {
                itemName: 'P087',
                color: 'SLI',
                size: 'M'
            },
        
            '8902625594853': {
                itemName: 'P087',
                color: 'SLI',
                size: 'S'
            },
        
            '8902625594860': {
                itemName: 'P087',
                color: 'SLI',
                size: 'XL'
            },
        
            '8902625827777': {
                itemName: 'P091',
                color: 'FRVRR',
                size: '2XL'
            },
        
            '8902625827739': {
                itemName: 'P091',
                color: 'FRVRR',
                size: 'L'
            },
        
            '8902625827746': {
                itemName: 'P091',
                color: 'FRVRR',
                size: 'M'
            },
        
            '8902625827753': {
                itemName: 'P091',
                color: 'FRVRR',
                size: 'S'
            },
        
            '8902625827760': {
                itemName: 'P091',
                color: 'FRVRR',
                size: 'XL'
            },
        
            '8902625550033': {
                itemName: 'P091',
                color: 'LBLU',
                size: '2XL'
            },
        
            '8902625549990': {
                itemName: 'P091',
                color: 'LBLU',
                size: 'L'
            },
        
            '8902625550002': {
                itemName: 'P091',
                color: 'LBLU',
                size: 'M'
            },
        
            '8902625550019': {
                itemName: 'P091',
                color: 'LBLU',
                size: 'S'
            },
        
            '8902625550026': {
                itemName: 'P091',
                color: 'LBLU',
                size: 'XL'
            },
        
            '8902625549938': {
                itemName: 'P091',
                color: 'PLUM',
                size: '2XL'
            },
        
            '8902625549891': {
                itemName: 'P091',
                color: 'PLUM',
                size: 'L'
            },
        
            '8902625549907': {
                itemName: 'P091',
                color: 'PLUM',
                size: 'M'
            },
        
            '8902625549914': {
                itemName: 'P091',
                color: 'PLUM',
                size: 'S'
            },
        
            '8902625549921': {
                itemName: 'P091',
                color: 'PLUM',
                size: 'XL'
            },
        
            '8902625827425': {
                itemName: 'P108',
                color: 'AQGRY',
                size: 'L'
            },
        
            '8902625827432': {
                itemName: 'P108',
                color: 'AQGRY',
                size: 'M'
            },
        
            '8902625827449': {
                itemName: 'P108',
                color: 'AQGRY',
                size: 'S'
            },
        
            '8902625827456': {
                itemName: 'P108',
                color: 'AQGRY',
                size: 'XL'
            },
        
            '8902625827463': {
                itemName: 'P108',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625827470': {
                itemName: 'P108',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625827487': {
                itemName: 'P108',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625827494': {
                itemName: 'P108',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625827500': {
                itemName: 'P108',
                color: 'RTE',
                size: 'L'
            },
        
            '8902625827517': {
                itemName: 'P108',
                color: 'RTE',
                size: 'M'
            },
        
            '8902625827524': {
                itemName: 'P108',
                color: 'RTE',
                size: 'S'
            },
        
            '8902625827531': {
                itemName: 'P108',
                color: 'RTE',
                size: 'XL'
            },
        
            '8902625827548': {
                itemName: 'P109',
                color: 'AQGRY',
                size: 'L'
            },
        
            '8902625827555': {
                itemName: 'P109',
                color: 'AQGRY',
                size: 'M'
            },
        
            '8902625827562': {
                itemName: 'P109',
                color: 'AQGRY',
                size: 'S'
            },
        
            '8902625827579': {
                itemName: 'P109',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625827586': {
                itemName: 'P109',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625827593': {
                itemName: 'P109',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625827609': {
                itemName: 'P109',
                color: 'RTE',
                size: 'L'
            },
        
            '8902625827616': {
                itemName: 'P109',
                color: 'RTE',
                size: 'M'
            },
        
            '8902625827623': {
                itemName: 'P109',
                color: 'RTE',
                size: 'S'
            },
        
            '8902625832245': {
                itemName: 'P112',
                color: 'PURPLE',
                size: '2XL'
            },
        
            '8902625832207': {
                itemName: 'P112',
                color: 'PURPLE',
                size: 'L'
            },
        
            '8902625832214': {
                itemName: 'P112',
                color: 'PURPLE',
                size: 'M'
            },
        
            '8902625832221': {
                itemName: 'P112',
                color: 'PURPLE',
                size: 'S'
            },
        
            '8902625832238': {
                itemName: 'P112',
                color: 'PURPLE',
                size: 'XL'
            },
        
            '8902625832290': {
                itemName: 'P112',
                color: 'SCRED',
                size: '2XL'
            },
        
            '8902625832252': {
                itemName: 'P112',
                color: 'SCRED',
                size: 'L'
            },
        
            '8902625832269': {
                itemName: 'P112',
                color: 'SCRED',
                size: 'M'
            },
        
            '8902625832276': {
                itemName: 'P112',
                color: 'SCRED',
                size: 'S'
            },
        
            '8902625832283': {
                itemName: 'P112',
                color: 'SCRED',
                size: 'XL'
            },
        
            '8902625832306': {
                itemName: 'P113',
                color: 'PURPLE',
                size: 'L'
            },
        
            '8902625832313': {
                itemName: 'P113',
                color: 'PURPLE',
                size: 'M'
            },
        
            '8902625832320': {
                itemName: 'P113',
                color: 'PURPLE',
                size: 'S'
            },
        
            '8902625832337': {
                itemName: 'P113',
                color: 'PURPLE',
                size: 'XL'
            },
        
            '8902625832344': {
                itemName: 'P113',
                color: 'SCRED',
                size: 'L'
            },
        
            '8902625832351': {
                itemName: 'P113',
                color: 'SCRED',
                size: 'M'
            },
        
            '8902625832368': {
                itemName: 'P113',
                color: 'SCRED',
                size: 'S'
            },
        
            '8902625832375': {
                itemName: 'P113',
                color: 'SCRED',
                size: 'XL'
            },
        
            '8902625002488': {
                itemName: 'P116',
                color: 'BKC',
                size: '2XL'
            },
        
            '8902625002440': {
                itemName: 'P116',
                color: 'BKC',
                size: 'L'
            },
        
            '8902625002457': {
                itemName: 'P116',
                color: 'BKC',
                size: 'M'
            },
        
            '8902625002464': {
                itemName: 'P116',
                color: 'BKC',
                size: 'S'
            },
        
            '8902625002471': {
                itemName: 'P116',
                color: 'BKC',
                size: 'XL'
            },
        
            '8902625002532': {
                itemName: 'P116',
                color: 'DSR',
                size: '2XL'
            },
        
            '8902625002495': {
                itemName: 'P116',
                color: 'DSR',
                size: 'L'
            },
        
            '8902625002501': {
                itemName: 'P116',
                color: 'DSR',
                size: 'M'
            },
        
            '8902625002518': {
                itemName: 'P116',
                color: 'DSR',
                size: 'S'
            },
        
            '8902625002525': {
                itemName: 'P116',
                color: 'DSR',
                size: 'XL'
            },
        
            '8902625002549': {
                itemName: 'P118',
                color: 'DSR',
                size: 'L'
            },
        
            '8902625002556': {
                itemName: 'P118',
                color: 'DSR',
                size: 'M'
            },
        
            '8902625002563': {
                itemName: 'P118',
                color: 'DSR',
                size: 'S'
            },
        
            '8902625002570': {
                itemName: 'P118',
                color: 'DSR',
                size: 'XL'
            },
        
            '8902625002587': {
                itemName: 'P118',
                color: 'VLTTLP',
                size: 'L'
            },
        
            '8902625002594': {
                itemName: 'P118',
                color: 'VLTTLP',
                size: 'M'
            },
        
            '8902625002600': {
                itemName: 'P118',
                color: 'VLTTLP',
                size: 'S'
            },
        
            '8902625002617': {
                itemName: 'P118',
                color: 'VLTTLP',
                size: 'XL'
            },
        
            '8902625002662': {
                itemName: 'P122',
                color: 'BKC',
                size: '2XL'
            },
        
            '8902625002624': {
                itemName: 'P122',
                color: 'BKC',
                size: 'L'
            },
        
            '8902625002631': {
                itemName: 'P122',
                color: 'BKC',
                size: 'M'
            },
        
            '8902625002648': {
                itemName: 'P122',
                color: 'BKC',
                size: 'S'
            },
        
            '8902625002655': {
                itemName: 'P122',
                color: 'BKC',
                size: 'XL'
            },
        
            '8902625002716': {
                itemName: 'P122',
                color: 'RTE',
                size: '2XL'
            },
        
            '8902625002679': {
                itemName: 'P122',
                color: 'RTE',
                size: 'L'
            },
        
            '8902625002686': {
                itemName: 'P122',
                color: 'RTE',
                size: 'M'
            },
        
            '8902625002693': {
                itemName: 'P122',
                color: 'RTE',
                size: 'S'
            },
        
            '8902625002709': {
                itemName: 'P122',
                color: 'RTE',
                size: 'XL'
            },
        
            '8902625015969': {
                itemName: 'P125',
                color: 'CEDWOD',
                size: 'L'
            },
        
            '8902625015952': {
                itemName: 'P125',
                color: 'CEDWOD',
                size: 'M'
            },
        
            '8902625015945': {
                itemName: 'P125',
                color: 'CEDWOD',
                size: 'S'
            },
        
            '8902625015976': {
                itemName: 'P125',
                color: 'CEDWOD',
                size: 'XL'
            },
        
            '8902625016003': {
                itemName: 'P125',
                color: 'NUGGET',
                size: 'L'
            },
        
            '8902625015990': {
                itemName: 'P125',
                color: 'NUGGET',
                size: 'M'
            },
        
            '8902625015983': {
                itemName: 'P125',
                color: 'NUGGET',
                size: 'S'
            },
        
            '8902625016010': {
                itemName: 'P125',
                color: 'NUGGET',
                size: 'XL'
            },
        
            '8902625016188': {
                itemName: 'P126',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625016126': {
                itemName: 'P126',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625016119': {
                itemName: 'P126',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625016102': {
                itemName: 'P126',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625016133': {
                itemName: 'P126',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625016195': {
                itemName: 'P126',
                color: 'CEDWOD',
                size: '2XL'
            },
        
            '8902625016164': {
                itemName: 'P126',
                color: 'CEDWOD',
                size: 'L'
            },
        
            '8902625016157': {
                itemName: 'P126',
                color: 'CEDWOD',
                size: 'M'
            },
        
            '8902625016140': {
                itemName: 'P126',
                color: 'CEDWOD',
                size: 'S'
            },
        
            '8902625016171': {
                itemName: 'P126',
                color: 'CEDWOD',
                size: 'XL'
            },
        
            '8902625015501': {
                itemName: 'P127',
                color: 'OLT',
                size: 'L'
            },
        
            '8902625015495': {
                itemName: 'P127',
                color: 'OLT',
                size: 'M'
            },
        
            '8902625015488': {
                itemName: 'P127',
                color: 'OLT',
                size: 'S'
            },
        
            '8902625015518': {
                itemName: 'P127',
                color: 'OLT',
                size: 'XL'
            },
        
            '8902625015549': {
                itemName: 'P127',
                color: 'SLI',
                size: 'L'
            },
        
            '8902625015532': {
                itemName: 'P127',
                color: 'SLI',
                size: 'M'
            },
        
            '8902625015525': {
                itemName: 'P127',
                color: 'SLI',
                size: 'S'
            },
        
            '8902625015556': {
                itemName: 'P127',
                color: 'SLI',
                size: 'XL'
            },
        
            '8902625014900': {
                itemName: 'P129',
                color: 'COSKY',
                size: 'L'
            },
        
            '8902625014894': {
                itemName: 'P129',
                color: 'COSKY',
                size: 'M'
            },
        
            '8902625014887': {
                itemName: 'P129',
                color: 'COSKY',
                size: 'S'
            },
        
            '8902625014917': {
                itemName: 'P129',
                color: 'COSKY',
                size: 'XL'
            },
        
            '8902625014948': {
                itemName: 'P129',
                color: 'VIOQUA',
                size: 'L'
            },
        
            '8902625014931': {
                itemName: 'P129',
                color: 'VIOQUA',
                size: 'M'
            },
        
            '8902625014924': {
                itemName: 'P129',
                color: 'VIOQUA',
                size: 'S'
            },
        
            '8902625014955': {
                itemName: 'P129',
                color: 'VIOQUA',
                size: 'XL'
            },
        
            '8902625016225': {
                itemName: 'P130',
                color: 'CHBLPR',
                size: 'L'
            },
        
            '8902625016218': {
                itemName: 'P130',
                color: 'CHBLPR',
                size: 'M'
            },
        
            '8902625016201': {
                itemName: 'P130',
                color: 'CHBLPR',
                size: 'S'
            },
        
            '8902625016232': {
                itemName: 'P130',
                color: 'CHBLPR',
                size: 'XL'
            },
        
            '8902625016263': {
                itemName: 'P130',
                color: 'WISPRT',
                size: 'L'
            },
        
            '8902625016256': {
                itemName: 'P130',
                color: 'WISPRT',
                size: 'M'
            },
        
            '8902625016249': {
                itemName: 'P130',
                color: 'WISPRT',
                size: 'S'
            },
        
            '8902625016270': {
                itemName: 'P130',
                color: 'WISPRT',
                size: 'XL'
            },
        
            '8902625036094': {
                itemName: 'P138',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625036087': {
                itemName: 'P138',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625036070': {
                itemName: 'P138',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625036100': {
                itemName: 'P138',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625036179': {
                itemName: 'P138',
                color: 'HIBRED',
                size: 'L'
            },
        
            '8902625036162': {
                itemName: 'P138',
                color: 'HIBRED',
                size: 'M'
            },
        
            '8902625036155': {
                itemName: 'P138',
                color: 'HIBRED',
                size: 'S'
            },
        
            '8902625036186': {
                itemName: 'P138',
                color: 'HIBRED',
                size: 'XL'
            },
        
            '8902625036131': {
                itemName: 'P138',
                color: 'OLT',
                size: 'L'
            },
        
            '8902625036124': {
                itemName: 'P138',
                color: 'OLT',
                size: 'M'
            },
        
            '8902625036117': {
                itemName: 'P138',
                color: 'OLT',
                size: 'S'
            },
        
            '8902625036148': {
                itemName: 'P138',
                color: 'OLT',
                size: 'XL'
            },
        
            '8902625045607': {
                itemName: 'P141',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625045591': {
                itemName: 'P141',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625045584': {
                itemName: 'P141',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625045614': {
                itemName: 'P141',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625045645': {
                itemName: 'P141',
                color: 'HAURED',
                size: 'L'
            },
        
            '8902625045638': {
                itemName: 'P141',
                color: 'HAURED',
                size: 'M'
            },
        
            '8902625045621': {
                itemName: 'P141',
                color: 'HAURED',
                size: 'S'
            },
        
            '8902625045652': {
                itemName: 'P141',
                color: 'HAURED',
                size: 'XL'
            },
        
            '8902625045768': {
                itemName: 'P142',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625045751': {
                itemName: 'P142',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625045744': {
                itemName: 'P142',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625045775': {
                itemName: 'P142',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625045805': {
                itemName: 'P142',
                color: 'HAURED',
                size: 'L'
            },
        
            '8902625045799': {
                itemName: 'P142',
                color: 'HAURED',
                size: 'M'
            },
        
            '8902625045782': {
                itemName: 'P142',
                color: 'HAURED',
                size: 'S'
            },
        
            '8902625045812': {
                itemName: 'P142',
                color: 'HAURED',
                size: 'XL'
            },
        
            '8902625046062': {
                itemName: 'P143',
                color: 'MONGRY',
                size: 'L'
            },
        
            '8902625046055': {
                itemName: 'P143',
                color: 'MONGRY',
                size: 'M'
            },
        
            '8902625046048': {
                itemName: 'P143',
                color: 'MONGRY',
                size: 'S'
            },
        
            '8902625046079': {
                itemName: 'P143',
                color: 'MONGRY',
                size: 'XL'
            },
        
            '8902625046109': {
                itemName: 'P143',
                color: 'NUDROS',
                size: 'L'
            },
        
            '8902625046093': {
                itemName: 'P143',
                color: 'NUDROS',
                size: 'M'
            },
        
            '8902625046086': {
                itemName: 'P143',
                color: 'NUDROS',
                size: 'S'
            },
        
            '8902625046116': {
                itemName: 'P143',
                color: 'NUDROS',
                size: 'XL'
            },
        
            '8902625607386': {
                itemName: 'P165',
                color: 'DNT',
                size: '2XL'
            },
        
            '8902625607348': {
                itemName: 'P165',
                color: 'DNT',
                size: 'L'
            },
        
            '8902625607355': {
                itemName: 'P165',
                color: 'DNT',
                size: 'M'
            },
        
            '8902625607362': {
                itemName: 'P165',
                color: 'DNT',
                size: 'S'
            },
        
            '8902625607379': {
                itemName: 'P165',
                color: 'DNT',
                size: 'XL'
            },
        
            '8902625607430': {
                itemName: 'P165',
                color: 'FVP',
                size: '2XL'
            },
        
            '8902625607393': {
                itemName: 'P165',
                color: 'FVP',
                size: 'L'
            },
        
            '8902625607409': {
                itemName: 'P165',
                color: 'FVP',
                size: 'M'
            },
        
            '8902625607416': {
                itemName: 'P165',
                color: 'FVP',
                size: 'S'
            },
        
            '8902625607423': {
                itemName: 'P165',
                color: 'FVP',
                size: 'XL'
            },
        
            '8902625611291': {
                itemName: 'PB40',
                color: 'QUP',
                size: '2XL'
            },
        
            '8902625037077': {
                itemName: 'PS40',
                color: 'GRKBLU',
                size: '2XL'
            },
        
            '8902625037053': {
                itemName: 'PS40',
                color: 'GRKBLU',
                size: 'L'
            },
        
            '8902625037046': {
                itemName: 'PS40',
                color: 'GRKBLU',
                size: 'M'
            },
        
            '8902625037039': {
                itemName: 'PS40',
                color: 'GRKBLU',
                size: 'S'
            },
        
            '8902625037060': {
                itemName: 'PS40',
                color: 'GRKBLU',
                size: 'XL'
            },
        
            '8902625611390': {
                itemName: 'PS40',
                color: 'JETBLK',
                size: '2XL'
            },
        
            '8902625582058': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625582065': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625582072': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625582089': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625582096': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625582102': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625582119': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625582126': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625582133': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625582140': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625582157': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625582164': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625582171': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625582188': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625582195': {
                itemName: 'SB18',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625582508': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '32B'
            },
        
            '8902625582515': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '32C'
            },
        
            '8902625582522': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '32D'
            },
        
            '8902625582539': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '32Z'
            },
        
            '8902625582546': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '34B'
            },
        
            '8902625582553': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '34C'
            },
        
            '8902625582560': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '34D'
            },
        
            '8902625582577': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '34Z'
            },
        
            '8902625582584': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '36B'
            },
        
            '8902625582591': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '36C'
            },
        
            '8902625582607': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '36D'
            },
        
            '8902625582614': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '36Z'
            },
        
            '8902625582621': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '38B'
            },
        
            '8902625582638': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '38C'
            },
        
            '8902625582645': {
                itemName: 'SB18',
                color: 'GRYMEL',
                size: '38D'
            },
        
            '8902625582652': {
                itemName: 'SB18',
                color: 'LCR',
                size: '32B'
            },
        
            '8902625582669': {
                itemName: 'SB18',
                color: 'LCR',
                size: '32C'
            },
        
            '8902625582676': {
                itemName: 'SB18',
                color: 'LCR',
                size: '32D'
            },
        
            '8902625582683': {
                itemName: 'SB18',
                color: 'LCR',
                size: '32Z'
            },
        
            '8902625582690': {
                itemName: 'SB18',
                color: 'LCR',
                size: '34B'
            },
        
            '8902625582706': {
                itemName: 'SB18',
                color: 'LCR',
                size: '34C'
            },
        
            '8902625582713': {
                itemName: 'SB18',
                color: 'LCR',
                size: '34D'
            },
        
            '8902625582720': {
                itemName: 'SB18',
                color: 'LCR',
                size: '34Z'
            },
        
            '8902625582737': {
                itemName: 'SB18',
                color: 'LCR',
                size: '36B'
            },
        
            '8902625582744': {
                itemName: 'SB18',
                color: 'LCR',
                size: '36C'
            },
        
            '8902625582751': {
                itemName: 'SB18',
                color: 'LCR',
                size: '36D'
            },
        
            '8902625582768': {
                itemName: 'SB18',
                color: 'LCR',
                size: '36Z'
            },
        
            '8902625582775': {
                itemName: 'SB18',
                color: 'LCR',
                size: '38B'
            },
        
            '8902625582782': {
                itemName: 'SB18',
                color: 'LCR',
                size: '38C'
            },
        
            '8902625582799': {
                itemName: 'SB18',
                color: 'LCR',
                size: '38D'
            },
        
            '8902625608819': {
                itemName: 'SB18',
                color: 'NISH',
                size: '32B'
            },
        
            '8902625608826': {
                itemName: 'SB18',
                color: 'NISH',
                size: '32C'
            },
        
            '8902625608833': {
                itemName: 'SB18',
                color: 'NISH',
                size: '32D'
            },
        
            '8902625608840': {
                itemName: 'SB18',
                color: 'NISH',
                size: '32Z'
            },
        
            '8902625608857': {
                itemName: 'SB18',
                color: 'NISH',
                size: '34B'
            },
        
            '8902625608864': {
                itemName: 'SB18',
                color: 'NISH',
                size: '34C'
            },
        
            '8902625608871': {
                itemName: 'SB18',
                color: 'NISH',
                size: '34D'
            },
        
            '8902625608888': {
                itemName: 'SB18',
                color: 'NISH',
                size: '34Z'
            },
        
            '8902625608895': {
                itemName: 'SB18',
                color: 'NISH',
                size: '36B'
            },
        
            '8902625608901': {
                itemName: 'SB18',
                color: 'NISH',
                size: '36C'
            },
        
            '8902625608918': {
                itemName: 'SB18',
                color: 'NISH',
                size: '36D'
            },
        
            '8902625608925': {
                itemName: 'SB18',
                color: 'NISH',
                size: '36Z'
            },
        
            '8902625608932': {
                itemName: 'SB18',
                color: 'NISH',
                size: '38B'
            },
        
            '8902625608949': {
                itemName: 'SB18',
                color: 'NISH',
                size: '38C'
            },
        
            '8902625608956': {
                itemName: 'SB18',
                color: 'NISH',
                size: '38D'
            },
        
            '8902625582843': {
                itemName: 'SB25',
                color: 'GRYMEL',
                size: '2XL'
            },
        
            '8902625582805': {
                itemName: 'SB25',
                color: 'GRYMEL',
                size: 'L'
            },
        
            '8902625582812': {
                itemName: 'SB25',
                color: 'GRYMEL',
                size: 'M'
            },
        
            '8902625582829': {
                itemName: 'SB25',
                color: 'GRYMEL',
                size: 'S'
            },
        
            '8902625582836': {
                itemName: 'SB25',
                color: 'GRYMEL',
                size: 'XL'
            },
        
            '8902625582898': {
                itemName: 'SB25',
                color: 'PEARL',
                size: '2XL'
            },
        
            '8902625582850': {
                itemName: 'SB25',
                color: 'PEARL',
                size: 'L'
            },
        
            '8902625582867': {
                itemName: 'SB25',
                color: 'PEARL',
                size: 'M'
            },
        
            '8902625582874': {
                itemName: 'SB25',
                color: 'PEARL',
                size: 'S'
            },
        
            '8902625582881': {
                itemName: 'SB25',
                color: 'PEARL',
                size: 'XL'
            },
        
            '8902625002839': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '30D'
            },
        
            '8902625831651': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '32B'
            },
        
            '8902625831668': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '32C'
            },
        
            '8902625831675': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '32D'
            },
        
            '8902625831682': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '32Z'
            },
        
            '8902625831699': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '34B'
            },
        
            '8902625831705': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '34C'
            },
        
            '8902625831712': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '34D'
            },
        
            '8902625831729': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '34Z'
            },
        
            '8902625831736': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '36B'
            },
        
            '8902625831743': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '36C'
            },
        
            '8902625831750': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '36D'
            },
        
            '8902625831767': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '36Z'
            },
        
            '8902625831774': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '38B'
            },
        
            '8902625831781': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '38C'
            },
        
            '8902625831798': {
                itemName: 'SB29',
                color: 'BLACK',
                size: '38D'
            },
        
            '8902625002846': {
                itemName: 'SB29',
                color: 'NSH',
                size: '30D'
            },
        
            '8902625831804': {
                itemName: 'SB29',
                color: 'NSH',
                size: '32B'
            },
        
            '8902625831811': {
                itemName: 'SB29',
                color: 'NSH',
                size: '32C'
            },
        
            '8902625831828': {
                itemName: 'SB29',
                color: 'NSH',
                size: '32D'
            },
        
            '8902625831835': {
                itemName: 'SB29',
                color: 'NSH',
                size: '32Z'
            },
        
            '8902625831842': {
                itemName: 'SB29',
                color: 'NSH',
                size: '34B'
            },
        
            '8902625831859': {
                itemName: 'SB29',
                color: 'NSH',
                size: '34C'
            },
        
            '8902625831866': {
                itemName: 'SB29',
                color: 'NSH',
                size: '34D'
            },
        
            '8902625831873': {
                itemName: 'SB29',
                color: 'NSH',
                size: '34Z'
            },
        
            '8902625831880': {
                itemName: 'SB29',
                color: 'NSH',
                size: '36B'
            },
        
            '8902625831897': {
                itemName: 'SB29',
                color: 'NSH',
                size: '36C'
            },
        
            '8902625831903': {
                itemName: 'SB29',
                color: 'NSH',
                size: '36D'
            },
        
            '8902625831910': {
                itemName: 'SB29',
                color: 'NSH',
                size: '36Z'
            },
        
            '8902625831927': {
                itemName: 'SB29',
                color: 'NSH',
                size: '38B'
            },
        
            '8902625831934': {
                itemName: 'SB29',
                color: 'NSH',
                size: '38C'
            },
        
            '8902625831941': {
                itemName: 'SB29',
                color: 'NSH',
                size: '38D'
            },
        
            '8902625550545': {
                itemName: 'TS09',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625550514': {
                itemName: 'TS09',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625550521': {
                itemName: 'TS09',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625550538': {
                itemName: 'TS09',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625550583': {
                itemName: 'TS09',
                color: 'BUFF',
                size: '2XL'
            },
        
            '8902625550552': {
                itemName: 'TS09',
                color: 'BUFF',
                size: 'L'
            },
        
            '8902625550569': {
                itemName: 'TS09',
                color: 'BUFF',
                size: 'M'
            },
        
            '8902625550576': {
                itemName: 'TS09',
                color: 'BUFF',
                size: 'XL'
            },
        
            '8902625548559': {
                itemName: 'CB03',
                color: 'MCP',
                size: '2XL'
            },
        
            '8902625548511': {
                itemName: 'CB03',
                color: 'MCP',
                size: 'L'
            },
        
            '8902625548528': {
                itemName: 'CB03',
                color: 'MCP',
                size: 'M'
            },
        
            '8902625548535': {
                itemName: 'CB03',
                color: 'MCP',
                size: 'S'
            },
        
            '8902625548542': {
                itemName: 'CB03',
                color: 'MCP',
                size: 'XL'
            },
        
            '8902625614841': {
                itemName: 'CB03',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625614803': {
                itemName: 'CB03',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625614810': {
                itemName: 'CB03',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625614827': {
                itemName: 'CB03',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625614834': {
                itemName: 'CB03',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625045218': {
                itemName: 'CH03',
                color: 'MCP',
                size: '2XL'
            },
        
            '8902625045188': {
                itemName: 'CH03',
                color: 'MCP',
                size: 'L'
            },
        
            '8902625045171': {
                itemName: 'CH03',
                color: 'MCP',
                size: 'M'
            },
        
            '8902625045195': {
                itemName: 'CH03',
                color: 'MCP',
                size: 'S'
            },
        
            '8902625045201': {
                itemName: 'CH03',
                color: 'MCP',
                size: 'XL'
            },
        
            '8902625614094': {
                itemName: 'CH03',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625614056': {
                itemName: 'CH03',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625614063': {
                itemName: 'CH03',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625614070': {
                itemName: 'CH03',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625614087': {
                itemName: 'CH03',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625610539': {
                itemName: 'CH06',
                color: 'MCP',
                size: '2XL'
            },
        
            '8902625610492': {
                itemName: 'CH06',
                color: 'MCP',
                size: 'L'
            },
        
            '8902625610508': {
                itemName: 'CH06',
                color: 'MCP',
                size: 'M'
            },
        
            '8902625610515': {
                itemName: 'CH06',
                color: 'MCP',
                size: 'S'
            },
        
            '8902625610522': {
                itemName: 'CH06',
                color: 'MCP',
                size: 'XL'
            },
        
            '8902625610485': {
                itemName: 'CH06',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625610447': {
                itemName: 'CH06',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625610454': {
                itemName: 'CH06',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625610461': {
                itemName: 'CH06',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625610478': {
                itemName: 'CH06',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625548801': {
                itemName: 'CR01',
                color: 'MCD',
                size: '2XL'
            },
        
            '8902625548764': {
                itemName: 'CR01',
                color: 'MCD',
                size: 'L'
            },
        
            '8902625548771': {
                itemName: 'CR01',
                color: 'MCD',
                size: 'M'
            },
        
            '8902625548788': {
                itemName: 'CR01',
                color: 'MCD',
                size: 'S'
            },
        
            '8902625548795': {
                itemName: 'CR01',
                color: 'MCD',
                size: 'XL'
            },
        
            '8902625548900': {
                itemName: 'CR01',
                color: 'MCR',
                size: '2XL'
            },
        
            '8902625548863': {
                itemName: 'CR01',
                color: 'MCR',
                size: 'L'
            },
        
            '8902625548870': {
                itemName: 'CR01',
                color: 'MCR',
                size: 'M'
            },
        
            '8902625548887': {
                itemName: 'CR01',
                color: 'MCR',
                size: 'S'
            },
        
            '8902625548894': {
                itemName: 'CR01',
                color: 'MCR',
                size: 'XL'
            },
        
            '8902625548955': {
                itemName: 'CR02',
                color: 'MCD',
                size: '2XL'
            },
        
            '8902625548917': {
                itemName: 'CR02',
                color: 'MCD',
                size: 'L'
            },
        
            '8902625548924': {
                itemName: 'CR02',
                color: 'MCD',
                size: 'M'
            },
        
            '8902625548931': {
                itemName: 'CR02',
                color: 'MCD',
                size: 'S'
            },
        
            '8902625548948': {
                itemName: 'CR02',
                color: 'MCD',
                size: 'XL'
            },
        
            '8902625549051': {
                itemName: 'CR02',
                color: 'MCR',
                size: '2XL'
            },
        
            '8902625549013': {
                itemName: 'CR02',
                color: 'MCR',
                size: 'L'
            },
        
            '8902625549020': {
                itemName: 'CR02',
                color: 'MCR',
                size: 'M'
            },
        
            '8902625549037': {
                itemName: 'CR02',
                color: 'MCR',
                size: 'S'
            },
        
            '8902625549044': {
                itemName: 'CR02',
                color: 'MCR',
                size: 'XL'
            },
        
            '8902625549105': {
                itemName: 'CR17',
                color: 'MCD',
                size: '2XL'
            },
        
            '8902625549068': {
                itemName: 'CR17',
                color: 'MCD',
                size: 'L'
            },
        
            '8902625549075': {
                itemName: 'CR17',
                color: 'MCD',
                size: 'M'
            },
        
            '8902625549082': {
                itemName: 'CR17',
                color: 'MCD',
                size: 'S'
            },
        
            '8902625549099': {
                itemName: 'CR17',
                color: 'MCD',
                size: 'XL'
            },
        
            '8902625549150': {
                itemName: 'CR17',
                color: 'MCM',
                size: '2XL'
            },
        
            '8902625549112': {
                itemName: 'CR17',
                color: 'MCM',
                size: 'L'
            },
        
            '8902625549129': {
                itemName: 'CR17',
                color: 'MCM',
                size: 'M'
            },
        
            '8902625549136': {
                itemName: 'CR17',
                color: 'MCM',
                size: 'S'
            },
        
            '8902625549143': {
                itemName: 'CR17',
                color: 'MCM',
                size: 'XL'
            },
        
            '8902625549204': {
                itemName: 'CR17',
                color: 'MCP',
                size: '2XL'
            },
        
            '8902625549167': {
                itemName: 'CR17',
                color: 'MCP',
                size: 'L'
            },
        
            '8902625549174': {
                itemName: 'CR17',
                color: 'MCP',
                size: 'M'
            },
        
            '8902625549181': {
                itemName: 'CR17',
                color: 'MCP',
                size: 'S'
            },
        
            '8902625549198': {
                itemName: 'CR17',
                color: 'MCP',
                size: 'XL'
            },
        
            '8902625620620': {
                itemName: 'MB01',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625620583': {
                itemName: 'MB01',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625620590': {
                itemName: 'MB01',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625620606': {
                itemName: 'MB01',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625620613': {
                itemName: 'MB01',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625610638': {
                itemName: 'MB20',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625610591': {
                itemName: 'MB20',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625610607': {
                itemName: 'MB20',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625610614': {
                itemName: 'MB20',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625610621': {
                itemName: 'MB20',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625620576': {
                itemName: 'MH01',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625620538': {
                itemName: 'MH01',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625620545': {
                itemName: 'MH01',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625620552': {
                itemName: 'MH01',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625620569': {
                itemName: 'MH01',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625610584': {
                itemName: 'MH20',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625610546': {
                itemName: 'MH20',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625610553': {
                itemName: 'MH20',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625610560': {
                itemName: 'MH20',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625610577': {
                itemName: 'MH20',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625610997': {
                itemName: 'MS01',
                color: 'MCS',
                size: '2XL'
            },
        
            '8902625610959': {
                itemName: 'MS01',
                color: 'MCS',
                size: 'L'
            },
        
            '8902625610966': {
                itemName: 'MS01',
                color: 'MCS',
                size: 'M'
            },
        
            '8902625610973': {
                itemName: 'MS01',
                color: 'MCS',
                size: 'S'
            },
        
            '8902625610980': {
                itemName: 'MS01',
                color: 'MCS',
                size: 'XL'
            },
        
            '8902625611192': {
                itemName: 'PB40',
                color: 'JETBLK',
                size: '2XL'
            },
        
            '8902625611154': {
                itemName: 'PB40',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625611161': {
                itemName: 'PB40',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625611178': {
                itemName: 'PB40',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625611185': {
                itemName: 'PB40',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625613783': {
                itemName: 'PB40',
                color: 'NUDE',
                size: '2XL'
            },
        
            '8902625613745': {
                itemName: 'PB40',
                color: 'NUDE',
                size: 'L'
            },
        
            '8902625613752': {
                itemName: 'PB40',
                color: 'NUDE',
                size: 'M'
            },
        
            '8902625613769': {
                itemName: 'PB40',
                color: 'NUDE',
                size: 'S'
            },
        
            '8902625613776': {
                itemName: 'PB40',
                color: 'NUDE',
                size: 'XL'
            },
        
            '8902625611253': {
                itemName: 'PB40',
                color: 'QUP',
                size: 'L'
            },
        
            '8902625611260': {
                itemName: 'PB40',
                color: 'QUP',
                size: 'M'
            },
        
            '8902625611277': {
                itemName: 'PB40',
                color: 'QUP',
                size: 'S'
            },
        
            '8902625611284': {
                itemName: 'PB40',
                color: 'QUP',
                size: 'XL'
            },
        
            '8902625611642': {
                itemName: 'PH40',
                color: 'JETBLK',
                size: '2XL'
            },
        
            '8902625611604': {
                itemName: 'PH40',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625611611': {
                itemName: 'PH40',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625611628': {
                itemName: 'PH40',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625611635': {
                itemName: 'PH40',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625613684': {
                itemName: 'PH40',
                color: 'NUDE',
                size: '2XL'
            },
        
            '8902625613646': {
                itemName: 'PH40',
                color: 'NUDE',
                size: 'L'
            },
        
            '8902625613653': {
                itemName: 'PH40',
                color: 'NUDE',
                size: 'M'
            },
        
            '8902625613660': {
                itemName: 'PH40',
                color: 'NUDE',
                size: 'S'
            },
        
            '8902625613677': {
                itemName: 'PH40',
                color: 'NUDE',
                size: 'XL'
            },
        
            '8902625611741': {
                itemName: 'PH40',
                color: 'QUP',
                size: '2XL'
            },
        
            '8902625611703': {
                itemName: 'PH40',
                color: 'QUP',
                size: 'L'
            },
        
            '8902625611710': {
                itemName: 'PH40',
                color: 'QUP',
                size: 'M'
            },
        
            '8902625611727': {
                itemName: 'PH40',
                color: 'QUP',
                size: 'S'
            },
        
            '8902625611734': {
                itemName: 'PH40',
                color: 'QUP',
                size: 'XL'
            },
        
            '8902625037329': {
                itemName: 'PP12',
                color: 'BLACK',
                size: '2XL'
            },
        
            '8902625037305': {
                itemName: 'PP12',
                color: 'BLACK',
                size: 'L'
            },
        
            '8902625037299': {
                itemName: 'PP12',
                color: 'BLACK',
                size: 'M'
            },
        
            '8902625037282': {
                itemName: 'PP12',
                color: 'BLACK',
                size: 'S'
            },
        
            '8902625037312': {
                itemName: 'PP12',
                color: 'BLACK',
                size: 'XL'
            },
        
            '8902625037374': {
                itemName: 'PP12',
                color: 'GRW',
                size: '2XL'
            },
        
            '8902625037350': {
                itemName: 'PP12',
                color: 'GRW',
                size: 'L'
            },
        
            '8902625037343': {
                itemName: 'PP12',
                color: 'GRW',
                size: 'M'
            },
        
            '8902625037336': {
                itemName: 'PP12',
                color: 'GRW',
                size: 'S'
            },
        
            '8902625037367': {
                itemName: 'PP12',
                color: 'GRW',
                size: 'XL'
            },
        
            '8902625611352': {
                itemName: 'PS40',
                color: 'JETBLK',
                size: 'L'
            },
        
            '8902625611369': {
                itemName: 'PS40',
                color: 'JETBLK',
                size: 'M'
            },
        
            '8902625611376': {
                itemName: 'PS40',
                color: 'JETBLK',
                size: 'S'
            },
        
            '8902625611383': {
                itemName: 'PS40',
                color: 'JETBLK',
                size: 'XL'
            },
        
            '8902625613738': {
                itemName: 'PS40',
                color: 'NUDE',
                size: '2XL'
            },
        
            '8902625613691': {
                itemName: 'PS40',
                color: 'NUDE',
                size: 'L'
            },
        
            '8902625613707': {
                itemName: 'PS40',
                color: 'NUDE',
                size: 'M'
            },
        
            '8902625613714': {
                itemName: 'PS40',
                color: 'NUDE',
                size: 'S'
            },
        
            '8902625613721': {
                itemName: 'PS40',
                color: 'NUDE',
                size: 'XL'
            },
        
            '8902625611444': {
                itemName: 'PS40',
                color: 'QUP',
                size: '2XL'
            },
        
            '8902625611406': {
                itemName: 'PS40',
                color: 'QUP',
                size: 'L'
            },
        
            '8902625611413': {
                itemName: 'PS40',
                color: 'QUP',
                size: 'M'
            },
        
            '8902625611420': {
                itemName: 'PS40',
                color: 'QUP',
                size: 'S'
            },
        
            '8902625611437': {
                itemName: 'PS40',
                color: 'QUP',
                size: 'XL'
            }
        
        };
        
    }
}
/*extraction vba
Sub ExportToJSON()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim jsonFile As Integer
    Dim filePath As String
    Dim jsonString As String
    
    ' Set the worksheet
    Set ws = ActiveSheet
    
    ' Get the last row
    lastRow = ws.Cells(ws.Rows.Count, "B").End(xlUp).Row
    
    ' Create file path on desktop
    filePath = CreateObject("WScript.Shell").SpecialFolders("Desktop") & "\output.json"
    
    ' Open file for writing
    jsonFile = FreeFile
    Open filePath For Output As jsonFile
    
    ' Write opening bracket
    Print #jsonFile, "{"
    
    ' Loop through each row
    For i = 2 To lastRow
        ' Get values from cells
        Dim barcode As String
        Dim itemName As String
        Dim color As String
        Dim size As String
        
        barcode = Trim(CStr(ws.Cells(i, "B").Value))
        itemName = Trim(CStr(ws.Cells(i, "D").Value))
        color = Trim(CStr(ws.Cells(i, "F").Value))
        size = Trim(CStr(ws.Cells(i, "J").Value))
        
        ' Build JSON string line by line
        Print #jsonFile, "    '" & barcode & "': {"
        Print #jsonFile, "        itemName: '" & itemName & "',"
        Print #jsonFile, "        color: '" & color & "',"
        Print #jsonFile, "        size: '" & size & "'"
        
        ' Close the object with comma if not last row
        If i < lastRow Then
            Print #jsonFile, "    },"
        Else
            Print #jsonFile, "    }"
        End If
        Print #jsonFile, "" ' Add blank line between entries
    Next i
    
    ' Write closing bracket
    Print #jsonFile, "}"
    
    ' Close file
    Close jsonFile
    
    MsgBox "JSON file has been created on your desktop!", vbInformation
End Sub*/

//10
