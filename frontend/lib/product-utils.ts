/**
 * Product Management Utilities
 * For PharmaSecure pharmaceutical product handling
 */

export interface Product {
  id: string
  name: string
  description: string
  sku: string
  manufacturerId: string
  category: string
  dosage: string
  activeIngredient: string
  sideEffects?: string[]
  contraindications?: string[]
  storageConditions: string
  batchSize: number
  expiryMonths: number
  registeredBatches: number
  totalVerifications: number
  createdAt: number
  lastBatchDate: number
}

export interface ProductBatch {
  id: string
  productId: string
  batchNumber: string
  quantity: number
  manufactureDate: number
  expiryDate: number
  location: string
  qrCodesGenerated: number
  verifications: number
  blockchainId: string
  status: 'pending' | 'verified' | 'shipped' | 'received'
}

/**
 * Create new product
 */
export function createProduct(
  name: string,
  sku: string,
  manufacturerId: string,
  category: string,
  dosage: string,
): Product {
  return {
    id: `product_${Date.now()}`,
    name,
    description: '',
    sku,
    manufacturerId,
    category,
    dosage,
    activeIngredient: '',
    storageConditions: '2-25°C, protect from light',
    batchSize: 0,
    expiryMonths: 0,
    registeredBatches: 0,
    totalVerifications: 0,
    createdAt: Date.now(),
    lastBatchDate: 0,
  }
}

/**
 * Calculate expiry date
 */
export function calculateExpiryDate(manufactureDateMs: number, expiryMonths: number): number {
  const date = new Date(manufactureDateMs)
  date.setMonth(date.getMonth() + expiryMonths)
  return date.getTime()
}

/**
 * Check if product is expired
 */
export function isProductExpired(expiryDate: number): boolean {
  return Date.now() > expiryDate
}

/**
 * Get days until expiry
 */
export function getDaysUntilExpiry(expiryDate: number): number {
  return Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24))
}

/**
 * Validate product batch
 */
export function validateProductBatch(batch: ProductBatch, product: Product): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate quantity
  if (batch.quantity <= 0) {
    errors.push('Batch quantity must be greater than 0')
  }
  if (batch.quantity > product.batchSize * 2) {
    warnings.push('Batch quantity exceeds typical batch size')
  }

  // Validate dates
  if (batch.manufactureDate > batch.expiryDate) {
    errors.push('Manufacture date cannot be after expiry date')
  }

  if (batch.expiryDate <= Date.now()) {
    errors.push('Batch is already expired')
  }

  const daysToExpiry = getDaysUntilExpiry(batch.expiryDate)
  if (daysToExpiry < 30) {
    warnings.push(`Batch expires in ${daysToExpiry} days`)
  }

  // Validate location
  if (!batch.location || batch.location.trim() === '') {
    errors.push('Batch location is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Format product information for display
 */
export function formatProductInfo(product: Product): {
  name: string
  displayName: string
  dosageInfo: string
} {
  return {
    name: product.name,
    displayName: `${product.name} (${product.dosage})`,
    dosageInfo: `${product.dosage} - ${product.category}`,
  }
}

/**
 * Generate product SKU if not provided
 */
export function generateProductSKU(manufacturerId: string, category: string): string {
  const categoryCode = category.substring(0, 3).toUpperCase()
  const date = new Date()
  const dateCode = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()

  return `${categoryCode}-${dateCode}-${random}`
}

/**
 * Export product catalog as CSV
 */
export function exportProductCatalog(products: Product[]): string {
  const headers = ['ID', 'Name', 'SKU', 'Category', 'Dosage', 'Batches', 'Verifications', 'Created']
  const rows = products.map((p) => [
    p.id,
    p.name,
    p.sku,
    p.category,
    p.dosage,
    p.registeredBatches,
    p.totalVerifications,
    new Date(p.createdAt).toISOString(),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n')

  return csv
}

/**
 * Calculate batch statistics
 */
export function calculateBatchStatistics(batches: ProductBatch[]): {
  totalBatches: number
  totalUnits: number
  averageVerifications: number
  pendingBatches: number
  verifiedBatches: number
} {
  return {
    totalBatches: batches.length,
    totalUnits: batches.reduce((sum, b) => sum + b.quantity, 0),
    averageVerifications: batches.length > 0 ? batches.reduce((sum, b) => sum + b.verifications, 0) / batches.length : 0,
    pendingBatches: batches.filter((b) => b.status === 'pending').length,
    verifiedBatches: batches.filter((b) => b.status === 'verified').length,
  }
}

/**
 * Check product inventory health
 */
export function checkInventoryHealth(batches: ProductBatch[]): {
  status: 'healthy' | 'warning' | 'critical'
  message: string
} {
  const expiredCount = batches.filter((b) => Date.now() > b.expiryDate).length
  const expiringSoonCount = batches.filter((b) => getDaysUntilExpiry(b.expiryDate) < 30).length
  const pendingCount = batches.filter((b) => b.status === 'pending').length

  if (expiredCount > 0) {
    return {
      status: 'critical',
      message: `${expiredCount} batch(es) have expired`,
    }
  }

  if (expiringSoonCount > 2 || pendingCount > 5) {
    return {
      status: 'warning',
      message: `${expiringSoonCount} batch(es) expiring soon, ${pendingCount} pending verification`,
    }
  }

  return {
    status: 'healthy',
    message: 'All batches are in good standing',
  }
}
