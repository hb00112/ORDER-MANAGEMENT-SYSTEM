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
    let helveticaFont = null;
    let helveticaBoldFont = null;

    function numberToWords(num) {
        const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
        const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
        
        function convertLessThanHundred(n) {
            if (n === 0) return '';
            if (n < 10) return ones[n];
            if (n < 20) return teens[n - 10];
            
            const ten = Math.floor(n / 10);
            const one = n % 10;
            return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
        }
        
        function convertLessThanThousand(n) {
            if (n === 0) return '';
            
            const hundred = Math.floor(n / 100);
            const remainder = n % 100;
            
            let result = '';
            if (hundred > 0) {
                result += ones[hundred] + ' HUNDRED';
                if (remainder > 0) result += ' AND ';
            }
            if (remainder > 0) {
                result += convertLessThanHundred(remainder);
            }
            return result;
        }
        
        if (num === 0) return 'ZERO ONLY';
        
        let result = '';
        
        const lakh = Math.floor(num / 100000);
        num %= 100000;
        
        const thousand = Math.floor(num / 1000);
        num %= 1000;
        
        const remainder = num;
        
        if (lakh > 0) {
            result += convertLessThanThousand(lakh) + ' LAKH ';
        }
        
        if (thousand > 0) {
            result += convertLessThanHundred(thousand) + ' THOUSAND ';
        }
        
        if (remainder > 0) {
            if (result !== '' && remainder < 100) {
                result += 'AND ';
            }
            result += convertLessThanThousand(remainder);
        }
        
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

    async function findAndHideText(page, textContent, searchText) {
        for (const item of textContent.items) {
            if (item.str.includes(searchText)) {
                // Find the end of the line
                const lineY = item.transform[5];
                let maxX = item.transform[4];
                let lineHeight = item.height;
                
                // Find other items on the same line
                for (const lineItem of textContent.items) {
                    if (Math.abs(lineItem.transform[5] - lineY) < 2) {
                        const itemEndX = lineItem.transform[4] + 
                            helveticaFont.widthOfTextAtSize(lineItem.str, lineItem.height);
                        maxX = Math.max(maxX, itemEndX);
                    }
                }
                
                // Draw white rectangle with reduced padding
                page.drawRectangle({
                    x: item.transform[4] - 0.2,     // Reduced from -0.5
                    y: lineY - 0.05,                // Reduced from -0.1
                    width: maxX - item.transform[4] + 1, // Reduced from 2
                    height: lineHeight + 0.1,       // Reduced from 0.2
                    color: PDFLib.rgb(1, 1, 1)
                });
                
                return true;
            }
        }
        return false;
    }

    async function findSubTotalPosition(textContent, page) {
        const { width } = page.getSize();
        const rightMargin = 1.1 * 28.35;
        const rightEdgeX = width - rightMargin;
        
        let subTotalY = null;
        
        for (const item of textContent.items) {
            if (item.str.includes('SUB TOTAL')) {
                subTotalY = item.transform[5];
                break;
            }
        }
    
        if (!subTotalY) return null;
    
        return {
            rightEdgeX: rightEdgeX,
            y: subTotalY
        };
    }

    async function findAmountInWords(textContent) {
        const searchText = "NET AMOUNT (IN WORDS) Rs:";
        let labelItem = null;
        let existingText = null;
        
        for (const item of textContent.items) {
            if (item.str.includes(searchText)) {
                labelItem = item;
                const labelY = item.transform[5];
                const labelEndX = item.transform[4] + helveticaFont.widthOfTextAtSize(item.str, item.height);
                
                for (const textItem of textContent.items) {
                    if (Math.abs(textItem.transform[5] - labelY) < 2 && 
                        textItem.transform[4] > labelEndX) {
                        existingText = textItem;
                    }
                }
                break;
            }
        }
        
        if (!labelItem) {
            const alternativeSearches = [
                "NET AMOUNT (IN WORDS)",
                "Amount in words",
                "AMOUNT IN WORDS"
            ];
            
            for (const altText of alternativeSearches) {
                for (const item of textContent.items) {
                    if (item.str.includes(altText)) {
                        labelItem = item;
                        break;
                    }
                }
                if (labelItem) break;
            }
        }
        
        if (labelItem) {
            return {
                labelX: labelItem.transform[4],
                labelY: labelItem.transform[5],
                labelText: labelItem.str,
                existingText: existingText ? existingText.str : '',
                existingX: existingText ? existingText.transform[4] : (labelItem.transform[4] + helveticaFont.widthOfTextAtSize(labelItem.str, labelItem.height) + 5),
                height: labelItem.height
            };
        }
        
        return null;
    }

    async function processPage(page, pdfJsPage) {
        const textContent = await pdfJsPage.getTextContent();
        const replacements = [];

        // Hide specific text elements
        await findAndHideText(page, textContent, "Bottom Scheme");
        await findAndHideText(page, textContent, "QPS");
        await findAndHideText(page, textContent, "Disc:");
        await findAndHideText(page, textContent, "SCHEME DETAILS"); 

        const subTotalInfo = await findFieldValue(textContent, 'SUB TOTAL');
        if (!subTotalInfo) return false;

        const subTotal = subTotalInfo.value;
        const netAmountRounded = Math.round(subTotal);
        const roundingAmount = (netAmountRounded - subTotal).toFixed(2);
        const crNoteAmount = "0.00";
        const netAmount = netAmountRounded.toFixed(2);

        const leftOffset = 4.535;

        const fieldsToReplace = [
            { label: 'SUB TOTAL', value: subTotal.toFixed(2) },
            { label: 'CR NOTE AMOUNT', value: crNoteAmount },
            { label: 'ROUNDING AMOUNT', value: roundingAmount },
            { label: 'NET AMOUNT', value: netAmount }
        ];

        for (const field of fieldsToReplace) {
            const fieldInfo = await findFieldValue(textContent, field.label);
            if (fieldInfo) {
                const coverWidth = helveticaFont.widthOfTextAtSize(fieldInfo.str, fieldInfo.height) + 10;
                page.drawRectangle({
                    x: fieldInfo.x - 2,
                    y: fieldInfo.y - 1,
                    width: coverWidth * 0.9,
                    height: fieldInfo.height + 2,
                    color: PDFLib.rgb(1, 1, 1)
                });

                const fontToUse = field.label === 'NET AMOUNT' ? helveticaBoldFont : helveticaFont;
                const valueStr = field.value.toString();
                
                const textWidth = fontToUse.widthOfTextAtSize(valueStr, fieldInfo.height);
                const originalRightEdge = fieldInfo.x + coverWidth * 0.9;
                
                page.drawText(valueStr, {
                    x: (originalRightEdge - textWidth) - leftOffset,
                    y: fieldInfo.y,
                    font: fontToUse,
                    size: fieldInfo.height
                });

                replacements.push(fieldInfo);
            }
        }

        // Handle amount in words
        const amountInWords = await findAmountInWords(textContent);
        if (amountInWords) {
            page.drawRectangle({
                x: amountInWords.labelX - 2,
                y: amountInWords.labelY - 0.5,
                width: helveticaFont.widthOfTextAtSize(amountInWords.labelText, amountInWords.height) + 10,
                height: amountInWords.height + 1,
                color: PDFLib.rgb(1, 1, 1)
            });
            
            if (amountInWords.existingText) {
                const existingTextWidth = helveticaFont.widthOfTextAtSize(amountInWords.existingText, amountInWords.height);
                page.drawRectangle({
                    x: amountInWords.existingX - 2,
                    y: amountInWords.labelY - 0.5,
                    width: existingTextWidth + 10,
                    height: amountInWords.height + 1,
                    color: PDFLib.rgb(1, 1, 1)
                });
            }
            
            page.drawText("NET AMOUNT (IN WORDS) Rs:", {
                x: amountInWords.labelX,
                y: amountInWords.labelY,
                font: helveticaFont,
                size: amountInWords.height
            });
            
            const labelWidth = helveticaFont.widthOfTextAtSize("NET AMOUNT (IN WORDS) Rs:", amountInWords.height);
            page.drawText(numberToWords(netAmountRounded), {
                x: amountInWords.labelX + labelWidth + 5,
                y: amountInWords.labelY,
                font: helveticaFont,
                size: amountInWords.height
            });
            
            replacements.push(amountInWords);
        }

        return replacements.length > 0;
    }

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

    cnPdfInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            pdfFile = file;
            await renderPreview(file);
            cnProcessButton.disabled = false;
        }
    });

    cnProcessButton.addEventListener('click', async function() {
        if (!pdfFile) return;

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            helveticaBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            
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


//MERGING
// Import required libraries (Add these in your HTML)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

class PDFMerger {
    constructor() {
        this.selectedFiles = [];
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Main sections
        this.mergeButton = document.getElementById('mergePdfInput');
        this.filesList = document.getElementById('selectedFilesList');
        this.previewGrid = document.getElementById('pdfPreviewGrid');
        this.mergeButton = document.getElementById('mergeButton');
        
        // Button grid management
        this.buttons = document.querySelectorAll('.pdf-editor-action-btn');
        this.sections = document.querySelectorAll('.pdf-editor-content-section');
        this.closeButtons = document.querySelectorAll('.pdf-editor-close-btn');
    }

    attachEventListeners() {
        // File input handling
        document.getElementById('mergePdfInput').addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Button click handlers
        this.buttons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.getAttribute('data-section');
                this.showSection(sectionId);
            });
        });

        // Close button handlers
        this.closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.hideAllSections();
            });
        });

        // Merge button handler
        this.mergeButton.addEventListener('click', () => {
            this.mergePDFs();
        });

        // Drag and drop handlers
        const dropZone = document.querySelector('.upload-section');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleFileSelection(e.dataTransfer.files);
        });
    }

    async handleFileSelection(files) {
        const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        
        if (pdfFiles.length === 0) {
            alert('Please select PDF files only.');
            return;
        }

        for (const file of pdfFiles) {
            if (!this.selectedFiles.some(f => f.name === file.name)) {
                this.selectedFiles.push(file);
                await this.addFileToList(file);
                await this.generatePreview(file);
            }
        }

        this.updateMergeButtonState();
    }

    async addFileToList(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'selected-file-item';
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <button class="file-remove-btn" data-filename="${file.name}">&times;</button>
        `;

        fileItem.querySelector('.file-remove-btn').addEventListener('click', () => {
            this.removeFile(file.name);
        });

        this.filesList.appendChild(fileItem);
    }

    async generatePreview(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const viewport = page.getViewport({ scale: 0.5 });

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            previewItem.appendChild(canvas);
            this.previewGrid.appendChild(previewItem);
        } catch (error) {
            console.error('Error generating preview:', error);
        }
    }

    removeFile(filename) {
        this.selectedFiles = this.selectedFiles.filter(file => file.name !== filename);
        
        // Remove from list
        const fileItem = this.filesList.querySelector(`[data-filename="${filename}"]`).parentNode;
        fileItem.remove();

        // Remove preview
        // Since previews don't have specific identifiers, we'll rebuild the preview grid
        this.previewGrid.innerHTML = '';
        this.selectedFiles.forEach(file => this.generatePreview(file));

        this.updateMergeButtonState();
    }

    updateMergeButtonState() {
        this.mergeButton.disabled = this.selectedFiles.length < 2;
    }

    showSection(sectionId) {
        this.hideAllSections();
        document.getElementById(`${sectionId}Content`).classList.remove('hidden');
    }

    hideAllSections() {
        this.sections.forEach(section => section.classList.add('hidden'));
    }

    async mergePDFs() {
        if (this.selectedFiles.length < 2) {
            alert('Please select at least 2 PDF files to merge.');
            return;
        }

        try {
            this.mergeButton.classList.add('loading');
            this.mergeButton.disabled = true;

            const mergedPdf = await PDFLib.PDFDocument.create();

            for (const file of this.selectedFiles) {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            const mergedPdfFile = await mergedPdf.save();
            this.downloadMergedPDF(mergedPdfFile);

        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('An error occurred while merging the PDFs. Please try again.');
        } finally {
            this.mergeButton.classList.remove('loading');
            this.mergeButton.disabled = false;
        }
    }

    downloadMergedPDF(pdfBytes) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `merged_document_${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Initialize the PDF Merger when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PDFMerger();
});
