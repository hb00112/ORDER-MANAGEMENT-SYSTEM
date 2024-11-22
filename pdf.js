document.addEventListener('DOMContentLoaded', function() {
    const pdfSection = document.getElementById('pdf');
    const buttons = document.querySelectorAll('.pdf-editor-action-btn');
    const closeBtns = document.querySelectorAll('.pdf-editor-close-btn');
    
    // Function to show main PDF section
    function showPdfSection() {
        pdfSection.style.display = 'block';
        document.querySelectorAll('.pdf-editor-content-section').forEach(section => {
            section.style.display = 'none';
        });
    }

    // Function to show specific content section
    function showContentSection(sectionId) {
        pdfSection.style.display = 'none';
        document.querySelectorAll('.pdf-editor-content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(sectionId).style.display = 'block';
    }

    // Button click handlers
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const contentId = this.dataset.section + 'Content';
            showContentSection(contentId);
        });
    });

    // Close button handlers
    closeBtns.forEach(btn => {
        btn.addEventListener('click', showPdfSection);
    });
});

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';


// POSHAK NAME CHANGE

document.addEventListener('DOMContentLoaded', function() {
    const pdfInput = document.getElementById('pdfInput');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const processButton = document.getElementById('processButton');
    
    let pdfFile = null;

    pdfInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            pdfFile = file;
            await renderPreview(file);
            processButton.disabled = false;
        }
    });

    async function renderPreview(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            
            const viewport = page.getViewport({ scale: 1.5 });
            pdfCanvas.width = viewport.width;
            pdfCanvas.height = viewport.height;

            await page.render({
                canvasContext: pdfCanvas.getContext('2d'),
                viewport: viewport
            }).promise;
        } catch (error) {
            console.error('Preview error:', error);
            alert('Error previewing PDF');
        }
    }

    // Function to process a single page
    async function processPage(page, pdfJsPage, helveticaFont, helveticaBoldFont) {
        const textContent = await pdfJsPage.getTextContent();
        const replacements = [];

        const replacementRules = [
            {
                match: (text) => text.includes('Bill To:') && text.includes('TAVORA ENTERPRISES'),
                newText: 'Bill To: POSHAK RETAIL',
                bold: true
            },
            {
                match: (text) => text.includes('Ship To:') && text.includes('TAVORA ENTERPRISES'),
                newText: 'Ship To: POSHAL RETAIL',
                bold: true
            },
            {
                match: (text) => text.includes('NEAR NAVTARA RESTAURANT') || text.includes('MUNIC PANJIM GOA'),
                newText: 'C-3 TECHNO PARK,CHOGM ROAD',
                bold: false
            },
            {
                match: (text) => text.includes('PANJIM') && text.includes('State: GOA'),
                newText: 'PORVORIM      State: GOA(30)',
                bold: false
            },
            {
                match: (text) => text.includes('GSTIN: 30AAAFT8453E1ZH'),
                newText: 'GSTIN: 30AAVPL8498C1ZA',
                bold: false
            }
        ];

        // Process each text item on the page
        for (const item of textContent.items) {
            const text = item.str.trim();
            const [x, y] = item.transform.slice(4, 6);

            for (const rule of replacementRules) {
                if (rule.match(text)) {
                    console.log(`Found matching text on page: ${text}`);
                    replacements.push({
                        x,
                        y,
                        oldText: text,
                        newText: rule.newText,
                        font: rule.bold ? helveticaBoldFont : helveticaFont,
                        size: item.height
                    });
                    break;
                }
            }
        }

        // Apply replacements for this page
        for (const replacement of replacements) {
            // Remove old text by covering with white rectangle
            page.drawRectangle({
                x: replacement.x,
                y: replacement.y,
                width: replacement.font.widthOfTextAtSize(replacement.oldText, replacement.size) + 2,
                height: replacement.size + 2,
                color: PDFLib.rgb(1, 1, 1),  // White
            });

            // Add new text
            page.drawText(replacement.newText, {
                x: replacement.x,
                y: replacement.y,
                font: replacement.font,
                size: replacement.size,
            });
        }

        return replacements.length > 0;
    }

    processButton.addEventListener('click', async function() {
        if (!pdfFile) return;

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // Embed fonts once for the entire document
            const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            const helveticaBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

            const totalPages = pdfDoc.getPageCount();
            console.log(`Processing ${totalPages} pages`);
            
            let modificationsFound = false;

            // Process each page
            for (let i = 0; i < totalPages; i++) {
                const pageNum = i + 1;
                console.log(`Processing page ${pageNum}`);
                
                const pdfLibPage = pdfDoc.getPages()[i];
                const pdfJsPage = await pdfJsDoc.getPage(pageNum);
                
                const pageModified = await processPage(pdfLibPage, pdfJsPage, helveticaFont, helveticaBoldFont);
                if (pageModified) {
                    modificationsFound = true;
                }
            }

            if (!modificationsFound) {
                console.log('No matching text found in any page');
                alert('No matching text found to replace');
                return;
            }

            // Save and download
            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'modified_invoice.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Processing error:', error);
            alert('Error processing PDF. Check console for details.');
        }
    });
});


