import Web3 from 'web3';
import ChainTrustABI from './ChainTrust.json';

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
} else {
    // Fallback or Server-side (SSR) environment
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:7545';
    web3 = new Web3(RPC_URL);
}

// Contract Address - Should ideally come from env vars, but using the deployed address here
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xb26EBDe3BCAF04a449b82eb4bdd7505948E12c14';

let chainTrustContract: any = null;

export const getWeb3 = () => web3;

export const getContract = () => {
    if (!chainTrustContract && web3) {
        chainTrustContract = new web3.eth.Contract(ChainTrustABI as any, CONTRACT_ADDRESS);
    }
    return chainTrustContract;
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
    const rawData = `${productId}-${brandName}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export interface BatchData {
    productId: string;       // SKU/NDC
    productName: string;
    brand: string;
    batchNumber: string;
    batchSalt: string;
    manufactureDate: number; // Unix timestamp
    expiryDate: number;      // Unix timestamp (0 if none)
    quantity: number;
}

// Register Batch via Smart Contract
export const registerBatchOnChain = async (batchData: BatchData, deployerAccount: string) => {
    const contract = getContract();
    if (!contract) throw new Error("Could not initialize Web3 connection.");

    return await contract.methods.registerBatch(
        batchData.productId,
        batchData.productName,
        batchData.brand,
        batchData.batchNumber,
        batchData.batchSalt,
        batchData.manufactureDate,
        batchData.expiryDate,
        batchData.quantity
    ).send({ from: deployerAccount, gas: '5000000' });
};
