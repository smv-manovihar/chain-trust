import { Web3 } from 'web3';
import { RPC_URL, CONTRACT_ADDRESS } from '../config/blockchain.config.js';
import ChainTrustABI from '../contracts/ChainTrust.json';

let web3: Web3;
let contract: any;

/**
 * Initialize Web3 and the Contract instance
 */
const initWeb3 = () => {
	if (!web3) {
		web3 = new Web3(RPC_URL);
	}
	if (!contract) {
		contract = new web3.eth.Contract(ChainTrustABI as any, CONTRACT_ADDRESS);
	}
	return { web3, contract };
};

/**
 * Ensures a string is formatted as a 32-byte hex for the contract.
 */
const formatBytes32 = (hex: string): string => {
	const cleanHex = hex.startsWith('0x') ? hex : `0x${hex}`;
	// Web3.js 4.x utility for padding
	return web3.utils.padRight(cleanHex, 64);
};

export interface OnChainBatch {
	productId: string;
	productName: string;
	brand: string;
	batchNumber: string;
	batchSalt: string;
	manufactureDate: string;
	expiryDate: string;
	quantity: string;
	manufacturer: string;
	isRecalled: boolean;
	exists: boolean;
}

/**
 * Fetches batch data directly from the blockchain
 */
export const getOnChainBatch = async (batchSalt: string): Promise<OnChainBatch | null> => {
	try {
		const { contract } = initWeb3();
		const saltBytes32 = formatBytes32(batchSalt);
		
		const batchData = await contract.methods.getBatch(saltBytes32).call();
		
		if (!batchData || !batchData.exists) {
			return null;
		}

		return {
			productId: batchData.productId,
			productName: batchData.productName,
			brand: batchData.brand,
			batchNumber: batchData.batchNumber,
			batchSalt: batchData.batchSalt,
			manufactureDate: batchData.manufactureDate.toString(),
			expiryDate: batchData.expiryDate.toString(),
			quantity: batchData.quantity.toString(),
			manufacturer: batchData.manufacturer,
			isRecalled: !!batchData.isRecalled,
			exists: !!batchData.exists,
		};
	} catch (error) {
		console.error('[Blockchain Service] Error fetching batch:', error);
		return null;
	}
};
