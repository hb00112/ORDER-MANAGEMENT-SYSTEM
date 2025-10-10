// stock.js
// Ensure this script is loaded after Firebase SDK and XLSX library

let headerClickTimer;
let ClickCountS = 0;
let lastClickTime = 0;
let stockIndexedDB;
const STOCK_DB_NAME = 'StockIndexedDB';
const STOCK_STORE_NAME = 'stockItems';
const LAST_UPDATE_KEY = 'lastUpdate';

document.addEventListener('DOMContentLoaded', function() {
    initStockIndexedDB().then(() => {
        console.log("StockIndexedDB initialized");
        loadStockItems();
        setupFirebaseListener();
    }).catch(error => {
        console.error("Failed to initialize StockIndexedDB:", error);
        // Fallback to Firebase if IndexedDB fails
        loadStockItemsFromFirebase();
    });

    document.getElementById('uploadStockBtn').addEventListener('click', handleFileUpload);
    document.querySelector('a[data-section="stock"]').addEventListener('click', loadStockItems);
});

function initStockIndexedDB() {
    return new Promise((resolve, reject) => {
        let request;
        try {
            request = window.indexedDB.open(STOCK_DB_NAME, 4); // Increment version number
        } catch (error) {
            console.error("Failed to open IndexedDB:", error);
            return reject(error);
        }
        
        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.error);
            reject("Failed to open IndexedDB");
        };
        
        request.onsuccess = (event) => {
            stockIndexedDB = event.target.result;
            
            // Add error handler for database
            stockIndexedDB.onerror = (event) => {
                console.error("Database error:", event.target.error);
            };
            
            resolve(stockIndexedDB);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Delete old object stores if they exist
            if (db.objectStoreNames.contains(STOCK_STORE_NAME)) {
                db.deleteObjectStore(STOCK_STORE_NAME);
            }
            if (db.objectStoreNames.contains('metadata')) {
                db.deleteObjectStore('metadata');
            }
            
            // Create new object stores
            db.createObjectStore(STOCK_STORE_NAME, { keyPath: "id", autoIncrement: false });
            db.createObjectStore('metadata', { keyPath: 'key' });
        };
    });
}

// Add a new function to handle safe database operations
function performDatabaseOperation(storeName, operation, data = null, mode = "readonly") {
    return new Promise((resolve, reject) => {
        if (!stockIndexedDB) {
            return reject(new Error("Database not initialized"));
        }

        try {
            const transaction = stockIndexedDB.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);

            transaction.onerror = (event) => {
                console.error(`Transaction error for ${storeName}:`, event.target.error);
                reject(event.target.error);
            };

            transaction.oncomplete = () => {
                resolve();
            };

            if (operation === 'clear') {
                store.clear();
            } else if (operation === 'add' && data) {
                store.add(data);
            } else if (operation === 'put' && data) {
                store.put(data);
            }

        } catch (error) {
            console.error(`Error in database operation for ${storeName}:`, error);
            reject(error);
        }
    });
}

