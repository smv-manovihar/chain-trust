import { Request, Response } from 'express';
import { Types, isValidObjectId } from 'mongoose';
import Product, { EnrollmentStatus } from '../models/product.model.js';
import Batch from '../models/batch.model.js';
import s3Service from '../services/s3.service.js';

const PRODUCT_ID_REGEX = /^[a-zA-Z0-9\-_.]+$/;

// POST /api/products — Create a new catalogue product
export const createProduct = async (req: Request, res: Response) => {
	try {
		const { name, productId, categories, brand, price, description, composition, images, unit, status = 'completed' } = req.body;

		const isPending = status === 'pending';

		// Relaxed validation for pending drafts (FIX-001)
		if (isPending) {
			if (!name) {
				return res.status(400).json({ message: 'Product name is required to start a draft.' });
			}
		} else {
			// Strict validation for completed catalog entries
			if (!name || !productId || !categories || !Array.isArray(categories) || categories.length === 0 || !brand) {
				return res.status(400).json({ message: 'Name, Product ID, Categories (array), and Brand are required.' });
			}

			if (!PRODUCT_ID_REGEX.test(productId)) {
				return res.status(400).json({ message: 'Product ID contains invalid characters. Use alphanumeric, dashes, underscores, or dots.' });
			}
		}

		const userId = (req as any).user?.id;

		// Duplicate check
		const existing = await Product.findOne({ productId, createdBy: userId });
		if (existing) {
			return res.status(400).json({ message: 'A product with this ID already exists in your catalogue.' });
		}

		const product = new Product({
			name,
			productId: productId || undefined,
			categories: categories || [],
			brand: brand || '',
			price: price || 0,
			composition,
			description,
			unit: unit || 'pills',
			images: images || [],
			createdBy: userId,
			status: (status as EnrollmentStatus) || 'pending',
			wizardState: req.body.wizardState || {},
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

// GET /api/products/:productId — Get a single product
export const getProduct = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { productId } = req.params;

		// Smart lookup: support both ObjectId (for backward compat) and productId
		let product;
		if (isValidObjectId(productId)) {
			product = await Product.findOne({
				$or: [{ _id: productId }, { productId }],
				createdBy: userId,
			});
		} else {
			product = await Product.findOne({ productId, createdBy: userId });
		}

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}
		res.json({ product });
	} catch (error) {
		console.error('Get product error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// PUT /api/products/:productId — Update a catalogue product
export const updateProduct = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { productId: idParam } = req.params;

		let product;
		if (isValidObjectId(idParam)) {
			product = await Product.findOne({
				$or: [{ _id: idParam }, { productId: idParam }],
				createdBy: userId,
			});
		} else {
			product = await Product.findOne({ productId: idParam, createdBy: userId });
		}

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}

		const { name, productId, categories, brand, price, description, composition, images, qrSettings, unit } = req.body;

		const oldProductId = product.productId;
		let productIdChanged = false;

		if (name) product.name = name;
		if (productId && productId !== oldProductId) {
			if (!PRODUCT_ID_REGEX.test(productId)) {
				return res.status(400).json({ message: 'Product ID contains invalid characters.' });
			}
			product.productId = productId;
			productIdChanged = true;
		}
		if (categories) product.categories = categories;
		if (brand) product.brand = brand;
		if (price !== undefined) product.price = price;
		if (composition !== undefined) product.composition = composition;
		if (description !== undefined) product.description = description;
		if (unit !== undefined) product.unit = unit;
		if (qrSettings) product.qrSettings = { ...product.qrSettings, ...qrSettings };
		
		// IMAGE CLEANUP: Identify removed images
		if (images) {
			const oldImages = product.images || [];
			const removedImages = oldImages.filter(img => !images.includes(img));
			
			// Reliability: Non-blocking fire-and-forget cleanup
			if (removedImages.length > 0) {
				Promise.all(removedImages.map(img => s3Service.deleteFile(img)))
					.catch(err => console.error('Background: Failed to cleanup some images during product update:', err));
			}
			
			product.images = images;
		}

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

// DELETE /api/products/:productId — Remove a catalogue product
export const deleteProduct = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { productId } = req.params;

		let product;
		if (isValidObjectId(productId)) {
			product = await Product.findOne({
				$or: [{ _id: productId }, { productId }],
				createdBy: userId,
			});
		} else {
			product = await Product.findOne({ productId, createdBy: userId });
		}

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}

		// Data Integrity: Prevent deletion of products that have associated batches
		const existingBatchesCount = await Batch.countDocuments({ product: product._id });
		if (existingBatchesCount > 0) {
			return res.status(400).json({ 
				message: `Cannot delete product: There are ${existingBatchesCount} enrolled batch(es) associated with this product. Data integrity requires that the product remains in the catalogue for verification purposes.` 
			});
		}

		// Reliability: Non-blocking fire-and-forget cleanup
		if (product.images && product.images.length > 0) {
			Promise.all(product.images.map(img => s3Service.deleteFile(img)))
				.catch(err => console.error('Background: Failed to cleanup images during product deletion:', err));
		}

		await product.deleteOne();
		res.json({ message: 'Product deleted.' });
	} catch (error) {
		console.error('Delete product error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// PATCH /api/products/:id/status — Finalize a pending product or mark as failed
export const updateProductStatus = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { status } = req.body;
		const userId = (req as any).user?.id;

		if (!['completed', 'failed'].includes(status)) {
			return res.status(400).json({ message: 'Invalid status update. Use "completed" or "failed".' });
		}

		const product = await Product.findOne({ _id: id, createdBy: userId });
		if (!product) {
			return res.status(404).json({ message: 'Product not found.' });
		}

		if (product.status !== 'pending') {
			return res.status(400).json({ message: 'Only pending products can be updated.' });
		}

		product.status = status;
		await product.save();

		res.json({
			message: `Product marked as ${status}`,
			product
		});
	} catch (error) {
		console.error('Update product status error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// PUT /api/products/:id — Full update of a product (supports draft persistence FIX-004)
export const updateProductDetails = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = (req as any).user?.id;
		const updates = req.body;

		// Security: Only the creator can update
		const query: any = { createdBy: userId };
		if (isValidObjectId(id)) {
			query.$or = [{ _id: id }, { productId: id }];
		} else {
			query.productId = id;
		}

		const product = await Product.findOne(query);

		if (!product) {
			return res.status(404).json({ message: 'Product not found.' });
		}

		// Apply updates
		const allowedUpdates = [
			'name', 'productId', 'categories', 'brand', 'price', 
			'description', 'composition', 'unit', 'images', 
			'imageAccessLevel', 'customerVisibleImages', 'status', 'wizardState', 'qrSettings'
		];

		allowedUpdates.forEach(key => {
			if (updates[key] !== undefined) {
				(product as any)[key] = updates[key];
			}
		});

		await product.save();

		res.json({ message: 'Product updated successfully', product });
	} catch (error: any) {
		console.error('Update product error:', error);
		if (error.code === 11000) {
			return res.status(400).json({ message: 'Product ID already exists.' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
};
