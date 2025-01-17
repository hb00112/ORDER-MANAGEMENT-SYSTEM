
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const scanItemBtn = document.getElementById('scanItemBtn');
    const scannerSection = document.getElementById('scannerSection');
    const closeScannerBtn = document.getElementById('closeScannerBtn');

    // Function to open scanner section
    function openScannerSection() {
        scannerSection.style.display = 'block';
        // Initialize scanner here
        initializeScanner();
    }

    // Function to close scanner section
    function closeScannerSection() {
        scannerSection.style.display = 'none';
        // Stop scanner if needed
        stopScanner();
    }

    // Event listeners
    scanItemBtn.addEventListener('click', openScannerSection);
    closeScannerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeScannerSection();
    });

    // Function to initialize scanner (implement based on your scanner library)
    function initializeScanner() {
        // Add your scanner initialization code here
        // For example, if using QuaggaJS or other barcode scanning library
    }

    // Function to stop scanner
    function stopScanner() {
        // Add your scanner cleanup code here
        // For example, stopping camera stream
    }
});

const predefinedItems = {
    '8902625553430': {
        item: 'A014',
        color: 'SKIN',
        size: '36B',
        mrp: 979.00
    },
    '8902625553447': {
        item: 'A014',
        color: 'SKIN',
        size: '38B',
        mrp: 979.00
    },
    '8902625553454': {
        item: 'A014',
        color: 'BLACK',
        size: '36B',
        mrp: 979.00
    },
    '8902625553461': {
        item: 'B076',
        color: 'WHITE',
        size: '34C',
        mrp: 849.00
    }
};

// DOM Elements
const partyInput = document.getElementById('partyInput');
const partySuggestions = document.getElementById('partySuggestions');
const selectedParty = document.getElementById('selectedParty');
const scannerContainer = document.getElementById('scannerContainer');
const cartContainer = document.getElementById('cartContainer');
const video = document.getElementById('video');
const scanModal = document.getElementById('scanModal');
const scanResult = document.getElementById('scanResult');
const itemDetails = document.getElementById('itemDetails');
const statusBar = document.getElementById('statusBar');
const cartItems = document.getElementById('cartItems');

let currentBarcode = null;
let isScanning = true;
let cartArray = [];
let selectedPartyName = '';
const predefinedParties = [
    "Agarwal Hosiery",
    "Bombay Fashion",
    "City Point",
    "Delhi Garments",
    "Express Clothing",
    "Fashion Hub",
    "Galaxy Store",
    "Hosiery Point",
    "Indian Wear",
    "Joy Fashion"
];

// Party input handling
partyInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    showPartySuggestions(searchTerm);
});

function showPartySuggestions(searchTerm) {
    partySuggestions.innerHTML = '';
    
    if (!searchTerm) {
        partySuggestions.style.display = 'none';
        return;
    }

    const matches = predefinedParties.filter(party => 
        party.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matches.length > 0 || searchTerm.length >= 3) {
        partySuggestions.style.display = 'block';
        
        // Add existing matches
        matches.forEach(party => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            const matchIndex = party.toLowerCase().indexOf(searchTerm.toLowerCase());
            div.innerHTML = party.substring(0, matchIndex) +
                `<span class="matched-text">${party.substring(matchIndex, matchIndex + searchTerm.length)}</span>` +
                party.substring(matchIndex + searchTerm.length);
            
            div.addEventListener('click', () => selectParty(party));
            partySuggestions.appendChild(div);
        });

        // Add new party option if no exact match
        if (!matches.some(party => party.toLowerCase() === searchTerm.toLowerCase()) && searchTerm.length >= 3) {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = `Add new party: ${searchTerm}`;
            div.addEventListener('click', () => selectParty(searchTerm));
            partySuggestions.appendChild(div);
        }
    } else {
        partySuggestions.style.display = 'none';
    }
}

