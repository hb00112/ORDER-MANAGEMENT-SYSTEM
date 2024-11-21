const database = firebase.database();

// Specific items to display
const specificItems = ['A039', 'A042', 'SB06'];

// Brand Stock (BS) data for A039
const brandStockData = {
    'A039': {
        'BLACK': {
            '32B': 4, '32C': 4, '32D': 2,
            '34B': 4, '34C': 4, '34D': 2,
            '36B': 4, '36C': 4, '36D': 2,
            '38B': 3, '38C': 3, '38D': 2
        },
        'EVEBLU': {
            '32B': 4, '32C': 4, '32D': 2,
            '34B': 4, '34C': 4, '34D': 2,
            '36B': 4, '36C': 4, '36D': 2,
            '38B': 3, '38C': 3, '38D': 2
        },
        'GRW': {
            '32B': 4, '32C': 4, '32D': 2,
            '34B': 4, '34C': 4, '34D': 2,
            '36B': 4, '36C': 4, '36D': 2,
            '38B': 3, '38C': 3, '38D': 2
        },
        'GRYMRL': {
            '32B': 3, '32C': 3, '32D': 1,
            '34B': 3, '34C': 3, '34D': 1,
            '36B': 3, '36C': 3, '36D': 1,
            '38B': 2, '38C': 2, '38D': 1
        },
        'LILAST': {
            '32B': 1, '32C': 1, '32D': 1,
            '34B': 1, '34C': 1, '34D': 1,
            '36B': 1, '36C': 1, '36D': 0,
            '38B': 1, '38C': 1, '38D': 0
        },
        'LIMAPR': {
            '32B': 2, '32C': 2, '32D': 1,
            '34B': 2, '34C': 2, '34D': 1,
            '36B': 2, '36C': 2, '36D': 1,
            '38B': 1, '38C': 1, '38D': 1
        },
        'PEARL': {
            '32B': 3, '32C': 3, '32D': 1,
            '34B': 3, '34C': 3, '34D': 1,
            '36B': 3, '36C': 3, '36D': 1,
            '38B': 2, '38C': 2, '38D': 1
        },
        'RESWPR': {
            '32B': 1, '32C': 1, '32D': 1,
            '34B': 1, '34C': 1, '34D': 1,
            '36B': 1, '36C': 1, '36D': 0,
            '38B': 1, '38C': 1, '38D': 0
        },
        'SKIN': {
            '32B': 4, '32C': 4, '32D': 2,
            '34B': 4, '34C': 4, '34D': 2,
            '36B': 4, '36C': 4, '36D': 2,
            '38B': 3, '38C': 3, '38D': 2
        },
        'WHITE': {
            '32B': 4, '32C': 4, '32D': 2,
            '34B': 4, '34C': 4, '34D': 2,
            '36B': 4, '36C': 4, '36D': 2,
            '38B': 3, '38C': 3, '38D': 2
        }
    },
    'A042': {
        'BLACK': {
            '32B': 3, '32C': 3, '32D': 2, '32Z': 2,
            '34B': 3, '34C': 3, '34D': 2, '34Z': 2,
            '36B': 3, '36C': 3, '36D': 2, '36Z': 2,
            '38B': 2, '38C': 2, '38D': 2, '38Z': 1,
            '40B': 2, '40C': 2, '40D': 1,
            '42B': 1, '42C': 1
        },
        'CHIVIO': {
            '32B': 0, '32C': 0, '32D': 0, '32Z': 0,
            '34B': 0, '34C': 0, '34D': 0, '34Z': 0,
            '36B': 0, '36C': 0, '36D': 0, '36Z': 0,
            '38B': 0, '38C': 0, '38D': 0, '38Z': 0,
            '40B': 0, '40C': 0, '40D': 0,
            '42B': 0, '42C': 0
        },
        'CMG': {
            '32B': 2, '32C': 2, '32D': 1, '32Z': 1,
            '34B': 2, '34C': 2, '34D': 1, '34Z': 1,
            '36B': 2, '36C': 2, '36D': 1, '36Z': 1,
            '38B': 2, '38C': 2, '38D': 1, '38Z': 1,
            '40B': 1, '40C': 1, '40D': 1,
            '42B': 1, '42C': 1
        },
        'DDO': {
            '32B': 0, '32C': 0, '32D': 0, '32Z': 0,
            '34B': 0, '34C': 0, '34D': 0, '34Z': 0,
            '36B': 0, '36C': 0, '36D': 0, '36Z': 0,
            '38B': 0, '38C': 0, '38D': 0, '38Z': 0,
            '40B': 0, '40C': 0, '40D': 0,
            '42B': 0, '42C': 0
        },
        'GSP': {
            '32B': 1, '32C': 1, '32D': 1, '32Z': 1,
            '34B': 1, '34C': 1, '34D': 1, '34Z': 1,
            '36B': 1, '36C': 1, '36D': 1, '36Z': 1,
            '38B': 1, '38C': 1, '38D': 1, '38Z': 1,
            '40B': 1, '40C': 1, '40D': 1,
            '42B': 1, '42C': 1
        },
        'ODM': {
            '32B': 2, '32C': 2, '32D': 1, '32Z': 1,
            '34B': 2, '34C': 2, '34D': 1, '34Z': 1,
            '36B': 2, '36C': 2, '36D': 1, '36Z': 1,
            '38B': 2, '38C': 2, '38D': 1, '38Z': 1,
            '40B': 1, '40C': 1, '40D': 1,
            '42B': 1, '42C': 1
        },
        'PEARL': {
            '32B': 3, '32C': 3, '32D': 2, '32Z': 2,
            '34B': 3, '34C': 3, '34D': 2, '34Z': 2,
            '36B': 3, '36C': 3, '36D': 2, '36Z': 2,
            '38B': 2, '38C': 2, '38D': 2, '38Z': 1,
            '40B': 2, '40C': 2, '40D': 1,
            '42B': 1, '42C': 1
        },
        'PURPLE': {
            '32B': 2, '32C': 2, '32D': 1, '32Z': 1,
            '34B': 2, '34C': 2, '34D': 1, '34Z': 1,
            '36B': 2, '36C': 2, '36D': 1, '36Z': 1,
            '38B': 2, '38C': 2, '38D': 1, '38Z': 1,
            '40B': 1, '40C': 1, '40D': 1,
            '42B': 1, '42C': 1
        },
        'RVL': {
            '32B': 1, '32C': 1, '32D': 1, '32Z': 1,
            '34B': 1, '34C': 1, '34D': 1, '34Z': 1,
            '36B': 1, '36C': 1, '36D': 1, '36Z': 1,
            '38B': 1, '38C': 1, '38D': 1, '38Z': 1,
            '40B': 1, '40C': 1, '40D': 1,
            '42B': 1, '42C': 1
        },
        'SKIN': {
            '32B': 3, '32C': 3, '32D': 2, '32Z': 2,
            '34B': 3, '34C': 3, '34D': 2, '34Z': 2,
            '36B': 3, '36C': 3, '36D': 2, '36Z': 2,
            '38B': 2, '38C': 2, '38D': 2, '38Z': 1,
            '40B': 2, '40C': 2, '40D': 1,
            '42B': 1, '42C': 1
        },
        'TMG': {
            '32B': 1, '32C': 1, '32D': 1, '32Z': 1,
            '34B': 1, '34C': 1, '34D': 1, '34Z': 1,
            '36B': 1, '36C': 1, '36D': 1, '36Z': 1,
            '38B': 1, '38C': 1, '38D': 1, '38Z': 1,
            '40B': 1, '40C': 1, '40D': 1,
            '42B': 1, '42C': 1
        },
        'WHITE': {
            '32B': 3, '32C': 3, '32D': 2, '32Z': 2,
            '34B': 3, '34C': 3, '34D': 2, '34Z': 2,
            '36B': 3, '36C': 3, '36D': 2, '36Z': 2,
            '38B': 2, '38C': 2, '38D': 2, '38Z': 1,
            '40B': 2, '40C': 2, '40D': 1,
            '42B': 1, '42C': 1
        }
    },
    'SB06': {
        'BLACK': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 5
        },
        'CAMPT': {
            'XS': 0
        },
        'CPM': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 5
        },
        'DHP': {
            'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XS': 0
        },
        'GRW': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 5
        },
        'GRYMRL': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 5
        },
        'MFL': {
            'S': 0, 'M': 0, 'L': 0, 'XL': 0, 'XS': 0
        },
        'PEARL': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 5
        },
        'SKIN': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 5
        },
        'TMG': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 0
        },
        'WHITE': {
            'S': 5, 'M': 5, 'L': 5, 'XL': 5, 'XS': 5
        }
    }
};

