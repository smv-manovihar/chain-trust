/**
 * Blockchain Verification Utilities
 * For ChainTrust pharmaceutical verification system
 */

export interface BlockchainRecord {
  blockchainId: string
  batchId: string
  productName: string
  manufacturerId: string
  manufacturerName: string
  timestamp: number
  status: 'minted' | 'verified' | 'shipped' | 'delivered'
  transactionHash: string
  blockNumber: number
  supplyChainEvents: SupplyChainEvent[]
}

export interface SupplyChainEvent {
  status: 'manufactured' | 'quality-checked' | 'packaged' | 'shipped' | 'received' | 'verified'
  timestamp: number
  location: string
  verified: boolean
  dataHash: string
}

export interface VerificationResult {
  isValid: boolean
  record: BlockchainRecord | null
  verificationDate: number
  trustScore: number
  warnings: string[]
}

/**
 * Mock blockchain verification
 * In production, this would interact with actual blockchain nodes
 */
export function verifyOnBlockchain(blockchainId: string): VerificationResult {
  // Simulate blockchain lookup
  const isValid = blockchainId.startsWith('PHARM-')
  const trustScore = isValid ? 95 : 0

  if (!isValid) {
    return {
      isValid: false,
      record: null,
      verificationDate: Date.now(),
      trustScore: 0,
      warnings: ['Invalid blockchain ID format'],
    }
  }

  const record: BlockchainRecord = {
    blockchainId,
    batchId: `BATCH-${blockchainId.substring(6, 10)}-${blockchainId.substring(15, 19)}-A`,
    productName: 'Amoxicillin 500mg',
    manufacturerId: 'MFR-001',
    manufacturerName: 'PharmaCorp Inc',
    timestamp: Date.now() - 86400000, // 1 day ago
    status: 'verified',
    transactionHash: `0x${Math.random().toString(16).substring(2)}`,
    blockNumber: 18234567,
    supplyChainEvents: [
      {
        status: 'manufactured',
        timestamp: Date.now() - 604800000,
        location: 'PharmaCorp Manufacturing Plant, USA',
        verified: true,
        dataHash: `0x${Math.random().toString(16).substring(2)}`,
      },
      {
        status: 'quality-checked',
        timestamp: Date.now() - 604800000 + 86400000,
        location: 'PharmaCorp QA Lab',
        verified: true,
        dataHash: `0x${Math.random().toString(16).substring(2)}`,
      },
      {
        status: 'packaged',
        timestamp: Date.now() - 604800000 + 172800000,
        location: 'PharmaCorp Distribution Center',
        verified: true,
        dataHash: `0x${Math.random().toString(16).substring(2)}`,
      },
      {
        status: 'shipped',
        timestamp: Date.now() - 604800000 + 259200000,
        location: 'In Transit',
        verified: true,
        dataHash: `0x${Math.random().toString(16).substring(2)}`,
      },
      {
        status: 'received',
        timestamp: Date.now() - 259200000,
        location: 'Pharmacy Chain - Downtown Store',
        verified: true,
        dataHash: `0x${Math.random().toString(16).substring(2)}`,
      },
    ],
  }

  return {
    isValid: true,
    record,
    verificationDate: Date.now(),
    trustScore,
    warnings: [],
  }
}

/**
 * Verify batch on blockchain
 */
export function verifyBatchOnBlockchain(batchId: string): VerificationResult {
  const isValid = /^BATCH-\d{4}-\d{4}-[A-Z]$/.test(batchId)

  if (!isValid) {
    return {
      isValid: false,
      record: null,
      verificationDate: Date.now(),
      trustScore: 0,
      warnings: ['Invalid batch ID format'],
    }
  }

  // Generate blockchain ID from batch ID
  const blockchainId = `PHARM-${batchId.substring(6, 10)}${batchId.substring(11, 15)}-${batchId.charCodeAt(16).toString(16).padStart(8, '0')}`

  return verifyOnBlockchain(blockchainId)
}

/**
 * Check supply chain integrity
 */
export function checkSupplyChainIntegrity(record: BlockchainRecord): {
  isIntact: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check all events are verified
  const unverifiedEvents = record.supplyChainEvents.filter((e) => !e.verified)
  if (unverifiedEvents.length > 0) {
    issues.push(`${unverifiedEvents.length} unverified event(s) in supply chain`)
  }

  // Check chronological order
  for (let i = 1; i < record.supplyChainEvents.length; i++) {
    if (record.supplyChainEvents[i].timestamp < record.supplyChainEvents[i - 1].timestamp) {
      issues.push('Supply chain events are not in chronological order')
      break
    }
  }

  // Check for gaps (more than 7 days between events)
  for (let i = 1; i < record.supplyChainEvents.length; i++) {
    const gap = record.supplyChainEvents[i].timestamp - record.supplyChainEvents[i - 1].timestamp
    if (gap > 604800000) {
      // 7 days in milliseconds
      issues.push('Large gap detected in supply chain timeline')
      break
    }
  }

  return {
    isIntact: issues.length === 0,
    issues,
  }
}

/**
 * Calculate trust score based on verification data
 */
export function calculateTrustScore(record: BlockchainRecord): number {
  let score = 100

  // Deduct for unverified events
  const unverifiedCount = record.supplyChainEvents.filter((e) => !e.verified).length
  score -= unverifiedCount * 10

  // Deduct for supply chain gaps
  for (let i = 1; i < record.supplyChainEvents.length; i++) {
    const gap = record.supplyChainEvents[i].timestamp - record.supplyChainEvents[i - 1].timestamp
    if (gap > 604800000) {
      score -= 5
    }
  }

  // Bonus for recent verification
  const daysSinceVerification = (Date.now() - record.timestamp) / 86400000
  if (daysSinceVerification < 1) {
    score += 5
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Generate verification certificate
 */
export function generateVerificationCertificate(record: BlockchainRecord): string {
  const lines = [
    '='.repeat(60),
    'CHAINTRUST VERIFICATION CERTIFICATE',
    '='.repeat(60),
    '',
    `Product: ${record.productName}`,
    `Batch ID: ${record.batchId}`,
    `Blockchain ID: ${record.blockchainId}`,
    `Manufacturer: ${record.manufacturerName}`,
    '',
    `Status: ${record.status.toUpperCase()}`,
    `Verification Date: ${new Date(record.timestamp).toISOString()}`,
    `Transaction Hash: ${record.transactionHash}`,
    `Block Number: ${record.blockNumber}`,
    '',
    'SUPPLY CHAIN HISTORY:',
    ...record.supplyChainEvents.map(
      (e, i) =>
        `${i + 1}. ${e.status.replace(/-/g, ' ').toUpperCase()} - ${new Date(e.timestamp).toLocaleDateString()} at ${e.location}`,
    ),
    '',
    '='.repeat(60),
    'This certificate verifies the authenticity and supply chain',
    'integrity of the above product on the blockchain.',
    '='.repeat(60),
  ]

  return lines.join('\n')
}

/**
 * Export verification data as JSON
 */
export function exportVerificationData(result: VerificationResult): string {
  return JSON.stringify(result, null, 2)
}
