// stock.js
// Ensure this script is loaded after Firebase SDK and XLSX library


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
        const request = window.indexedDB.open(STOCK_DB_NAME, 3);
        
        request.onerror = (event) => reject("StockIndexedDB error: " + event.target.error);
        
        request.onsuccess = (event) => {
            stockIndexedDB = event.target.result;
            resolve(stockIndexedDB);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (event.oldVersion < 1) {
                db.createObjectStore(STOCK_STORE_NAME, { keyPath: "id" });
            }
            if (event.oldVersion < 3) {
                db.createObjectStore('metadata', { keyPath: 'key' });
            }
        };
    });
}

function handleFileUpload() {
    const fileInput = document.getElementById('xlsFile');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (validateFileFormat(jsonData)) {
                uploadStockData(jsonData);
            } else {
                alert('Invalid file format. Please ensure the XLS file has the correct column headers: "item name", "color", "size", "quantity".');
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Please select a file to upload.');
    }
}

function validateFileFormat(data) {
    if (data.length === 0) return false;
    const requiredHeaders = ['item name', 'color', 'size', 'quantity'];
    const fileHeaders = Object.keys(data[0]);
    return requiredHeaders.every(header => fileHeaders.includes(header));
}

function uploadStockData(stockData) {
    const db = firebase.database();
    const stockRef = db.ref('stock');
    const lastUpdateRef = db.ref('lastUpdate');

    // Remove existing stock data
    stockRef.remove().then(() => {
        // Upload new stock data
        stockRef.set(stockData).then(() => {
            const now = new Date().toISOString();
            lastUpdateRef.set(now).then(() => {
                alert('Stock update successful!');
                updateStockIndexedDB(stockData);
                // No need to call saveLastUpdateTime here as it will be handled by the Firebase listener
            }).catch((error) => {
                console.error('Error saving last update time:', error);
            });
        }).catch((error) => {
            console.error('Error uploading stock data:', error);
            alert('An error occurred while updating stock data. Please try again.');
        });
    }).catch((error) => {
        console.error('Error removing existing stock data:', error);
        alert('An error occurred while preparing for stock update. Please try again.');
    });
}


function saveLastUpdateTime(lastUpdate) {
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
            resolve(event.target.result ? event.target.result.value : null);
        };
        
        request.onerror = (event) => {
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

function updateStockIndexedDB(stockData) {
    const transaction = stockIndexedDB.transaction([STOCK_STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STOCK_STORE_NAME);

    // Clear existing data
    objectStore.clear().onsuccess = () => {
        // Add new data
        stockData.forEach(item => {
            // Create a unique identifier for each item
            const uniqueId = `${item['item name']}_${item.color}_${item.size}`.replace(/\s+/g, '_').toLowerCase();
            const itemWithId = { ...item, id: uniqueId };
            objectStore.add(itemWithId);
        });
    };

    transaction.oncomplete = () => {
        console.log("StockIndexedDB updated successfully");
        displayStockItems(stockData);
    };

    transaction.onerror = (error) => {
        console.error("Error updating StockIndexedDB:", error);
    };
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
        console.error("Error loading stock from StockIndexedDB:", error);
        loadStockItemsFromFirebase();
    };
}

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

    stockRef.on('value', (snapshot) => {
        const stockData = snapshot.val();
        if (stockData) {
            updateStockIndexedDB(stockData);
        }
    }, (error) => {
        console.error("Error in Firebase stock listener:", error);
    });

    lastUpdateRef.on('value', (snapshot) => {
        const lastUpdate = snapshot.val();
        if (lastUpdate) {
            saveLastUpdateTime(lastUpdate);
            displayLastUpdateTime(lastUpdate);
        }
    }, (error) => {
        console.error("Error in Firebase lastUpdate listener:", error);
    });
}


// Add this code to your existing stock.js file

function generateStockTemplate() {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create headers
    const headers = [["item name", "color", "size", "quantity", "Raw Input"]];
    
    // Create an array for formulas
    let data = headers;
    
    // Generate formulas for 2000 rows
    for (let i = 2; i <= 2000; i++) {
        data.push([
            {f: `=LEFT(E${i},FIND("-",E${i})-1)`},  // Column A formula
            {f: `=TRIM(MID(SUBSTITUTE(E${i},",",REPT(" ",LEN(E${i}))), LEN(E${i})*(COUNTA(MID(E${i},FIND(",",E${i})+1,LEN(E${i})),",")-1), LEN(E${i})))`},  // Column B formula
            {f: `=TRIM(RIGHT(SUBSTITUTE(E${i},",",REPT(" ",LEN(E${i}))),LEN(E${i})))`},  // Column C formula
            "",  // Column D (empty for user input)
            ""   // Column E (empty for user input)
        ]);

    
    }
    
    // Create worksheet and add data
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const colWidths = [
        {wch: 15},  // A
        {wch: 15},  // B
        {wch: 10},  // C
        {wch: 10},  // D
        {wch: 30},  // E
    ];
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Stock Template");
    
    // Generate filename with current date and time
    const now = new Date();
    const filename = `stockupload_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);

    const modal = document.getElementById('templateInstructionsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showTemplateInstructionsModal() {
    let modal = document.getElementById('templateInstructionsModal');
    
    // Create the modal if it doesn't exist
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'instructionModal';
        modal.id = 'templateInstructionsModal';
        modal.innerHTML = `
            <div class="instructionModal-content">
                <span class="instructionClose">&times;</span>
                <h2>Template Instructions</h2>
                <ol>
    <li>Download the template using the button below.</li>
    <li>In column D, enter the CLS (Closing Stock) from the DIXDMS-generated stock file.</li>
    <li>In column E, enter the product name in the format: "A014-BRA-NPNW-P1,CMG,34D". Follow the same format for all items.</li>
    <li>After all data is entered correctly, copy the entire dataset and paste it as     **Paste as Value** in a new XLS file.</li>
    <li>Delete column E (Raw Data column).</li>
    <li>Save the file and upload it using the "Upload Stock Data" button in the Stock Updation section.</li>
</ol>
                <button id="downloadTemplateBtn" class="btn btn-primary">Download Template</button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.instructionClose');
        closeBtn.onclick = () => modal.style.display = 'none';

        const downloadBtn = modal.querySelector('#downloadTemplateBtn');
        downloadBtn.addEventListener('click', generateStockTemplate);
    }

    // Show the modal
    modal.style.display = 'block';

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
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
    downloadBtn.textContent = 'Download Template';
    downloadBtn.addEventListener('click', showTemplateInstructionsModal);
    
    const uploadBtn = document.getElementById('uploadStockBtn');
    if (uploadBtn && uploadBtn.parentNode) {
        uploadBtn.parentNode.insertBefore(downloadBtn, uploadBtn.nextSibling);
    } else {
        console.error('Upload button or its parent not found');
    }
}); 