async function fetchStockData() {
    try {
        // Safely get the BSO section and its content container
        const bsoSection = document.getElementById('bso');
        if (!bsoSection) {
            console.error('BSO section not found');
            return;
        }

        // Find the paragraph or create one if not exists
        let stockContainer = bsoSection.querySelector('p');
        if (!stockContainer) {
            stockContainer = document.createElement('p');
            bsoSection.appendChild(stockContainer);
        }

        // Create container for dynamic content
        const bsoContainer = document.createElement('div');
        bsoContainer.className = 'bso-container';

        let itemsFound = false;

        // Fetch stock data
        const stockSnapshot = await database.ref('stock').once('value');
        const stockData = stockSnapshot.val() || {};

        specificItems.forEach(itemName => {
            // Ensure brand stock data exists for the item
            if (!brandStockData[itemName]) {
                console.warn(`No brand stock data found for item: ${itemName}`);
                return;
            }

            // Get all possible color and size combinations for the item from Brand Stock
            const brandStockCombinations = Object.entries(brandStockData[itemName] || {})
                .flatMap(([color, sizes]) => 
                    Object.keys(sizes).map(size => ({ color, size }))
                );

            // Create a set to track processed combinations
            const processedCombinations = new Set();

            // First, process existing stock entries
            const itemStocks = Object.values(stockData).filter(stock => stock['item name'] === itemName);
            itemStocks.forEach((stockItem) => {
                const { color, size } = stockItem;
                processedCombinations.add(`${color}-${size}`);
                addStockRow(itemName, stockItem, brandStockData);
                itemsFound = true;
            });

            // Then, process Brand Stock combinations not in existing stock
            brandStockCombinations.forEach(({ color, size }) => {
                if (!processedCombinations.has(`${color}-${size}`)) {
                    const syntheticStockItem = {
                        'item name': itemName,
                        color,
                        size,
                        quantity: 0
                    };
                    addStockRow(itemName, syntheticStockItem, brandStockData);
                    itemsFound = true;
                }
            });

            function addStockRow(itemName, stockItem, brandStockData) {
                // Find or create the item section
                let itemSection = bsoContainer.querySelector(`[data-item-name="${itemName}"]`);
                if (!itemSection) {
                    itemSection = document.createElement('div');
                    itemSection.className = 'bso-item-section';
                    itemSection.setAttribute('data-item-name', itemName);
            
                    // Item Name Header
                    const itemNameDiv = document.createElement('div');
                    itemNameDiv.className = 'bso-item-name';
                    itemNameDiv.textContent = itemName;
                    itemSection.appendChild(itemNameDiv);
            
                    // Create Table
                    const table = document.createElement('table');
                    table.className = 'bso-table';
                    table.innerHTML = `
                        <thead>
                            <tr>
                                <th>Color</th>
                                <th>Size</th>
                                <th>Stock</th>
                                <th>B.S</th>
                                <th>BSO</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    `;
                    itemSection.appendChild(table);
                    bsoContainer.appendChild(itemSection);
                }
            
                const tbody = itemSection.querySelector('tbody');
                const row = tbody.insertRow();
                const color = stockItem.color;
                const size = stockItem.size;
                const stockQuantity = stockItem.quantity || 0;
            
                // Get Brand Stock (BS) quantity, default to 0 if not found
                const brandStock = itemName in brandStockData && 
                                   brandStockData[itemName][color] && 
                                   brandStockData[itemName][color][size] 
                                   ? brandStockData[itemName][color][size] 
                                   : 0;
            
                row.insertCell(0).textContent = color;
                row.insertCell(1).textContent = size;
                row.insertCell(2).textContent = stockQuantity;
                row.insertCell(3).textContent = Math.max(brandStock, 0);
                
                // BSO Cell calculation
                const bsoCell = row.insertCell(4);
                let defaultBSOValue;
                
                // Specific rule for SB06
                if (itemName === 'SB06') {
                    if (brandStock === 0) {
                        // If Brand Stock is zero, BSO is zero
                        defaultBSOValue = 0;
                    } else if (brandStock <= 2) {
                        // If Brand Stock is 2 or less, BSO is 1
                        defaultBSOValue = 1;
                    } else {
                        // Default to existing logic
                        defaultBSOValue = Math.max(brandStock - stockQuantity, 0);
                    }
                } else {
                    // Existing logic for other items
                    defaultBSOValue = Math.max(brandStock - stockQuantity, 0);
                }
                
                bsoCell.innerHTML = `
                    <div class="bso-quantity-control">
                        <button class="bso-quantity-btn minus-btn">-</button>
                        <span class="bso-quantity">${defaultBSOValue}</span>
                        <button class="bso-quantity-btn plus-btn">+</button>
                    </div>
                `;
            }
        });

        // Only replace content if items were found
        if (itemsFound) {
            // Replace the placeholder paragraph with the new content
            stockContainer.parentNode.replaceChild(bsoContainer, stockContainer);

            // Add event listeners for +/- buttons
            bsoContainer.querySelectorAll('.plus-btn, .minus-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const quantitySpan = this.parentElement.querySelector('.bso-quantity');
                    let currentValue = parseInt(quantitySpan.textContent);

                    if (this.classList.contains('plus-btn')) {
                        quantitySpan.textContent = currentValue + 1;
                    } else if (this.classList.contains('minus-btn')) {
                        quantitySpan.textContent = Math.max(0, currentValue - 1);
                    }
                });
            });

            // Add export button after successful data load
            addExportButton();
        } else {
            // If no items found, show a message
            stockContainer.textContent = 'No stock items found for the specified items.';
        }
    } catch (error) {
        console.error('Error fetching stock data:', error);
        
        // Ensure there's always something in the section
        const bsoSection = document.getElementById('bso');
        if (bsoSection) {
            let stockContainer = bsoSection.querySelector('p');
            if (!stockContainer) {
                stockContainer = document.createElement('p');
                bsoSection.appendChild(stockContainer);
            }
            stockContainer.textContent = 'Error loading stock data. Please try again later.';
        }
    }
}
// Initialize the BSO view when the page loads
document.addEventListener('DOMContentLoaded', fetchStockData);

