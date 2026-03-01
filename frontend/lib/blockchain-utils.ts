import { getContract } from '../api/web3-client';

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
}

export interface VerificationResult {
  isValid: boolean;
  record: BlockchainRecord | null;
  verificationDate: number;
  trustScore: number;
  warnings: string[];
}

/**
 * Real blockchain verification
 * Interacts with the actual blockchain node via Web3
 */
export async function verifyOnBlockchain(saltValue: string): Promise<VerificationResult> {
  try {
    const contract = getContract();
    if (!contract) {
        throw new Error('Web3 Contract instance not found');
    }

    try {
      // Call the new smart contract method using the salt
      const result: any = await contract.methods.getFullProductBySalt(saltValue).call();
      const product = result.product;
      const images = result.images;

      // If it doesn't exist, it reverts and falls to catch block.
      // But let's check product.exists anyway
      if (!product.exists) {
        throw new Error("Product data is marked as invalid/deleted.");
      }

      const trustScore = product.isRecalled ? 0 : 100;
      const warnings = product.isRecalled ? ["PRODUCT HAS BEEN RECALLED BY MANUFACTURER"] : [];

      const record: BlockchainRecord = {
        blockchainId: product.productId,
        batchId: product.batchNumber,
        productName: product.name,
        manufacturerName: product.brand,
        timestamp: Number(product.manufactureDate) * 1000,
        status: 'verified',
        transactionHash: 'N/A', // Direct check
        blockNumber: 0,
        images: images || [],
      }

      return {
        isValid: !product.isRecalled, // invalid if recalled
        record,
        verificationDate: Date.now(),
        trustScore,
        warnings,
      };

    } catch (e: any) {
        // If the contract call reverts (e.g. ProductNotFound)
        return {
          isValid: false,
          record: null,
          verificationDate: Date.now(),
          trustScore: 0,
          warnings: ['Product not found on the blockchain or is a counterfeit.'],
        }
    }
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
      
      products.push({
        id: productId.toString(),
        name: productData.name,
        sku: productData.saltValue || productId.toString(), 
        batchSize: productData.batchNumber.toString(),
        registered: 1, // Number of history events
        status: productData.isRecalled ? "recalled" : "active",
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

/**
 * Recall a product on the blockchain
 */
export async function recallProductOnChain(saltValue: string, account: string): Promise<any> {
  const contract = getContract();
  if (!contract) {
    throw new Error('Web3 Contract instance not found');
  }

  return await contract.methods.recallProduct(saltValue).send({
    from: account,
    gas: "500000"
  });
}

