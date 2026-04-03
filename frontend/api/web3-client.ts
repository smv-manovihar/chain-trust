import Web3 from 'web3';
import ChainTrustABI from './ChainTrust.json';
import { hashSHA256 } from '@/lib/crypto-utils';

declare global {
  interface Window {
    ethereum?: any; // To fix TS warning for MetaMask
  }
}

// Initialize Web3 provider (uses MetaMask if available in browser, else fallback to Ganache JSON-RPC)
let web3: Web3 | null = null;

if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
    // Browser environment with MetaMask
    web3 = new Web3(window.ethereum);
    
    // Auto-switch network based on environment
    const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;
    const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

    setTimeout(() => {
        if (IS_LOCAL || !CLIENT_ID) {
            // Local Dev -> Ensure Ganache
            switchNetwork('0x539').catch(console.error);
        } else if (CLIENT_ID) {
            // Production -> Ensure Mainnet (or other configured network)
            switchNetwork('0x1').catch(console.error);
        }
    }, 500); 
} else {
    // Fallback or Server-side (SSR) environment
    const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;
    const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

    const RPC_URL = (IS_LOCAL || !CLIENT_ID)
        ? (process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:7545')
        : `https://mainnet.infura.io/v3/${CLIENT_ID}`;
        
    web3 = new Web3(RPC_URL);
}

const GANACHE_CHAIN_ID = '0x539'; // 1337 in hex
const GANACHE_RPC_URL = 'http://127.0.0.1:7545';

// Contract Address - Should ideally come from env vars, but using the deployed address here
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xfC6617A16Ff9f9AE967D51247Ab3540727215141';

let chainTrustContract: any = null;

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
  expiryDate?: number;
}

export interface VerificationResult {
  isValid: boolean;
  isRecalled: boolean;
  record: BlockchainRecord | null;
  verificationDate: number;
  trustScore: number;
  warnings: string[];
}

export const getWeb3 = () => web3;

export const getContract = () => {
    if (!chainTrustContract && web3) {
        chainTrustContract = new web3.eth.Contract(ChainTrustABI as any, CONTRACT_ADDRESS);
    }
    return chainTrustContract;
};

// Reliability FIX-003: Blockchain Timeout wrapper
const BLOCKCHAIN_TIMEOUT = 15000; // 15 seconds
const withTimeout = (promise: Promise<any>, timeoutMs: number = BLOCKCHAIN_TIMEOUT) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Blockchain transaction timeout')), timeoutMs)
        )
    ]);
};

export const requestExecutionAccounts = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return accounts;
    }
    // Fallback: use Ganache accounts directly (local dev without MetaMask)
    if (web3) {
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) return accounts;
    }
    throw new Error("No wallet provider found. Install MetaMask or ensure Ganache is running.");
};

// Generate salt value based on product info
export const generateSalt = async (productId: string, brandName: string): Promise<string> => {
    return hashSHA256(`${productId}-${brandName}`);
};

export interface BatchData {
    productId: string;       // SKU/NDC
    productName: string;
    brand: string;
    batchNumber: string;
    batchSalt: string;       // Original hex string
    manufactureDate: number; // Unix timestamp
    expiryDate: number;      // Unix timestamp (0 if none)
    quantity: number;
}

/**
 * Ensures a string is formatted as a 32-byte hex for the contract.
 */
const formatBytes32 = (hex: string): string => {
    if (!web3) return hex;
    const cleanHex = hex.startsWith('0x') ? hex : `0x${hex}`;
    return web3.utils.padRight(cleanHex, 64);
};

/**
 * Decentralized Unit Integrity: Derive the unit hash locally.
 * Formula: SHA-256(batchSalt + "-" + unitIndex)
 */
export async function deriveUnitHash(batchSalt: string, unitIndex: number): Promise<string> {
    return hashSHA256(`${batchSalt}-${unitIndex}`);
}

