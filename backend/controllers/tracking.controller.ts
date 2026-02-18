import { Request, Response } from 'express';
import Product from '../models/product.model.js';

export const updateTrackingStatus = async (req: Request, res: Response) => {
	try {
		const { productId } = req.params;
		const { status, location, description, updatedBy, txHash } = req.body;

		if (!status || !location) {
			return res.status(400).json({ message: 'Status and location are required' });
		}

		const product = await Product.findOne({ productId });

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		} // Ensure product.timeline is initialized
		if (!product.timeline) {
			product.timeline = [];
		}

		const newEvent = {
			status,
			date: new Date(),
			location,
			description,
			updatedBy,
			txHash,
		};

		product.timeline.push(newEvent);
		await product.save();

		res.status(200).json({
			message: 'Tracking status updated successfully',
			timeline: product.timeline,
		});
	} catch (error) {
		console.error('Update tracking error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

export const getProductFlow = async (req: Request, res: Response) => {
	try {
		const { productId } = req.params;

		const product = await Product.findOne({ productId });

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}

		res.status(200).json({
			product: {
				name: product.name,
				brand: product.brand,
				productId: product.productId,
				expiryDate: product.expiryDate,
				batchNumber: product.batchNumber,
			},
			timeline: product.timeline || [],
		});
	} catch (error) {
		console.error('Get tracking error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
