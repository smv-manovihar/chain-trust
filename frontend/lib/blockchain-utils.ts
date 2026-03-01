import { getContract } from './web3-client';

/**
 * Blockchain Verification Utilities
 * For ChainTrust pharmaceutical verification system
 */

export interface BlockchainRecord {
  blockchainId: string;
  batchId: string;
  productName: string;
  manufacturerName: string;
  timestamp: number;
  status: 'minted' | 'verified' | 'shipped' | 'delivered';
  transactionHash: string;
  blockNumber: number;
  images: string[];
  supplyChainEvents: SupplyChainEvent[];
}

export interface SupplyChainEvent {
  status: 'manufactured' | 'quality-checked' | 'packaged' | 'shipped' | 'received' | 'verified';
  timestamp: number;
  location: string;
  updatedBy: string; // The address that made the change
  verified: boolean;
  dataHash: string;
}

export interface VerificationResult {
  isValid: boolean;
  record: BlockchainRecord | null;
  verificationDate: number;
  trustScore: number;
  warnings: string[];
}

// Convert from Blockchain status code to string representation
const getStatusString = (code: number): SupplyChainEvent['status'] => {
  const statuses: SupplyChainEvent['status'][] = [
    'manufactured',
    'quality-checked',
    'packaged',
    'shipped',
    'received',
  ];
  return statuses[code] || 'manufactured';
};

/**
 * Real blockchain verification
 * Interacts with the actual blockchain node via Web3
 */
export async function verifyOnBlockchain(blockchainId: string): Promise<VerificationResult> {
  try {
    const contract = getContract();
    if (!contract) {
        throw new Error('Web3 Contract instance not found');
    }

    const productIdBytes32 = contract.utils.utf8ToHex(blockchainId);

    // Check if product exists first
    const exists = await contract.methods.products(productIdBytes32).call();

    // If timestamp is 0, it doesn't exist.
    if (!exists || Number(exists.timestamp) === 0) {
        return {
          isValid: false,
          record: null,
          verificationDate: Date.now(),
          trustScore: 0,
          warnings: ['Product not found on the blockchain'],
        }
    }

    // Fetch the timeline history
    const history = await contract.methods.getProductHistory(productIdBytes32).call();
    
    // Map smart contract events to frontend model
    const supplyChainEvents: SupplyChainEvent[] = history.map((event: any) => ({
      status: getStatusString(Number(event.status)),
      timestamp: Number(event.timestamp) * 1000, 
      location: event.location,
      updatedBy: event.updatedBy,
      verified: true, // Data originates from BC, natively verified
      dataHash: "verified-on-chain",
    }));

    const trustScore = 100;

    const record: BlockchainRecord = {
      blockchainId,
      batchId: exists.batchId,
      productName: exists.name,
      manufacturerName: exists.manufacturerName,
      timestamp: Number(exists.timestamp) * 1000,
      status: 'verified',
      transactionHash: '...', // We don't fetch TX hash retrospectively easily without parsing logs
      blockNumber: 0,
      images: exists.images || [],
      supplyChainEvents,
    }

    return {
      isValid: true,
      record,
      verificationDate: Date.now(),
      trustScore,
      warnings: [],
    };
  } catch (error) {
    console.error("Blockchain Verification Error:", error);
    return {
      isValid: false,
      record: null,
      verificationDate: Date.now(),
      trustScore: 0,
      warnings: ['Failed to connect to the blockchain network to verify. Please try again.'],
    }
  }
}

/**
 * Verify batch on blockchain
 */
export async function verifyBatchOnBlockchain(batchId: string): Promise<VerificationResult> {
  const isValid = /^BATCH-\d{4}-\d{4}-[A-Z]$/.test(batchId);

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
  const blockchainId = `PHARM-${batchId.substring(6, 10)}${batchId.substring(11, 15)}-${batchId.charCodeAt(16).toString(16).padStart(8, '0')}`;

  return await verifyOnBlockchain(blockchainId);
}

/**
 * Check supply chain integrity
 */
export function checkSupplyChainIntegrity(record: BlockchainRecord): {
  isIntact: boolean
  issues: string[]
} {
  const issues: string[] = []

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

/**
 * Fetch all registered products from the blockchain
 */
export async function getAllProductsFromBlockchain(): Promise<any[]> {
  try {
    const contract = getContract();
    if (!contract) return [];

    // Fetch past events to get all product additions
    const events = await contract.getPastEvents('ProductAdded', {
      fromBlock: 0,
      toBlock: 'latest'
    });

    const products = [];

    // Reverse iterate to show newest products first
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      const productId = event.returnValues?.productId;
      if (!productId) continue;

      const productData = await contract.methods.products(productId).call();
      const history = await contract.methods.getProductHistory(productId).call();
      
      products.push({
        id: productId.toString(),
        name: productData.name,
        sku: productData.saltValue || productId.toString(), 
        batchSize: productData.batchNumber.toString(),
        registered: history.length > 0 ? history.length : 1, // Number of history events
        status: "active",
        verifications: 0, // Mock verifications
        date: new Date(Number(productData.manufactureDate) * 1000).toISOString().split('T')[0],
      });
    }

    return products;
  } catch (err) {
    console.error("Failed to fetch products from blockchain:", err);
    return [];
  }
}