function handleFileUpload() {
    const fileInput = document.getElementById('xlsFile');
    const file = fileInput.files[0];

    console.log('=== FILE UPLOAD STARTED ===');
    console.log('File selected:', file ? file.name : 'No file');

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                console.log('File read successfully, size:', e.target.result.byteLength);
                
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                console.log('Workbook loaded successfully');
                console.log('Sheet names available:', workbook.SheetNames);
                
                const firstSheetName = workbook.SheetNames[0];
                console.log('Using sheet:', firstSheetName);
                
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Read all rows to find where the actual headers are
                const allRowsRaw = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                console.log('Total rows in sheet:', allRowsRaw.length);
                console.log('First 10 rows:', JSON.stringify(allRowsRaw.slice(0, 10), null, 2));
                
                // Find the row with "Product Name" header - search by cell values directly
                let headerRowIndex = -1;
                for (let i = 0; i < allRowsRaw.length; i++) {
                    const row = allRowsRaw[i];
                    if (row && row.length > 0) {
                        // Check if row contains "Product Name" and "CLS" (or just "L")
                        const rowStr = row.join('|').toUpperCase();
                        if (rowStr.includes('PRODUCT NAME') && (rowStr.includes('CLS') || rowStr.includes('|L|') || rowStr.includes('|L '))) {
                            headerRowIndex = i;
                            console.log(`✓ Found header row at index ${i} (row ${i + 1} in Excel)`);
                            console.log('Header row:', row);
                            break;
                        }
                    }
                }
                
                if (headerRowIndex === -1) {
                    console.error('Could not find "Product Name" and "CLS"/"L" headers in the sheet');
                    alert('Error: Could not find headers in Sheet. Please check your file format.');
                    return;
                }
                
                // Extract data directly from cells using column references
                const processedData = extractDataDirectFromCells(worksheet, headerRowIndex);
                
                if (validateFileFormat(processedData)) {
                    console.log('✓ File format validation passed');
                    console.log('Processed data count:', processedData.length);
                    console.log('Processed data sample:', JSON.stringify(processedData.slice(0, 2), null, 2));
                    
                    if (processedData.length > 0) {
                        console.log('✓ Valid stock items found, uploading...');
                        uploadStockData(processedData);
                    } else {
                        console.warn('✗ No valid stock items found');
                        alert('No valid stock items found in the file. Please check if CLS values are valid (not blank and > 0).');
                    }
                } else {
                    console.error('✗ File format validation failed');
                    alert('Invalid file format. Please ensure the XLS file has the correct columns.');
                }
            } catch (error) {
                console.error('Error in file processing:', error);
                console.error('Error stack:', error.stack);
                alert('Error processing file: ' + error.message);
            }
        };
        
        reader.onerror = function(error) {
            console.error('FileReader error:', error);
            alert('Error reading file: ' + error);
        };
        
        reader.readAsArrayBuffer(file);
    } else {
        console.warn('No file selected');
        alert('Please select a file to upload.');
    }
}

function extractDataDirectFromCells(worksheet, headerRowIndex) {
    console.log('=== EXTRACTING DATA DIRECTLY FROM CELLS ===');
    
    const processedData = [];
    let skippedCount = 0;
    let successCount = 0;
    
    // Find column indices for Product Name and CLS/L
    let productNameColIndex = -1;
    let clsColIndex = -1;
    
    // Check header row cells directly
    for (let col = 0; col < 26; col++) {
        const cellRef = XLSX.utils.encode_cell({r: headerRowIndex, c: col});
        const cellValue = worksheet[cellRef]?.v || '';
        const cellStr = cellValue.toString().toUpperCase().trim();
        
        console.log(`Header cell ${cellRef}: "${cellValue}"`);
        
        if (cellStr.includes('PRODUCT') && cellStr.includes('NAME')) {
            productNameColIndex = col;
            console.log(`✓ Found Product Name column at index ${col} (${cellRef})`);
        }
        
        if (cellStr === 'CLS' || cellStr === 'L') {
            clsColIndex = col;
            console.log(`✓ Found CLS/L column at index ${col} (${cellRef})`);
        }
    }
    
    if (productNameColIndex === -1 || clsColIndex === -1) {
        console.error('Could not find required columns');
        return [];
    }
    
    // Read data rows starting from headerRowIndex + 1
    const dataStartRow = headerRowIndex + 1;
    const range = worksheet['!ref'];
    const parsedRange = XLSX.utils.decode_range(range);
    
    console.log(`Reading data from row ${dataStartRow} to row ${parsedRange.e.r}`);
    
    for (let row = dataStartRow; row <= parsedRange.e.r; row++) {
        // Get Product Name
        const productCellRef = XLSX.utils.encode_cell({r: row, c: productNameColIndex});
        const productName = (worksheet[productCellRef]?.v || '').toString().trim();
        
        // Get CLS value directly
        const clsCellRef = XLSX.utils.encode_cell({r: row, c: clsColIndex});
        const clsValue = worksheet[clsCellRef]?.v;
        
        console.log(`Row ${row}: Product="${productName}", CLS=${clsValue}`);
        
        // Skip if product name is blank
        if (!productName || productName === '') {
            console.log(`  ✗ Skipped - empty product name`);
            skippedCount++;
            continue;
        }
        
        // Skip if quantity is blank or undefined
        if (clsValue === undefined || clsValue === null || clsValue === '') {
            console.log(`  ✗ Skipped - empty CLS value`);
            skippedCount++;
            continue;
        }
        
        const quantityNum = parseInt(clsValue);
        if (isNaN(quantityNum)) {
            console.log(`  ✗ Skipped - CLS is not a number (${clsValue})`);
            skippedCount++;
            continue;
        }
        
        // ONLY skip if quantity is 0 or negative
        if (quantityNum <= 0) {
            console.log(`  ✗ Skipped - CLS value is <= 0 (${quantityNum})`);
            skippedCount++;
            continue;
        }
        
        // Extract components from product name
        const itemName = extractItemName(productName);
        const color = extractColor(productName);
        const size = extractSize(productName);
        
        console.log(`  Extracted - Item: "${itemName}", Color: "${color}", Size: "${size}"`);
        
        // RELAXED VALIDATION: Allow entries even if extraction partially fails
        if (!itemName && !color && !size) {
            console.log(`  ✗ Complete extraction failed - all components empty`);
            skippedCount++;
            continue;
        }
        
        processedData.push({
            'item name': itemName || 'Unknown',
            'color': color || 'Unknown',
            'size': size || 'Unknown',
            'quantity': quantityNum
        });
        console.log(`  ✓ Added to processed data`);
        successCount++;
    }
    
    console.log(`Processing complete: ${successCount} added, ${skippedCount} skipped`);
    return processedData;
}