// Full VBA code as a single string
const FULL_VBA_CODE = `Sub UpdateQuantities()
    Dim lastRow As Long
    Dim formLastRow As Long
    Dim inputRow As Long
    Dim formRow As Long
    Dim ws As Worksheet
    Dim found As Boolean
    Dim unmatchedCount As Long
    
    Set ws = ActiveSheet
    
    ' Find last row of the form (searching up to row 5840)
    formLastRow = 5840
    
    ' Find last row of input data (starting from row 5842)
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    ' Clear any previous highlighting in the input area
    ws.Range("A5842:D" & lastRow).Interior.ColorIndex = xlNone
    
    unmatchedCount = 0
    
    ' Loop through each input row starting from 5842
    For inputRow = 5842 To lastRow
        found = False
        
        ' Get input values
        Dim inputStyle As String
        Dim inputColor As String
        Dim inputSize As String
        Dim inputQty As Variant
        
        inputStyle = ws.Cells(inputRow, 1).Value  ' Column A
        inputColor = ws.Cells(inputRow, 2).Value  ' Column B
        inputSize = ws.Cells(inputRow, 3).Value   ' Column C
        inputQty = ws.Cells(inputRow, 4).Value    ' Column D
        
        ' Skip empty rows
        If Trim(inputStyle) <> "" Then
            ' Loop through form rows to find matching entry
            For formRow = 1 To formLastRow
                ' Get form values
                Dim formStyle As String
                Dim formColor As String
                Dim formSize As String
                
                formStyle = ws.Cells(formRow, "D").Value   ' Style column (changed from C to D)
                formColor = ws.Cells(formRow, "F").Value   ' Color column (changed from E to F)
                formSize = ws.Cells(formRow, "J").Value    ' Size column (changed from I to J)
                
                ' Check if all criteria match
                If formStyle = inputStyle And _
                   formColor = inputColor And _
                   formSize = inputSize Then
                    
                    ' Update quantity in column M
                    ws.Cells(formRow, "M").Value = inputQty
                    found = True
                    Exit For
                End If
            Next formRow
            
            ' Highlight unmatched entries in red
            If Not found Then
                ' Highlight entire row in light red
                With ws.Range("A" & inputRow & ":D" & inputRow).Interior
                    .Color = RGB(255, 200, 200)  ' Light red color
                End With
                unmatchedCount = unmatchedCount + 1
                
                ' Log unmatched entry details
                Debug.Print "No match found for: Style=" & inputStyle & _
                           ", Color=" & inputColor & _
                           ", Size=" & inputSize
            End If
        End If
    Next inputRow
    
    ' Show completion message with count of unmatched entries
    If unmatchedCount > 0 Then
        MsgBox "Update complete!" & vbNewLine & _
               unmatchedCount & " unmatched entries were found and highlighted in red.", _
               vbInformation
    Else
        MsgBox "Update complete! All entries were successfully matched.", _
               vbInformation
    End If
End Sub`;

