import { Request, Response } from 'express';
import crypto from 'crypto';
import Product from '../models/product.model.js';
import { addProductToBlockchain } from '../utils/blockchain.utils.js';

export const createProduct = async (req: Request, res: Response) => {
	try {
		const {
			name,
			brand,
			productId,
			price,
			category,
			batchNumber,
			manufactureDate,
			expiryDate,
			description,
		} = req.body;

		// 1. Validation
		if (!name || !productId || !price || !category || !batchNumber || !manufactureDate) {
			return res.status(400).json({ message: 'Missing required fields' });
		}

		// Check if product ID already exists
		const existingProduct = await Product.findOne({ productId });
		if (existingProduct) {
			return res.status(400).json({ message: 'Product ID already exists' });
		}

		// 2. Generate Salt
		// Salt logic from frontend: productId + '-' + brand + '-' + name
		const rawSalt = `${productId}-${brand}-${name}`;
		const saltValue = crypto.createHash('sha256').update(rawSalt).digest('hex');

		// 3. Prepare Data
		const productData = {
			name,
			category,
			brand,
			productId,
			manufactureDate,
			batchNumber,
			price,
			expiryDate,
			saltValue,
			description,
		};

		// 4. Add to Blockchain
		let transactionHash = '';
		try {
			console.log('Initiating blockchain transaction for:', productId);
			transactionHash = await addProductToBlockchain(productData);
			console.log('Blockchain transaction successful:', transactionHash);
		} catch (bcError: any) {
			console.error('Blockchain error:', bcError);
			// Decide: Fail request or save to DB with 'pending' status?
			// For now, fail request to ensure consistency.
			return res
				.status(500)
				.json({ message: 'Failed to add product to blockchain', error: bcError.message });
		}

		// 5. Save to MongoDB
		const newProduct = new Product({
			...productData,
			isOnBlockchain: true,
			blockchainHash: transactionHash,
		});

		await newProduct.save();

		res.status(201).json({
			message: 'Product created successfully',
			product: newProduct,
			transactionHash,
		});
	} catch (error) {
		console.error('Create product error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
