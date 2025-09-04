import { captureElementToPdfBase64 } from './printService'

interface DownloadOptions {
  thermalWidth?: number
  filename?: string
}

interface DownloadResult {
  success: boolean
  dimensions?: {
    widthMm: number
    heightMm: number
  }
  error?: string
}

export async function downloadReceiptAsPdf(element: HTMLElement, options: DownloadOptions = {}): Promise<DownloadResult> {
  const { thermalWidth = 80, filename = 'receipt.pdf' } = options
  
  try {
    // Generate PDF with exact thermal dimensions
    const result = await captureElementToPdfBase64(element, { thermalWidth })
    
    // Convert base64 to blob
    const binaryString = atob(result.base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/pdf' })
    
    // Create download link and trigger download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true, dimensions: result.dimensions }
  } catch (error) {
    console.error('PDF download failed:', error)
    return { success: false, error: (error as Error).message }
  }
}