// Register Batch via Smart Contract
export const registerBatchOnChain = async (batchData: BatchData, deployerAccount: string) => {
    const contract = getContract();
    if (!contract) throw new Error("Could not initialize Web3 connection.");

    return await withTimeout(contract.methods.registerBatch(
        batchData.productId,
        batchData.productName,
        batchData.brand,
        batchData.batchNumber,
        formatBytes32(batchData.batchSalt),
        batchData.manufactureDate,
        batchData.expiryDate,
        batchData.quantity
    ).send({ from: deployerAccount, gas: '5000000' }));
};

/**
 * Real blockchain verification
 * Interacts with the actual blockchain node via Web3
 */
export async function verifyOnBlockchain(batchSalt: string, signal?: AbortSignal): Promise<VerificationResult> {
  try {
    const contract = getContract();
    const activeWeb3 = web3;
    if (!contract || !activeWeb3) {
        throw new Error('Web3 connection not initialized');
    }

    if (signal?.aborted) throw new Error('AbortError');

      try {
        // Query using bytes32 salt with timeout (Reliability FIX-003)
        const batch: any = await withTimeout(contract.methods.getBatch(formatBytes32(batchSalt)).call());

        if (signal?.aborted) throw new Error('AbortError');

        // Check if it exists
        if (!batch.exists) {
          throw new Error("Batch data is marked as invalid/deleted.");
        }

      const isRecalled = !!batch.isRecalled;
      const trustScore = isRecalled ? 0 : 100;
      const warnings = isRecalled ? ["CRITICAL: THIS BATCH HAS BEEN RECALLED BY THE MANUFACTURER. DO NOT CONSUME."] : [];

      const record: BlockchainRecord = {
        blockchainId: batch.productId, 
        batchId: batch.batchNumber,
        productName: batch.productName,
        manufacturerName: batch.brand,
        timestamp: Number(batch.manufactureDate) * 1000,
        status: isRecalled ? 'minted' : 'verified', // If recalled, status effectively dropped to basic minted state (or we could add a 'recalled' status)
        transactionHash: 'Verified On-Chain', 
        blockNumber: Number(await activeWeb3.eth.getBlockNumber()), 
        images: [],
        expiryDate: Number(batch.expiryDate) > 0 ? Number(batch.expiryDate) * 1000 : undefined,
      }

      return {
        isValid: true,
        isRecalled,
        record,
        verificationDate: Date.now(),
        trustScore,
        warnings,
      };

    } catch (e: any) {
        console.warn("Blockchain query failed or Batch not found:", e.message);
        return {
          isValid: false,
          isRecalled: false,
          record: null,
          verificationDate: Date.now(),
          trustScore: 0,
          warnings: ['Product not found on the secure public ledger. This may be a counterfeit.'],
        }
    }
  } catch (error) {
    console.error("Blockchain Connection Error:", error);
    return {
      isValid: false,
      isRecalled: false,
      record: null,
      verificationDate: Date.now(),
      trustScore: 0,
      warnings: ['Unable to reach the secure verification network. Please check your connection.'],
    }
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

  return await withTimeout(contract.methods.recallBatch(formatBytes32(batchSalt)).send({
    from: account,
    gas: "500000"
  }));
}

/**
 * Restore a batch on the blockchain
 */
export async function restoreProductOnChain(batchSalt: string, account: string): Promise<any> {
  const contract = getContract();
  if (!contract) {
    throw new Error('Web3 Contract instance not found');
  }

  return await withTimeout(contract.methods.restoreBatch(formatBytes32(batchSalt)).send({
    from: account,
    gas: "500000"
  }));
}

/**
 * Switch MetaMask to a specific network
 */
export const switchNetwork = async (chainId: string) => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }],
            });
        } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902 && chainId === '0x539') {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: '0x539',
                                chainName: 'Ganache Local',
                                rpcUrls: ['http://127.0.0.1:7545'],
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                            },
                        ],
                    });
                } catch (addError) {
                    throw addError;
                }
            }
            throw switchError;
        }
    }
};

/**
 * Switch MetaMask to Ganache network (Legacy wrapper)
 */
export const switchToGanache = () => switchNetwork('0x539');
