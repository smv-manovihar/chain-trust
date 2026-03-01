import { Request, Response } from 'express';
import Product from '../models/product.model.js';

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
			saltValue,
			blockchainHash
		} = req.body;

		// 1. Validation
		if (!name || !productId || !price || !category || !batchNumber || !manufactureDate || !saltValue || !blockchainHash) {
			return res.status(400).json({ message: 'Missing required fields including blockchain data' });
		}

		// Check if product ID already exists
		const existingProduct = await Product.findOne({ productId });
		if (existingProduct) {
			return res.status(400).json({ message: 'Product ID already exists' });
		}

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

		// 5. Save to MongoDB
		const newProduct = new Product({
			...productData,
			isOnBlockchain: true,
			blockchainHash: blockchainHash,
		});

		await newProduct.save();

		res.status(201).json({
			message: 'Product created successfully',
			product: newProduct,
			transactionHash: blockchainHash,
		});	} catch (error) {
		console.error('Create product error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

export const recallProduct = async (req: Request, res: Response) => {
	try {
		const { saltValue } = req.body;

		if (!saltValue) {
			return res.status(400).json({ message: 'saltValue is required' });
		}

		const product = await Product.findOne({ saltValue });

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}

		product.isRecalled = true;
		await product.save();

		res.status(200).json({ message: 'Product successfully recalled', product });
	} catch (error) {
		console.error('Recall product error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