function selectParty(partyName) {
    selectedPartyName = partyName;
    partyInput.value = '';
    partySuggestions.style.display = 'none';
    selectedParty.textContent = `Selected Party: ${partyName}`;
    selectedParty.style.display = 'block';
    scannerContainer.style.display = 'block';
    cartContainer.style.display = 'block';
    initializeScanner();
}

// Initialize scanner
async function initializeScanner() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        video.srcObject = stream;
        await video.play();

        const detector = new BarcodeDetector({ formats: ['ean_13'] });
        statusBar.style.display = 'block';

        async function scan() {
            if (!isScanning) {
                requestAnimationFrame(scan);
                return;
            }

            try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0) {
                    const barcode = barcodes[0].rawValue;
                    handleBarcodeScan(barcode);
                    isScanning = false;
                }
            } catch (error) {
                console.error('Scanning error:', error);
            }

            requestAnimationFrame(scan);
        }

        scan();
    } catch (error) {
        console.error('Scanner initialization failed:', error);
        statusBar.textContent = 'Camera access denied';
    }
}

// Handle barcode scan
function handleBarcodeScan(barcode) {
    currentBarcode = barcode;
    const item = predefinedItems[barcode];

    scanResult.textContent = `Barcode: ${barcode}`;
    
    if (item) {
        itemDetails.innerHTML = `
            <p><strong>Item:</strong> ${item.item}</p>
            <p><strong>Color:</strong> ${item.color}</p>
            <p><strong>Size:</strong> ${item.size}</p>
        `;
        // Set the editable MRP input with the predefined value
        document.getElementById('editableMrp').value = item.mrp;
    } else {
        itemDetails.innerHTML = '<p>Item not found in database</p>';
        document.getElementById('editableMrp').value = '';
    }

    scanModal.style.display = 'block';
    statusBar.style.display = 'none';
}

// Modified addToCart function
// Modified addToCart function to handle quantity combining
function addToCart() {
const item = predefinedItems[currentBarcode];
if (item) {
const modifiedItem = { 
    ...item, 
    barcode: currentBarcode,
    mrp: parseFloat(document.getElementById('editableMrp').value) || item.mrp,
    qty: 1 // Default quantity is 1
};

// Check if item already exists in cart
const existingItemIndex = cartArray.findIndex(cartItem => 
    cartItem.barcode && // Only check barcode if it exists
    cartItem.barcode === modifiedItem.barcode &&
    cartItem.item === modifiedItem.item &&
    cartItem.color === modifiedItem.color &&
    cartItem.size === modifiedItem.size &&
    cartItem.mrp === modifiedItem.mrp
);

if (existingItemIndex !== -1) {
    // If item exists, increment quantity
    cartArray[existingItemIndex].qty = (cartArray[existingItemIndex].qty || 1) + 1;
} else {
    // If item doesn't exist, add new item
    cartArray.push(modifiedItem);
}
updateCartDisplay();
}
closeModal();
}


function clearAllModalsAndInputs() {
// Clear and close scan modal
scanModal.style.display = 'none';
currentBarcode = null;

// Clear and close barcode entry modal
barcodeEntryModal.style.display = 'none';
barcodeInput.value = '';

// Clear and close manual entry modal
manualEntryModal.style.display = 'none';
itemNameInput.value = '';
colorInput.value = '';
sizeInput.value = '';
qtyInput.value = '1';
mrpInput.value = '';

// Resume scanning
isScanning = true;
statusBar.style.display = 'block';
}