document.addEventListener('DOMContentLoaded', function() {
    const cnPdfInput = document.getElementById('cnPdfInput');
    const cnPdfCanvas = document.getElementById('cnPdfCanvas');
    const cnProcessButton = document.getElementById('cnProcessButton');
    
    let pdfFile = null;
    let helveticaFont = null; // Declare at the top level

    function numberToWords(num) {
        const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
        const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
        
        function convertLessThanThousand(n) {
            if (n === 0) return '';
            let result = '';
            if (n >= 100) {
                result += ones[Math.floor(n / 100)] + ' HUNDRED ';
                n %= 100;
                if (n > 0) result += 'AND ';
            }
            if (n >= 20) {
                result += tens[Math.floor(n / 10)] + ' ';
                n %= 10;
                if (n > 0) result += ones[n] + ' ';
            } else if (n >= 10) {
                result += teens[n - 10] + ' ';
            } else if (n > 0) {
                result += ones[n] + ' ';
            }
            return result;
        }
        
        let result = '';
        if (num >= 1000) {
            result += convertLessThanThousand(Math.floor(num / 1000)) + 'THOUSAND ';
            num %= 1000;
        }
        result += convertLessThanThousand(num);
        return result.trim() + ' ONLY';
    }

    function alignDecimal(value, x, maxWidth) {
        if (!helveticaFont) {
            console.error('Font not initialized');
            return { integerPart: value, decimalPart: '', integerX: x, decimalX: x };
        }
        
        const parts = value.toString().split('.');
        const integerWidth = helveticaFont.widthOfTextAtSize(parts[0], 10);
        const decimalWidth = helveticaFont.widthOfTextAtSize('.' + (parts[1] || '00'), 10);
        
        // Calculate position to align decimal points
        const decimalX = x + (maxWidth - decimalWidth);
        return {
            integerPart: parts[0],
            decimalPart: '.' + (parts[1] || '00'),
            integerX: decimalX - integerWidth,
            decimalX: decimalX
        };
    }

    async function findFieldValue(textContent, label) {
        let labelItem = null;
        let valueItem = null;
        let maxX = 0;

        for (const item of textContent.items) {
            if (item.str.includes(label)) {
                labelItem = item;
                break;
            }
        }

        if (!labelItem) return null;

        const labelY = labelItem.transform[5];
        for (const item of textContent.items) {
            if (Math.abs(item.transform[5] - labelY) < 2) {
                const str = item.str.trim();
                if (str.match(/^-?\d+\.?\d*$/) && item.transform[4] > maxX) {
                    maxX = item.transform[4];
                    valueItem = item;
                }
            }
        }

        if (valueItem) {
            return {
                value: parseFloat(valueItem.str),
                x: valueItem.transform[4],
                y: valueItem.transform[5],
                height: valueItem.height,
                str: valueItem.str
            };
        }

        return null;
    }

    async function findAmountInWords(textContent) {
        for (const item of textContent.items) {
            if (item.str.toLowerCase().includes('amount') && 
                item.str.toLowerCase().includes('words')) {
                // Find the next line containing the actual amount text
                const y = item.transform[5];
                let amountText = '';
                let amountY = 0;
                let amountX = 0;
                
                for (const textItem of textContent.items) {
                    if (textItem.transform[5] < y && 
                        textItem.transform[5] > y - 20 && 
                        textItem.str.includes('ONLY')) {
                        amountText = textItem.str;
                        amountY = textItem.transform[5];
                        amountX = textItem.transform[4];
                        break;
                    }
                }
                
                return {
                    x: amountX,
                    y: amountY,
                    text: amountText,
                    height: item.height
                };
            }
        }
        return null;
    }

    async function processPage(page, pdfJsPage) {
        const textContent = await pdfJsPage.getTextContent();
        const replacements = [];

        // Find SUB TOTAL value
        const subTotalInfo = await findFieldValue(textContent, 'SUB TOTAL');
        if (!subTotalInfo) return false;

        const subTotal = subTotalInfo.value;
        const netAmountRounded = Math.round(subTotal);
        const roundingAmount = (netAmountRounded - subTotal).toFixed(2);
        const crNoteAmount = "0.00";
        const netAmount = netAmountRounded.toFixed(2);

        // Calculate maximum width for decimal alignment
        const maxWidth = Math.max(
            helveticaFont.widthOfTextAtSize(crNoteAmount, 10),
            helveticaFont.widthOfTextAtSize(roundingAmount, 10),
            helveticaFont.widthOfTextAtSize(netAmount, 10)
        );

        // Find and process all numeric fields
        const fieldsToReplace = [
            { label: 'CR NOTE AMOUNT', value: crNoteAmount },
            { label: 'ROUNDING AMOUNT', value: roundingAmount },
            { label: 'NET AMOUNT', value: netAmount }
        ];

        for (const field of fieldsToReplace) {
            const fieldInfo = await findFieldValue(textContent, field.label);
            if (fieldInfo) {
                const aligned = alignDecimal(field.value, fieldInfo.x, maxWidth);
                
                // Cover old value
                const coverWidth = helveticaFont.widthOfTextAtSize(fieldInfo.str, fieldInfo.height) + 10;
                page.drawRectangle({
                    x: fieldInfo.x - 5,
                    y: fieldInfo.y - 2,
                    width: coverWidth,
                    height: fieldInfo.height + 4,
                    color: PDFLib.rgb(1, 1, 1)
                });

                // Draw new aligned value
                page.drawText(aligned.integerPart, {
                    x: aligned.integerX,
                    y: fieldInfo.y,
                    font: helveticaFont,
                    size: fieldInfo.height
                });
                
                page.drawText(aligned.decimalPart, {
                    x: aligned.decimalX,
                    y: fieldInfo.y,
                    font: helveticaFont,
                    size: fieldInfo.height
                });

                replacements.push(fieldInfo);
            }
        }

        // Replace amount in words
        const amountInWords = await findAmountInWords(textContent);
        if (amountInWords) {
            // Cover the entire previous amount in words
            const coverWidth = helveticaFont.widthOfTextAtSize(amountInWords.text, amountInWords.height) + 20;
            page.drawRectangle({
                x: amountInWords.x - 10,
                y: amountInWords.y - 2,
                width: coverWidth,
                height: amountInWords.height + 4,
                color: PDFLib.rgb(1, 1, 1)
            });

            // Draw new amount in words
            page.drawText(numberToWords(netAmountRounded), {
                x: amountInWords.x,
                y: amountInWords.y,
                font: helveticaFont,
                size: amountInWords.height
            });

            replacements.push(amountInWords);
        }

        return replacements.length > 0;
    }

    // Event listeners and preview function remain the same
    cnPdfInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            pdfFile = file;
            await renderPreview(file);
            cnProcessButton.disabled = false;
        }
    });

    async function renderPreview(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            
            const viewport = page.getViewport({ scale: 1.5 });
            cnPdfCanvas.width = viewport.width;
            cnPdfCanvas.height = viewport.height;

            await page.render({
                canvasContext: cnPdfCanvas.getContext('2d'),
                viewport: viewport
            }).promise;
        } catch (error) {
            console.error('Preview error:', error);
            alert('Error previewing PDF');
        }
    }

    cnProcessButton.addEventListener('click', async function() {
        if (!pdfFile) return;

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // Initialize the font before processing
            helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            const totalPages = pdfDoc.getPageCount();
            let modificationsFound = false;

            for (let i = 0; i < totalPages; i++) {
                const pageNum = i + 1;
                const pdfLibPage = pdfDoc.getPages()[i];
                const pdfJsPage = await pdfJsDoc.getPage(pageNum);
                
                const pageModified = await processPage(pdfLibPage, pdfJsPage);
                if (pageModified) modificationsFound = true;
            }

            if (!modificationsFound) {
                alert('No matching text found to replace');
                return;
            }

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'modified_cn.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Processing error:', error);
            alert('Error processing PDF. Check console for details.');
        }
    });
});