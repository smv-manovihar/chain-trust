import { Request, Response } from 'express';
import crypto from 'crypto';
import Batch from '../models/batch.model.js';
import Product from '../models/product.model.js';

/**
 * Derive a unit-level salt from a batch salt and unit index.
 * Formula: SHA-256(batchSalt + "-" + unitIndex)
 */
function deriveUnitSalt(batchSalt: string, unitIndex: number): string {
	return crypto
		.createHash('sha256')
		.update(`${batchSalt}-${unitIndex}`)
		.digest('hex');
}

/**
 * Find the batch that contains a given unit salt.
 * QR encodes salt in format "batchSalt:unitIndex"
 */
async function findBatchByUnitSalt(salt: string): Promise<{ batch: any; unitIndex: number } | null> {
	if (salt.includes(':')) {
		const [batchSalt, indexStr] = salt.split(':');
		const unitIndex = parseInt(indexStr, 10);
		if (isNaN(unitIndex)) return null;

		const batch = await Batch.findOne({ batchSalt });
		if (!batch) return null;

		// Verify the unit index is within range
		if (unitIndex < 0 || unitIndex >= batch.quantity) return null;

		return { batch, unitIndex };
	}

	return null;
}

// POST /api/batches — Create a new batch from a catalogue product
export const createBatch = async (req: Request, res: Response) => {
	try {
		const {
			productRef, // ObjectId of the Product catalogue item
			batchNumber,
			quantity,
			manufactureDate,
			expiryDate,
			description,
			batchSalt,
			blockchainHash,
		} = req.body;

		const userId = (req as any).user?.id;

		if (!productRef || !batchNumber || !quantity || !manufactureDate || !batchSalt) {
			return res.status(400).json({ message: 'Missing required fields (productRef, batchNumber, quantity, manufactureDate, batchSalt)' });
		}

		if (quantity < 1 || quantity > 10000000) {
			return res.status(400).json({ message: 'Quantity must be between 1 and 10,000,000' });
		}

		// Look up the product from the manufacturer's catalogue
		const product = await Product.findById(productRef);
		if (!product) {
			return res.status(404).json({ message: 'Product not found in your catalogue.' });
		}
		if (product.createdBy.toString() !== userId) {
			return res.status(403).json({ message: 'This product does not belong to your catalogue.' });
		}

		// Check for duplicate batch number
		const existingBatch = await Batch.findOne({ batchNumber, createdBy: userId });
		if (existingBatch) {
			return res.status(400).json({ message: 'Batch number already exists for your account.' });
		}

		const newBatch = new Batch({
			batchNumber,
			product: product._id,
			// Cache product fields for fast access
			productName: product.name,
			productId: product.productId,
			category: product.category,
			brand: product.brand,
			images: product.images,
			// Batch-specific
			quantity,
			manufactureDate,
			expiryDate,
			description,
			batchSalt,
			blockchainHash: blockchainHash || '',
			isOnBlockchain: !!blockchainHash,
			isRecalled: false,
			createdBy: userId,
		});

		await newBatch.save();

		res.status(201).json({
			message: 'Batch created successfully',
			batch: newBatch,
		});
	} catch (error: any) {
		console.error('Create batch error:', error);
		if (error.code === 11000) {
			return res.status(400).json({ message: 'Batch number or salt already exists.' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/batches — List all batches for the authenticated user
export const listBatches = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batches = await Batch.find({ createdBy: userId })
			.sort({ createdAt: -1 })
			.lean();

		// Add total scan count for each batch
		const batchesWithStats = batches.map((batch) => {
			const scanCountsObj = batch.scanCounts || {};
			let totalScans = 0;
			if (scanCountsObj instanceof Map) {
				scanCountsObj.forEach((v: number) => { totalScans += v; });
			} else {
				Object.values(scanCountsObj).forEach((v: any) => { totalScans += Number(v) || 0; });
			}
			return {
				...batch,
				totalScans,
			};
		});

		res.json({ batches: batchesWithStats });
	} catch (error) {
		console.error('List batches error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/batches/:id — Get a single batch by ID
export const getBatch = async (req: Request, res: Response) => {
	try {
		const batch = await Batch.findById(req.params.id);
		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}
		res.json({ batch });
	} catch (error) {
		console.error('Get batch error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/batches/:id/qr-data — Get QR data for all units in a batch
export const getBatchQRData = async (req: Request, res: Response) => {
	try {
		const batch = await Batch.findById(req.params.id);
		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 50;
		const startIdx = (page - 1) * limit;
		const endIdx = Math.min(startIdx + limit, batch.quantity);

		const units = [];
		for (let i = startIdx; i < endIdx; i++) {
			// The QR salt format includes the batch salt + unit index for easy lookup
			const qrSalt = `${batch.batchSalt}:${i}`;
			const scanCount = batch.scanCounts?.get(String(i)) || 0;
			units.push({
				unitIndex: i,
				salt: qrSalt,
				scanCount,
			});
		}

		res.json({
			batchId: batch._id,
			batchNumber: batch.batchNumber,
			productName: batch.productName,
			productId: batch.productId,
			totalUnits: batch.quantity,
			page,
			limit,
			totalPages: Math.ceil(batch.quantity / limit),
			units,
		});
	} catch (error) {
		console.error('Get batch QR data error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// POST /api/batches/verify-scan — Public endpoint: verify a product and track scan count
export const verifyScan = async (req: Request, res: Response) => {
	try {
		const { salt } = req.body;
		if (!salt) {
			return res.status(400).json({ message: 'Salt value is required' });
		}

		const result = await findBatchByUnitSalt(salt);
		if (!result) {
			return res.status(404).json({
				message: 'Product not found',
				isValid: false,
			});
		}

		const { batch, unitIndex } = result;

		// Increment scan count
		const currentCount = batch.scanCounts?.get(String(unitIndex)) || 0;
		const newCount = currentCount + 1;
		batch.scanCounts.set(String(unitIndex), newCount);
		await batch.save();

		res.json({
			isValid: !batch.isRecalled,
			product: {
				productId: batch.productId,
				productName: batch.productName,
				category: batch.category,
				brand: batch.brand,
				batchNumber: batch.batchNumber,
				manufactureDate: batch.manufactureDate,
				expiryDate: batch.expiryDate,
				images: batch.images,
				unitIndex,
				unitNumber: unitIndex + 1,
				totalUnits: batch.quantity,
			},
			scanCount: newCount,
			isRecalled: batch.isRecalled,
			blockchainHash: batch.blockchainHash,
		});
	} catch (error) {
		console.error('Verify scan error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// POST /api/batches/:id/recall — Recall a batch
export const recallBatch = async (req: Request, res: Response) => {
	try {
		const batch = await Batch.findById(req.params.id);
		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		// Only the creator can recall
		if (batch.createdBy.toString() !== (req as any).user?.id) {
			return res.status(403).json({ message: 'Not authorized to recall this batch' });
		}

		batch.isRecalled = true;
		await batch.save();

		res.json({ message: 'Batch recalled successfully', batch });
	} catch (error) {
		console.error('Recall batch error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