function validateFileFormat(data) {
    console.log('=== VALIDATION CHECK ===');
    
    if (!data || data.length === 0) {
        console.error('Data is empty or null');
        return false;
    }
    
    console.log('Data validated, count:', data.length);
    return true;
}

function extractItemName(rawData) {
    try {
        const dashIndex = rawData.indexOf('-');
        const result = dashIndex > 0 ? rawData.substring(0, dashIndex).trim() : '';
        console.log(`    extractItemName("${rawData}") => "${result}"`);
        return result;
    } catch (e) {
        console.error('Error extracting item name:', e);
        return '';
    }
}

function extractColor(rawData) {
    try {
        const parts = rawData.split(',');
        const result = parts.length >= 2 ? parts[parts.length - 2].trim() : '';
        console.log(`    extractColor("${rawData}") => "${result}"`);
        return result;
    } catch (e) {
        console.error('Error extracting color:', e);
        return '';
    }
}

function extractSize(rawData) {
    try {
        const lastComma = rawData.lastIndexOf(',');
        const result = lastComma > 0 ? rawData.substring(lastComma + 1).trim() : '';
        console.log(`    extractSize("${rawData}") => "${result}"`);
        return result;
    } catch (e) {
        console.error('Error extracting size:', e);
        return '';
    }
}

