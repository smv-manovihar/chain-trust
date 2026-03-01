import Web3 from 'web3';
import ChainTrustABI from '../abis/ChainTrust.json';

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
    web3 = new Web3('http://127.0.0.1:7545'); // Local Ganache fallback
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
    if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return accounts;
    }
    throw new Error("MetaMask is not installed");
};
