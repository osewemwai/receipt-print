import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CaptureOptions {
  // Deprecated: previously used to target thermal widths; ignored in readable mode
  thermalWidth?: number;
  // When true (default), generate a readable A4 document and scale the receipt to fit with margins
  readable?: boolean;
  // Page margins in mm when readable is true
  marginMm?: number;
}

interface CaptureResult {
  base64: string;
  dimensions: {
    widthMm: number;
    heightMm: number;
  };
}

export async function captureElementToPdfBase64(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  if (!element) throw new Error("No element to capture");

  const { thermalWidth = 80, readable = true, marginMm = 10 } = options; // Defaults favor readability
  // Use rendered CSS size to maintain aspect ratio (avoid 96-DPI guess)
  const rect = element.getBoundingClientRect();
  const cssWidthPx = rect.width || element.offsetWidth;
  const cssHeightPx = rect.height || element.offsetHeight;
  const mmPerPx = thermalWidth / cssWidthPx; // map CSS px -> mm via width (used if not readable)

  // Ensure white background for PDF
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    width: cssWidthPx,
    height: cssHeightPx,
    onclone: (doc) => {
      // Ensure capture-safe colors in the cloned DOM
      const cloneEl = doc.querySelector(".receipt") as HTMLElement | null;
      if (cloneEl) {
        cloneEl.classList.add("capture-safe");
        // Inline critical fallbacks just in case
        cloneEl.style.backgroundColor = "#ffffff";
        cloneEl.style.color = "#000000";
      }
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const aspect = cssHeightPx / cssWidthPx;

  let pdf: jsPDF;
  let outWidthMm: number;
  let outHeightMm: number;
  let x = 0;
  let y = 0;
  // Dimensions to return to the print agent (the physical page size)
  let pageWidthForAgentMm: number;
  let pageHeightForAgentMm: number;

  if (readable) {
    // Produce a standard A4 portrait page and scale image to fit within margins
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const maxWidthMm = pageWidthMm - 2 * marginMm;
    const maxHeightMm = pageHeightMm - 2 * marginMm;
    // Try fitting to width first
    let widthMm = maxWidthMm;
    let heightMm = widthMm * aspect;
    if (heightMm > maxHeightMm) {
      heightMm = maxHeightMm;
      widthMm = heightMm / aspect;
    }
    outWidthMm = widthMm;
    outHeightMm = heightMm;
    x = marginMm + (maxWidthMm - widthMm) / 2;
    y = marginMm + (maxHeightMm - heightMm) / 2;
    pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(imgData, "PNG", x, y, outWidthMm, outHeightMm);
    // Report the actual page size to the agent so it sets matching media
    pageWidthForAgentMm = pageWidthMm;
    pageHeightForAgentMm = pageHeightMm;
  } else {
    // Thermal exact sizing path (legacy)
    outWidthMm = thermalWidth;
    outHeightMm = cssHeightPx * mmPerPx;
    pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [outWidthMm, outHeightMm],
    });
    pdf.addImage(imgData, "PNG", 0, 0, outWidthMm, outHeightMm);
    // For thermal, the page equals the content
    pageWidthForAgentMm = outWidthMm;
    pageHeightForAgentMm = outHeightMm;
  }

  // Return base64 and dimensions for the print agent
  const dataUri = pdf.output("datauristring");
  const base64 = dataUri.split(",")[1];
  return {
    base64,
    dimensions: {
      widthMm: Math.round(pageWidthForAgentMm * 100) / 100,
      heightMm: Math.ceil(pageHeightForAgentMm),
    },
  };
}
