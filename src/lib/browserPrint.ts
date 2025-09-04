// Browser printing with exact thermal sizing
export function printReceiptElement(element: HTMLElement, thermalWidth: number = 80): void {
  // Create a new window for printing with exact dimensions
  const printWindow = window.open('', '_blank', `width=${thermalWidth * 4},height=600`)
  
  if (!printWindow) {
    // Fallback to regular print if popup blocked
    window.print()
    return
  }

  // Get the receipt HTML
  const receiptHTML = element.outerHTML
  
  // Create print document with exact sizing
  const printDocument = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt Print</title>
      <style>
        @page {
          size: ${thermalWidth}mm auto;
          margin: 0;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: ${thermalWidth}mm !important;
          max-width: ${thermalWidth}mm !important;
          min-width: ${thermalWidth}mm !important;
          background: white !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
        
        .receipt {
          width: ${thermalWidth}mm !important;
          max-width: ${thermalWidth}mm !important;
          min-width: ${thermalWidth}mm !important;
          padding: 8px 10px !important;
          margin: 0 !important;
          border: none !important;
          box-sizing: border-box !important;
          font-size: 12px !important;
          line-height: 1.3 !important;
          color: #000 !important;
          background: white !important;
        }
        
        .receipt .center { text-align: center; }
        .receipt .right { text-align: right; }
        .receipt .muted { color: #555; }
        .receipt .bold { font-weight: 700; }
        
        .receipt hr {
          border: none;
          border-top: 1px dashed #999;
          margin: 6px 0;
        }
        
        .receipt table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .receipt table th,
        .receipt table td {
          padding: 2px 0;
        }
      </style>
    </head>
    <body>
      ${receiptHTML}
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
  `
  
  printWindow.document.write(printDocument)
  printWindow.document.close()
}
