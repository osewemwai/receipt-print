// Thermal receipt size configurations
export interface ThermalSize {
  width: number
  name: string
}

export const THERMAL_SIZES = {
  SMALL: { width: 58, name: '58mm' } as ThermalSize,
  STANDARD: { width: 80, name: '80mm' } as ThermalSize,
  LARGE: { width: 112, name: '112mm' } as ThermalSize
} as const

export const DEFAULT_THERMAL_SIZE = THERMAL_SIZES.STANDARD

export interface PrintOptions {
  copies: number
  widthMm: number
  scaling: string
  fitToPage: boolean
  centerOnPage: boolean
  margins: {
    top: number
    left: number
    right: number
    bottom: number
  }
}

// Print options for maintaining exact size
export function getThermalPrintOptions(thermalSize: ThermalSize = DEFAULT_THERMAL_SIZE, copies: number = 1): PrintOptions {
  return {
    copies,
    widthMm: thermalSize.width,
    scaling: 'none',
    fitToPage: false,
    centerOnPage: true,
    margins: { top: 0, left: 0, right: 0, bottom: 0 }
  }
}

// CSS class names for different thermal sizes
export function getThermalClassName(thermalSize: ThermalSize = DEFAULT_THERMAL_SIZE): string {
  return `receipt-${thermalSize.width}mm`
}

// Generate PDF filename with timestamp
export function generatePdfFilename(prefix: string = 'receipt'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  return `${prefix}-${timestamp}.pdf`
}
