/**
 * QR Code Generation and Validation Utilities
 * For ChainTrust pharmaceutical verification system
 */

export interface QRData {
  batchId: string
  productId: string
  manufacturerId: string
  blockchainId: string
  timestamp: number
}

/**
 * Generate a unique batch identifier for QR code
 */
export function generateBatchId(manufacturerId: string, productCode: string, timestamp?: number): string {
  const date = new Date(timestamp || Date.now())
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()

  return `BATCH-${dateStr.slice(0, 4)}-${dateStr.slice(4)}-${randomStr}`
}

/**
 * Generate a blockchain hash for a batch
 */
export function generateBlockchainId(batchId: string): string {
  // Simple hash function for demo purposes
  // In production, this would interact with actual blockchain
  let hash = 0
  for (let i = 0; i < batchId.length; i++) {
    const char = batchId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  const hashStr = Math.abs(hash).toString(16).toUpperCase().padStart(16, '0')
  return `PHARM-${hashStr.substring(0, 8)}-${hashStr.substring(8)}`
}

/**
 * Generate QR code data structure
 */
export function generateQRData(batchId: string, productId: string, manufacturerId: string): QRData {
  return {
    batchId,
    productId,
    manufacturerId,
    blockchainId: generateBlockchainId(batchId),
    timestamp: Date.now(),
  }
}

/**
 * Create QR code content as JSON string
 */
export function createQRContent(qrData: QRData): string {
  return JSON.stringify(qrData)
}

/**
 * Parse QR code content
 */
export function parseQRContent(content: string): QRData | null {
  try {
    const data = JSON.parse(content)
    // Validate required fields
    if (data.batchId && data.blockchainId) {
      return data as QRData
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validate batch ID format
 */
export function validateBatchId(batchId: string): boolean {
  const pattern = /^BATCH-\d{4}-\d{4}-[A-Z0-9]$/
  return pattern.test(batchId)
}

/**
 * Validate blockchain ID format
 */
export function validateBlockchainId(blockchainId: string): boolean {
  const pattern = /^PHARM-[A-F0-9]{8}-[A-F0-9]{8}$/
  return pattern.test(blockchainId)
}

/**
 * Generate multiple QR codes for a batch
 */
export function generateBatchQRCodes(
  batchId: string,
  productId: string,
  manufacturerId: string,
  quantity: number,
): QRData[] {
  const codes: QRData[] = []
  const baseData = generateQRData(batchId, productId, manufacturerId)

  for (let i = 0; i < quantity; i++) {
    codes.push({
      ...baseData,
      // Add unique identifier for each unit
      blockchainId: `${baseData.blockchainId}-${String(i + 1).padStart(6, '0')}`,
    })
  }

  return codes
}

/**
 * Create downloadable QR code batch file
 */
export function createQRBatchFile(
  batchId: string,
  productId: string,
  manufacturerId: string,
  quantity: number,
): string {
  const codes = generateBatchQRCodes(batchId, productId, manufacturerId, quantity)
  const csvContent = [
    ['Unit#', 'Batch ID', 'Product ID', 'Manufacturer ID', 'Blockchain ID', 'Timestamp'].join(','),
    ...codes.map((code, idx) =>
      [
        idx + 1,
        code.batchId,
        code.productId,
        code.manufacturerId,
        code.blockchainId,
        new Date(code.timestamp).toISOString(),
      ].join(','),
    ),
  ].join('\n')

  return csvContent
}

/**
 * Generate QR code data URL (simplified for demo)
 * In production, use a library like qrcode.react
 */
export function generateQRCodeDataURL(data: string, size: number = 200): Promise<string> {
  return new Promise((resolve) => {
    // This would typically use a QR code library
    // For now, return a placeholder
    const encodedData = encodeURIComponent(data)
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`
    resolve(url)
  })
}