// Export to XLS function
function exportToXLS() {
    // Create a workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Prepare stock data worksheet
    const wsData = [];

    // Add header row
    wsData.push(['Item Name', 'Color', 'Size', 'Quantity (BSO)']);

    // Select all rows from the BSO container
    const bsoContainer = document.querySelector('.bso-container');
    if (!bsoContainer) {
        alert('No stock data to export');
        return;
    }

    // Iterate through each item section
    bsoContainer.querySelectorAll('.bso-item-section').forEach(itemSection => {
        const itemName = itemSection.getAttribute('data-item-name');
        const table = itemSection.querySelector('table');
        
        // Iterate through table rows (skip header row)
        table.querySelectorAll('tbody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            const color = cells[0].textContent;
            const size = cells[1].textContent;
            const quantity = parseInt(cells[4].querySelector('.bso-quantity').textContent);

            // Only add row if quantity is greater than 0
            if (quantity > 0) {
                wsData.push([itemName, color, size, quantity]);
            }
        });
    });

    // Create stock data worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Create instructions worksheet (unchanged)
    const instructionsData = [
        ['STOCK ORDER INSTRUCTIONS'],
        [''],
        ['1. Data Export Instructions:'],
        ['   - This file contains stock order data'],
        ['   - Columns: A (Item Name), B (Color), C (Size), D (Quantity)'],
        [''],
        ['2. Update Process:'],
        ['Copy the above data (don\'t copy header) and paste it in the main order format of company from A5838'],
        [''],
        ['3. Macro Installation:'],
        ['Then press (Alt + F11) and create new module and paste the VBA code from cell B15 there and run it'],
        [''],
        ['4. VBA Code (Copy from cell below):'],
        [''],
        [FULL_VBA_CODE],
        [''],
        ['5. Macro Execution:'],
        ['A new module will be created with the macro. Click on Run button or press F5 to execute.']
    ];

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);

    // Add both worksheets to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Order Data');
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

    // Generate filename with current date
    const today = new Date();
    const dateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const filename = `STOCKORDER_${dateString}.xlsx`;

    // Save the file
    XLSX.writeFile(wb, filename);
}

// Remaining code stays the same as in the previous implementation
// (addExportButton, fetchStockData, loadSheetJS, etc.)
// ... [rest of the previous code remains unchanged]

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadSheetJS();
        await fetchStockData();
    } catch (error) {
        console.error('Error initializing stock data:', error);
    }
});
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
function addExportButton() {
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export to XLS';
    exportButton.className = 'export-btn';
    exportButton.style.cssText = `
        display: block;
        margin: 20px auto;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
    `;
    exportButton.addEventListener('click', exportToXLS);

    // Append to BSO container instead of BSO section
    const bsoContainer = document.querySelector('.bso-container');
    if (bsoContainer) {
        bsoContainer.appendChild(exportButton);
    } else {
        console.error('BSO container not found');
    }
}
