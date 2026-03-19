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
export async function verifyOnBlockchain(batchSalt: string): Promise<VerificationResult> {
  try {
    const contract = getContract();
    if (!contract) {
        throw new Error('Web3 Contract instance not found');
    }

    try {
      // Query the new smart contract method using the batchSalt
      const batch: any = await contract.methods.getBatch(batchSalt).call();

      // Check if it exists (getBatch reverts if not, but safety first)
      if (!batch.exists) {
        throw new Error("Batch data is marked as invalid/deleted.");
      }

      const trustScore = batch.isRecalled ? 0 : 100;
      const warnings = batch.isRecalled ? ["THIS BATCH HAS BEEN RECALLED BY THE MANUFACTURER"] : [];

      const record: BlockchainRecord = {
        blockchainId: batch.productId, // This is the SKU
        batchId: batch.batchNumber,
        productName: batch.productName,
        manufacturerName: batch.brand,
        timestamp: Number(batch.manufactureDate) * 1000,
        status: 'verified',
        transactionHash: 'Verified On-Chain', 
        blockNumber: 0,
        images: [], // Images are now DB-only to save gas, can be enriched by verifyScan
      }

      return {
        isValid: !batch.isRecalled,
        record,
        verificationDate: Date.now(),
        trustScore,
        warnings,
      };

    } catch (e: any) {
        // If the contract call reverts (e.g. BatchNotFound)
        return {
          isValid: false,
          record: null,
          verificationDate: Date.now(),
          trustScore: 0,
          warnings: ['Batch not found on the blockchain or is a counterfeit.'],
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
  // Mock logic or specific mapping if batchId is used directly on-chain
  // In the current architecture, verifications use batchSalt.
  return {
      isValid: false,
      record: null,
      verificationDate: Date.now(),
      trustScore: 0,
      warnings: ['Direct batch ID lookup is secondary to salt-based verification.'],
  };
}

/**
 * Fetch all registered batches from the blockchain
 */
export async function getAllProductsFromBlockchain(): Promise<any[]> {
  try {
    const contract = getContract();
    if (!contract) return [];

    // Fetch past events to get all batch registrations
    const events = await contract.getPastEvents('BatchRegistered', {
      fromBlock: 0,
      toBlock: 'latest'
    });

    const products = [];

    // Reverse iterate to show newest batches first
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      const batchSalt = event.returnValues?.batchSalt;
      if (!batchSalt) continue;

      const batchData = await contract.methods.batches(batchSalt).call();
      
      products.push({
        id: batchData.batchNumber.toString(),
        name: batchData.productName,
        sku: batchData.productId.toString(), 
        batchSize: batchData.quantity.toString(),
        registered: 1,
        status: batchData.isRecalled ? "recalled" : "active",
        verifications: 0,
        date: new Date(Number(batchData.manufactureDate) * 1000).toISOString().split('T')[0],
      });
    }

    return products;
  } catch (err) {
    console.error("Failed to fetch products from blockchain:", err);
    return [];
  }
}

/**
 * Recall a batch on the blockchain
 */
export async function recallProductOnChain(batchSalt: string, account: string): Promise<any> {
  const contract = getContract();
  if (!contract) {
    throw new Error('Web3 Contract instance not found');
  }

  return await contract.methods.recallBatch(batchSalt).send({
    from: account,
    gas: "500000"
  });
}