function uploadStockData(stockData) {
    console.log('=== UPLOADING STOCK DATA ===');
    console.log('Data to upload:', JSON.stringify(stockData, null, 2));
    
    const db = firebase.database();
    const stockRef = db.ref('stock');
    const lastUpdateRef = db.ref('lastUpdate');

    stockRef.remove()
        .then(() => {
            console.log('✓ Existing stock data removed');
            return stockRef.set(stockData);
        })
        .then(() => {
            console.log('✓ New stock data uploaded');
            const now = new Date().toISOString();
            return lastUpdateRef.set(now);
        })
        .then(() => {
            console.log('✓ Last update timestamp saved');
            alert('Stock update successful!');
            updateStockIndexedDB(stockData);
        })
        .catch((error) => {
            console.error('✗ Upload error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            alert('An error occurred while updating stock data. Please try again.');
        });
}

function saveLastUpdateTime(lastUpdate) {
    console.log('Saving last update time:', lastUpdate);
    const transaction = stockIndexedDB.transaction(['metadata'], "readwrite");
    const store = transaction.objectStore('metadata');
    store.put({ key: LAST_UPDATE_KEY, value: lastUpdate });
    displayLastUpdateTime(lastUpdate);
}

function getLastUpdateTime() {
    return new Promise((resolve, reject) => {
        const transaction = stockIndexedDB.transaction(['metadata'], "readonly");
        const store = transaction.objectStore('metadata');
        const request = store.get(LAST_UPDATE_KEY);
        
        request.onsuccess = (event) => {
            console.log('Last update time retrieved:', event.target.result?.value);
            resolve(event.target.result ? event.target.result.value : null);
        };
        
        request.onerror = (event) => {
            console.error("Error fetching last update time:", event.target.error);
            reject("Error fetching last update time: " + event.target.error);
        };
    });
}

function displayLastUpdateTime(lastUpdate) {
    if (lastUpdate) {
        const formattedDate = formatDate(lastUpdate);
        
        // Remove any existing marquee
        const existingMarquee = document.querySelector('#stock marquee');
        if (existingMarquee) {
            existingMarquee.remove();
        }
        
        const marquee = document.createElement('marquee');
        marquee.textContent = `Last stock update: ${formattedDate}`;
        marquee.style.backgroundColor = '#87044c';
        marquee.style.color = 'white';
        marquee.style.padding = '5px';
        marquee.style.marginBottom = '10px';
        marquee.style.display = 'block';
        marquee.style.width = '100%';
        
        const stockSection = document.getElementById('stock');
        if (stockSection) {
            stockSection.insertBefore(marquee, stockSection.firstChild);
        } else {
            console.error("Stock section not found");
        }
    }
}

async function updateStockIndexedDB(stockData) {
    if (!Array.isArray(stockData)) {
        console.error("Invalid stock data format");
        return;
    }

    try {
        // Clear existing data first
        await performDatabaseOperation(STOCK_STORE_NAME, 'clear', null, "readwrite");
        
        // Process all items in a single transaction
        const transaction = stockIndexedDB.transaction(STOCK_STORE_NAME, "readwrite");
        const store = transaction.objectStore(STOCK_STORE_NAME);
        
        // Create a Map to deduplicate items
        const uniqueItems = new Map();
        
        // Process each item
        stockData.forEach(item => {
            if (parseFloat(item.quantity) > 0) {
                const uniqueId = `${item['item name']}_${item.color}_${item.size}`
                    .replace(/\s+/g, '_')
                    .toLowerCase();
                    
                // If duplicate exists, keep the one with higher quantity
                if (uniqueItems.has(uniqueId)) {
                    const existingItem = uniqueItems.get(uniqueId);
                    if (parseFloat(item.quantity) > parseFloat(existingItem.quantity)) {
                        uniqueItems.set(uniqueId, { ...item, id: uniqueId });
                    }
                } else {
                    uniqueItems.set(uniqueId, { ...item, id: uniqueId });
                }
            }
        });

        // Add all unique items to the store
        const promises = Array.from(uniqueItems.values()).map(item => {
            return new Promise((resolve, reject) => {
                const request = store.put(item); // Using put instead of add to handle duplicates
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        // Wait for all items to be added
        await Promise.all(promises);
        
        // Wait for transaction to complete
        await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });

        console.log("StockIndexedDB updated successfully");
        displayStockItems(Array.from(uniqueItems.values()));

    } catch (error) {
        console.error("Failed to update StockIndexedDB:", error);
        // Fallback to display data directly
        displayStockItems(stockData);
        
        // Attempt database repair
        await checkAndRepairDatabase();
    }
}

// Enhanced database repair function
async function checkAndRepairDatabase() {
    try {
        // Close existing connection
        if (stockIndexedDB) {
            stockIndexedDB.close();
        }
        
        // Delete and recreate the database
        await new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(STOCK_DB_NAME);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
        
        // Reinitialize the database
        await initStockIndexedDB();
        
        // Reload data from Firebase
        await loadStockItemsFromFirebase();
        
        console.log("Database repair completed successfully");
    } catch (error) {
        console.error("Failed to repair database:", error);
        // If repair fails, clear IndexedDB and rely on Firebase
        displayStockItems(await fetchStockDataFromFirebase());
    }
}

// New helper function to fetch Firebase data
async function fetchStockDataFromFirebase() {
    return new Promise((resolve, reject) => {
        const db = firebase.database();
        const stockRef = db.ref('stock');
        
        stockRef.once('value')
            .then(snapshot => resolve(snapshot.val() || []))
            .catch(reject);
    });
}


function displayStockItems(stockData) {
    const stockList = document.getElementById('stockList');
    stockList.innerHTML = ''; // Clear existing items

    // Compare stock data with defined items
    const itemsToHighlight = compareStockWithDefinedItems(stockData);

    // Group items by name
    const groupedItems = stockData.reduce((acc, item) => {
        if (!acc[item['item name']]) {
            acc[item['item name']] = [];
        }
        acc[item['item name']].push(item);
        return acc;
    }, {});

    Object.keys(groupedItems).forEach(itemName => {
        const itemButton = document.createElement('button');
        itemButton.classList.add('stock-item-btn');
        itemButton.textContent = itemName;
        
        // Highlight items if necessary
        if (itemsToHighlight.has(itemName)) {
            itemButton.style.border = '2px solid red';
        }
        
        itemButton.addEventListener('click', () => openItemStockModal(itemName, groupedItems[itemName]));
        stockList.appendChild(itemButton);
    });
}

function openItemStockModal(itemName, itemData) {
    const modal = document.getElementById('itemStockModal');
    const modalItemName = document.getElementById('modalItemName');
    const modalStockTable = document.getElementById('modalStockTable').getElementsByTagName('tbody')[0];

    modalItemName.textContent = itemName;
    modalStockTable.innerHTML = '';

    // Group by color
    const groupedByColor = itemData.reduce((acc, item) => {
        if (!acc[item.color]) {
            acc[item.color] = [];
        }
        acc[item.color].push(item);
        return acc;
    }, {});

    Object.entries(groupedByColor).forEach(([color, items]) => {
        const row = modalStockTable.insertRow();
        const cellColor = row.insertCell(0);
        const cellSizeQty = row.insertCell(1);

        cellColor.textContent = color;
        cellSizeQty.textContent = items.map(item => `${item.size}/${item.quantity}`).join(', ');
    });

    modal.style.display = 'block';

    // Close modal when clicking on <span> (x)
    modal.querySelector('.close').onclick = function() {
        modal.style.display = 'none';
    }

    // Close modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const suffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }
    
    return `${day}${suffix(day)} ${month} ${year} at ${hours}:${minutes}`;
}

function loadStockItems() {
    try {
        if (!stockIndexedDB) {
            throw new Error("IndexedDB not initialized");
        }

        const transaction = stockIndexedDB.transaction([STOCK_STORE_NAME], "readonly");
        const objectStore = transaction.objectStore(STOCK_STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            const stockData = event.target.result;
            if (stockData && stockData.length > 0) {
                displayStockItems(stockData);
                fetchLastUpdateTimeFromFirebase();
            } else {
                loadStockItemsFromFirebase();
            }
        };

        request.onerror = (error) => {
            console.error("Error loading stock from IndexedDB:", error);
            loadStockItemsFromFirebase();
        };

    } catch (error) {
        console.error("Error in loadStockItems:", error);
        loadStockItemsFromFirebase();
    }
}

// Add a function to check and repair database integrity



function loadStockItemsFromFirebase() {
    const db = firebase.database();
    const stockRef = db.ref('stock');

    stockRef.once('value').then((snapshot) => {
        const stockData = snapshot.val();
        if (stockData) {
            updateStockIndexedDB(stockData);
            fetchLastUpdateTimeFromFirebase();
        } else {
            document.getElementById('stockList').innerHTML = '<p>No stock items available.</p>';
        }
    }).catch((error) => {
        console.error('Error loading stock data from Firebase:', error);
        document.getElementById('stockList').innerHTML = '<p>Error loading stock items. Please try again later.</p>';
    });
}

function fetchLastUpdateTimeFromFirebase() {
    const db = firebase.database();
    const lastUpdateRef = db.ref('lastUpdate');

    lastUpdateRef.once('value').then((snapshot) => {
        const lastUpdate = snapshot.val();
        if (lastUpdate) {
            saveLastUpdateTime(lastUpdate);
            displayLastUpdateTime(lastUpdate);
        } else {
            console.log("No last update time found in Firebase");
        }
    }).catch((error) => {
        console.error('Error fetching last update time from Firebase:', error);
    });
}

function setupFirebaseListener() {
    const db = firebase.database();
    const stockRef = db.ref('stock');
    const lastUpdateRef = db.ref('lastUpdate');

    stockRef.on('value', async (snapshot) => {
        try {
            const stockData = snapshot.val();
            if (stockData) {
                await updateStockIndexedDB(stockData);
            }
        } catch (error) {
            console.error("Error in Firebase stock listener:", error);
            await checkAndRepairDatabase();
        }
    }, (error) => {
        console.error("Firebase listener error:", error);
    });

    lastUpdateRef.on('value', (snapshot) => {
        const lastUpdate = snapshot.val();
        if (lastUpdate) {
            saveLastUpdateTime(lastUpdate);
            displayLastUpdateTime(lastUpdate);
        }
    });
}



// Add this code to your existing stock.js file



function showTemplateInstructionsModal() {
    let modal = document.getElementById('templateInstructionsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'instructionModal';
        modal.id = 'templateInstructionsModal';
        modal.innerHTML = `
            <div class="instructionModal-content">
                <span class="instructionClose">&times;</span>
                <h2>Upload Instructions</h2>
                <ol>
                    <li>Upload the raw stock file directly from DIXDMS</li>
                    <li>The file must contain columns "Product Name" (B) and "CLS" (L)</li>
                    <li>Only rows with CLS values (not blank and less than 100) will be processed</li>
                    <li>The system will automatically extract item name, color, and size from the Product Name column</li>
                    <li>Data processing starts from row 8 (row 7 should contain headers)</li>
                </ol>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.instructionClose');
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    modal.style.display = 'block';

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}
function startHeaderClickTimer(e) {
    // Prevent text selection during long press
    e.preventDefault();
    headerClickTimer = setTimeout(() => {
        exportCurrentStock();
        // Reset click count after long press
        ClickCountS = 0;
    }, 3000); // 3 seconds
}

function clearHeaderClickTimer() {
    if (headerClickTimer) {
        clearTimeout(headerClickTimer);
    }
}

function handleHeaderClick(e) {
    const currentTime = new Date().getTime();
    
    // Reset count if too much time has passed since last click
    if (currentTime - lastClickTime > 500) { // 500ms threshold for clicks
        ClickCountS = 0;
    }
    
    ClickCountS++;
    lastClickTime = currentTime;
    
    if (ClickCountS === 3) {
        exportCurrentStock();
        ClickCountS = 0; // Reset count after triple click
    }
}

function handleHeaderTouch(e) {
    const currentTime = new Date().getTime();
    
    // Reset count if too much time has passed since last touch
    if (currentTime - lastClickTime > 500) {
        ClickCountS = 0;
    }
    
    ClickCountS++;
    lastClickTime = currentTime;
    
    if (ClickCountS === 3) {
        e.preventDefault(); // Prevent any default touch behavior
        exportCurrentStock();
        ClickCountS = 0; // Reset count after triple tap
    }
}

async function exportCurrentStock() {
    try {
        // Get current stock data from IndexedDB
        const stockData = await new Promise((resolve, reject) => {
            if (!stockIndexedDB) {
                reject(new Error("IndexedDB not initialized"));
                return;
            }

            const transaction = stockIndexedDB.transaction([STOCK_STORE_NAME], "readonly");
            const objectStore = transaction.objectStore(STOCK_STORE_NAME);
            const request = objectStore.getAll();

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });

        if (!stockData || stockData.length === 0) {
            alert('No stock data available to export');
            return;
        }

        // Format data for Excel
        const formattedData = stockData.map(item => ({
            'Item Name': item['item name'],
            'Color': item.color,
            'Size': item.size,
            'Quantity': item.quantity
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(formattedData);

        // Set column widths
        const colWidths = [
            { wch: 30 }, // Item Name
            { wch: 15 }, // Color
            { wch: 10 }, // Size
            { wch: 10 }  // Quantity
        ];
        ws['!cols'] = colWidths;

        // Generate filename with current date and time
        const now = new Date();
        const filename = `stock_export_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;

        // Add worksheet to workbook and save
        XLSX.utils.book_append_sheet(wb, ws, "Current Stock");
        XLSX.writeFile(wb, filename);

        // Visual feedback
        const header = document.querySelector('#stock h2');
        if (header) {
            const originalColor = header.style.color;
            header.style.color = '#4CAF50';
            setTimeout(() => {
                header.style.color = originalColor;
            }, 1000);
        }

    } catch (error) {
        console.error("Error exporting stock:", error);
        alert('Failed to export stock data. Please try again.');
    }
}
function compareStockWithDefinedItems(stockData) {
    const definedItems = new Map(items.map(item => [item.name, item]));
    const stockItems = new Map();

    // Group stock data by item name
    stockData.forEach(item => {
        if (!stockItems.has(item['item name'])) {
            stockItems.set(item['item name'], new Set());
        }
        stockItems.get(item['item name']).add(item.color);
    });

    // Compare and return items that need highlighting
    const itemsToHighlight = new Set();
    stockItems.forEach((colors, itemName) => {
        const definedItem = definedItems.get(itemName);
        if (definedItem) {
            colors.forEach(color => {
                if (!definedItem.colors.includes(color)) {
                    itemsToHighlight.add(itemName);
                }
            });
        } else {
            itemsToHighlight.add(itemName);
        }
    });

    return itemsToHighlight;
}


// Add event listener for the download button
document.addEventListener('DOMContentLoaded', function() {
    // Remove any existing button to avoid duplicates
    const existingBtn = document.getElementById('showTemplateInstructionsBtn');
    if (existingBtn) {
        existingBtn.remove();
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary mt-2';
    downloadBtn.id = 'showTemplateInstructionsBtn';
    downloadBtn.textContent = 'How to Upload?';
    downloadBtn.addEventListener('click', showTemplateInstructionsModal);
    
    const uploadBtn = document.getElementById('uploadStockBtn');
    if (uploadBtn && uploadBtn.parentNode) {
        uploadBtn.parentNode.insertBefore(downloadBtn, uploadBtn.nextSibling);
    } else {
        console.error('Upload button or its parent not found');
    }

    const stockHeader = document.querySelector('#stock h4');
    if (stockHeader) {
        // Long press handlers
        stockHeader.addEventListener('mousedown', startHeaderClickTimer);
        stockHeader.addEventListener('mouseup', clearHeaderClickTimer);
        stockHeader.addEventListener('mouseleave', clearHeaderClickTimer);
        stockHeader.addEventListener('touchstart', startHeaderClickTimer);
        stockHeader.addEventListener('touchend', clearHeaderClickTimer);
        
        // Triple tap handlers
        stockHeader.addEventListener('click', handleHeaderClick);
        stockHeader.addEventListener('touchstart', handleHeaderTouch);
        
        stockHeader.style.cursor = 'pointer'; // Visual indication that it's clickable
    }
});  