// Update cart display
function updateCartDisplay() {
cartItems.innerHTML = cartArray.map((item, index) => `
<div class="cart-item">
    ${item.barcode ? `<p><strong>Barcode:</strong> ${item.barcode}</p>` : ''}
    <p><strong>Item:</strong> ${item.item}</p>
    <p><strong>Color:</strong> ${item.color}</p>
    <p><strong>Size:</strong> ${item.size}</p>
    <p><strong>Quantity:</strong> ${item.qty || 1}</p>
    <p><strong>MRP:</strong> ₹${item.mrp.toFixed(2)}</p>
    <p><strong>Total MRP Value:</strong> ₹${((item.qty || 1) * item.mrp).toFixed(2)}</p>
</div>
`).join('');
}
// Close modal and resume scanning
function closeModal() {
    scanModal.style.display = 'none';
    statusBar.style.display = 'block';
    currentBarcode = null;
    isScanning = true;
}
// Modified saveCart function to save under temp orders
async function saveCart() {
if (cartArray.length === 0) {
    alert('Please add items to cart before saving');
    return;
}

const loadingStatus = document.getElementById('statusBar');
loadingStatus.textContent = 'Saving order...';
loadingStatus.style.display = 'block';

try {
    // Generate timestamp and order ID
    const timestamp = new Date().toISOString();
    const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create order object
    const orderData = {
        party: selectedPartyName,
        items: cartArray,
        timestamp: timestamp,
        status: 'pending',
        order_id: orderId
    };

    // Save to Firebase Realtime Database
    await db.ref('temp_orders/' + orderId).set(orderData);
    
    // Success handling
    cartArray = [];
    updateCartDisplay();
    loadingStatus.textContent = 'Order saved successfully!';
    
    setTimeout(() => {
        loadingStatus.style.display = 'none';
    }, 2000);
    
} catch (error) {
    console.error('Error saving order:', error);
    loadingStatus.textContent = 'Error saving order. Please try again.';
    
    setTimeout(() => {
        loadingStatus.style.display = 'none';
    }, 3000);
    
    // Store failed order in localStorage as backup
    try {
        const failedOrders = JSON.parse(localStorage.getItem('failedOrders') || '[]');
        failedOrders.push({
            party: selectedPartyName,
            items: cartArray,
            timestamp: new Date().toISOString(),
            status: 'failed'
        });
        localStorage.setItem('failedOrders', JSON.stringify(failedOrders));
    } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
    }
}
}

// Modified retryFailedOrders function for Realtime Database
function retryFailedOrders() {
try {
    const failedOrders = JSON.parse(localStorage.getItem('failedOrders') || '[]');
    if (failedOrders.length > 0) {
        failedOrders.forEach(async (order) => {
            try {
                const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                await db.ref('temp_orders/' + orderId).set({
                    ...order,
                    order_id: orderId,
                    retried: true
                });
            } catch (error) {
                console.error('Error retrying order:', error);
            }
        });
        localStorage.removeItem('failedOrders');
    }
} catch (error) {
    console.error('Error processing failed orders:', error);
}
}

// Add function to fetch predefined items from Firebase
async function fetchPredefinedItems() {
try {
    const snapshot = await db.ref('predefined_items').once('value');
    const items = snapshot.val();
    if (items) {
        predefinedItems = items;
        // Update unique items, colors, and sizes arrays
        uniqueItems = [...new Set(Object.values(items).map(item => item.item))];
        uniqueColors = [...new Set(Object.values(items).map(item => item.color))];
        uniqueSizes = [...new Set(Object.values(items).map(item => item.size))];
    }
} catch (error) {
    console.error('Error fetching predefined items:', error);
}
}

// Call fetchPredefinedItems when the page loads
document.addEventListener('DOMContentLoaded', () => {
fetchPredefinedItems();
retryFailedOrders();
});
// Add retry attempt when page loads
window.addEventListener('online', retryFailedOrders);
document.addEventListener('DOMContentLoaded', retryFailedOrders);

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!partySuggestions.contains(e.target) && e.target !== partyInput) {
        partySuggestions.style.display = 'none';
    }
});

// Event Listeners
document.getElementById('addToCart').addEventListener('click', addToCart);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('saveCart').addEventListener('click', saveCart);
const uniqueItems = [...new Set(Object.values(predefinedItems).map(item => item.item))];
const uniqueColors = [...new Set(Object.values(predefinedItems).map(item => item.color))];
const uniqueSizes = [...new Set(Object.values(predefinedItems).map(item => item.size))];

