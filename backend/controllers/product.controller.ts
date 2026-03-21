import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Product from '../models/product.model.js';

// POST /api/products — Create a new catalogue product
export const createProduct = async (req: Request, res: Response) => {
	try {
		const { name, productId, categories, brand, price, description, images } = req.body;

		if (!name || !productId || !categories || !Array.isArray(categories) || categories.length === 0 || !brand) {
			return res.status(400).json({ message: 'Name, Product ID, Categories (array), and Brand are required.' });
		}

		const userId = (req as any).user?.id;

		// Duplicate check
		const existing = await Product.findOne({ productId, createdBy: userId });
		if (existing) {
			return res.status(400).json({ message: 'A product with this ID already exists in your catalogue.' });
		}

		const product = new Product({
			name,
			productId,
			categories,
			brand,
			price: price || 0,
			description,
			images: images || [],
			createdBy: userId,
		});

		await product.save();
		res.status(201).json({ message: 'Product added to catalogue.', product });
	} catch (error: any) {
		console.error('Create product error:', error);
		if (error.code === 11000) {
			return res.status(400).json({ message: 'Product ID already exists.' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/products — List all catalogue products for the manufacturer (with filtering)
export const listProducts = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { search, categories, skip, limit } = req.query;

		const matchQuery: any = { createdBy: new Types.ObjectId(userId) };

		if (search) {
			matchQuery.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ productId: { $regex: search, $options: 'i' } },
			];
		}

		if (categories) {
			const catList = Array.isArray(categories) ? categories : (categories as string).split(',');
			matchQuery.categories = { $in: catList };
		}

		const pipeline: any[] = [
			{ $match: matchQuery },
			{ $sort: { createdAt: -1 } },
		];

		if (skip) {
			pipeline.push({ $skip: parseInt(skip as string) });
		}
		if (limit) {
			pipeline.push({ $limit: parseInt(limit as string) });
		} else {
			pipeline.push({ $limit: 100 }); // Default limit
		}

		// Join with batches to get count
		pipeline.push(
			{
				$lookup: {
					from: 'batches',
					localField: '_id',
					foreignField: 'product',
					as: 'productBatches',
				},
			},
			{
				$addFields: {
					batchesCount: { $size: '$productBatches' },
				},
			},
			{
				$project: {
					productBatches: 0,
				},
			},
		);

		const products = await Product.aggregate(pipeline);
		res.json({ products });
	} catch (error) {
		console.error('List products error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/products/:id — Get a single product
export const getProduct = async (req: Request, res: Response) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}
		res.json({ product });
	} catch (error) {
		console.error('Get product error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// PUT /api/products/:id — Update a catalogue product
export const updateProduct = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const product = await Product.findById(req.params.id);

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}
		if (product.createdBy.toString() !== userId) {
			return res.status(403).json({ message: 'Not authorized' });
		}

		const { name, productId, categories, brand, price, description, images, qrSettings } = req.body;

		if (name) product.name = name;
		if (productId) product.productId = productId;
		if (categories) product.categories = categories;
		if (brand) product.brand = brand;
		if (price !== undefined) product.price = price;
		if (description !== undefined) product.description = description;
		if (images) product.images = images;
		if (qrSettings) product.qrSettings = { ...product.qrSettings, ...qrSettings };

		await product.save();
		res.json({ message: 'Product updated.', product });
	} catch (error: any) {
		console.error('Update product error:', error);
		if (error.code === 11000) {
			return res.status(400).json({ message: 'Product ID already exists.' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
};

// DELETE /api/products/:id — Remove a catalogue product
export const deleteProduct = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const product = await Product.findById(req.params.id);

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}
		if (product.createdBy.toString() !== userId) {
			return res.status(403).json({ message: 'Not authorized' });
		}

		await product.deleteOne();
		res.json({ message: 'Product deleted.' });
	} catch (error) {
		console.error('Delete product error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
