import { Web3 } from 'web3';
import { RPC_URL, WALLET_PRIVATE_KEY, CONTRACT_ADDRESS } from '../config/blockchain.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Web3
const web3 = new Web3(RPC_URL);

// Load ABI
const abiPath = path.resolve(__dirname, '../abis/product.abi.json');
const contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// Initialize Contract
const productContract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

// Add Account
if (WALLET_PRIVATE_KEY) {
	const account = web3.eth.accounts.privateKeyToAccount(WALLET_PRIVATE_KEY);
	web3.eth.accounts.wallet.add(account);
	console.log(`Blockchain Wallet initialized: ${account.address}`);
} else {
	console.warn('WALLET_PRIVATE_KEY not found in env. Blockchain operations will fail.');
}

export const addProductToBlockchain = async (productData: any): Promise<string> => {
	if (!WALLET_PRIVATE_KEY) {
		throw new Error('Wallet private key is missing.');
	}

	const account = web3.eth.accounts.privateKeyToAccount(WALLET_PRIVATE_KEY);
	const fromAddress = account.address;

	const {
		name,
		category,
		brand,
		productId,
		manufactureDate,
		batchNumber,
		price,
		expiryDate,
		saltValue,
	} = productData;

	// Convert dates to timestamps (as expected by contract)
	const manufactureTimestamp = new Date(manufactureDate).getTime();
	
	// Convert other fields to expected types if necessary
	// Contract expects uint256 for price, batchNumber, productId
    // Note: JS numbers are safe up to 2^53. If these are huge ID's, used strings/BigInt.
    // Web3.js handles number->uint conversion usually.

	try {
        let gasEstimate;
        let methodCall;

		if (category === 'MD' || category === 'FD') {
            const expiryTimestamp = new Date(expiryDate).getTime();
            methodCall = productContract.methods.addProductWithExpiry(
				name,
				category,
				brand,
				productId,
				manufactureTimestamp,
				batchNumber,
				price,
				expiryTimestamp,
				saltValue,
			);
		} else {
            methodCall = productContract.methods.addProductWithoutExpiry(
				name,
				category,
				brand,
				productId,
				manufactureTimestamp,
				batchNumber,
				price,
				saltValue,
			);
		}

        // Estimate Gas
        try {
            gasEstimate = await methodCall.estimateGas({ from: fromAddress });
        } catch (gasError) {
             console.warn("Gas estimation failed, using default gas limit.", gasError);
             gasEstimate = 3000000; // Fallback
        }

        // Send Transaction
        const receipt: any = await methodCall.send({
            from: fromAddress,
            gas: gasEstimate.toString(), // web3 4.x types can be strict
        });

		return receipt.transactionHash;
	} catch (error) {
		console.error('Blockchain transaction failed:', error);
		throw error;
	}
};