// Additional DOM Elements
const barcodeEntryModal = document.getElementById('barcodeEntryModal');
const manualEntryModal = document.getElementById('manualEntryModal');
const barcodeInput = document.getElementById('barcodeInput');
const itemNameInput = document.getElementById('itemNameInput');
const colorInput = document.getElementById('colorInput');
const sizeInput = document.getElementById('sizeInput');
const qtyInput = document.getElementById('qtyInput');
const mrpInput = document.getElementById('mrpInput');

// Show suggestions function
function showSuggestions(input, suggestions, suggestionsList) {
    const searchTerm = input.value.trim().toLowerCase();
    suggestionsList.innerHTML = '';
    
    if (!searchTerm) {
        suggestionsList.style.display = 'none';
        return;
    }

    const matches = suggestions.filter(item => 
        item.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
        suggestionsList.style.display = 'block';
        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = match;
            div.addEventListener('click', () => {
                input.value = match;
                suggestionsList.style.display = 'none';
            });
            suggestionsList.appendChild(div);
        });
    } else {
        suggestionsList.style.display = 'none';
    }
}

// Event listeners for manual entry inputs
itemNameInput.addEventListener('input', () => 
    showSuggestions(itemNameInput, uniqueItems, document.getElementById('itemSuggestions')));

colorInput.addEventListener('input', () => 
    showSuggestions(colorInput, uniqueColors, document.getElementById('colorSuggestions')));

sizeInput.addEventListener('input', () => 
    showSuggestions(sizeInput, uniqueSizes, document.getElementById('sizeSuggestions')));

// Handle barcode entry
document.getElementById('typeBarcodeBtn').addEventListener('click', () => {
    barcodeEntryModal.style.display = 'block';
});

document.getElementById('submitBarcode').addEventListener('click', () => {
const barcode = barcodeInput.value.trim();
if (barcode) {
handleBarcodeScan(barcode);
barcodeEntryModal.style.display = 'none';
barcodeInput.value = '';
}
});
document.getElementById('closeBarcodeModal').addEventListener('click', () => {
    barcodeEntryModal.style.display = 'none';
    barcodeInput.value = '';
});

// Handle manual entry
document.getElementById('manualEntryBtn').addEventListener('click', () => {
    manualEntryModal.style.display = 'block';
});

document.getElementById('submitManualEntry').addEventListener('click', () => {
const manualItem = {
item: itemNameInput.value,
color: colorInput.value,
size: sizeInput.value,
qty: parseInt(qtyInput.value) || 1,
mrp: parseFloat(mrpInput.value) || 0
};

// Check if identical item exists
const existingItemIndex = cartArray.findIndex(cartItem =>
(!cartItem.barcode && !manualItem.barcode) && // Both items are manual entries
cartItem.item === manualItem.item &&
cartItem.color === manualItem.color &&
cartItem.size === manualItem.size &&
cartItem.mrp === manualItem.mrp
);

if (existingItemIndex !== -1) {
// If item exists, add quantities
cartArray[existingItemIndex].qty = (cartArray[existingItemIndex].qty || 1) + manualItem.qty;
} else {
// If item doesn't exist, add new item
cartArray.push(manualItem);
}

updateCartDisplay();

// Clear all inputs and close modal
manualEntryModal.style.display = 'none';
itemNameInput.value = '';
colorInput.value = '';
sizeInput.value = '';
qtyInput.value = '1';
mrpInput.value = '';
});


document.getElementById('closeManualModal').addEventListener('click', () => {
    manualEntryModal.style.display = 'none';
    // Reset form
    itemNameInput.value = '';
    colorInput.value = '';
    sizeInput.value = '';
    qtyInput.value = '1';
    mrpInput.value = '';
});