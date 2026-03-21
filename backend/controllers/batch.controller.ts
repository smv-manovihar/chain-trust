import { Request, Response } from 'express';
import crypto from 'crypto';
import Batch from '../models/batch.model.js';
import Product from '../models/product.model.js';
import Scan from '../models/scan.model.js';
import * as pdfService from '../services/pdf.service.js';
import geoip from 'geoip-lite';
import requestIp from 'request-ip';
import { calculateSuspiciousness } from '../utils/suspicious.util.js';

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
	// Support 3-part format: batchSalt:unitIndex:unitHash
	if (salt.includes(':')) {
		const parts = salt.split(':');
		if (parts.length < 2) return null;

		const batchSalt = parts[0];
		const unitIndex = parseInt(parts[1], 10);
		const providedHash = parts[2]; // Optional in old format, required in new

		if (isNaN(unitIndex)) return null;

		const batch = await Batch.findOne({ batchSalt });
		if (!batch) return null;

		// Verify the unit index is within range
		if (unitIndex < 0 || unitIndex >= batch.quantity) return null;

		// Cryptographic Integrity Check: Verify the hash if provided
		// If the providedHash exists, it MUST match the derived salt.
		// This prevents tampering with the unitIndex.
		if (providedHash) {
			const expectedHash = deriveUnitSalt(batchSalt, unitIndex);
			if (providedHash !== expectedHash) {
				console.warn(`[Security] QR Integrity check failed for batch ${batchSalt} unit ${unitIndex}`);
				return null;
			}
		}

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
		const batch = await Batch.findById(req.params.id).populate('product');
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
		const batch = await Batch.findById(req.params.id).populate('product');
		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 50;
		const startIdx = (page - 1) * limit;
		const endIdx = Math.min(startIdx + limit, batch.quantity);

		const units = [];
		for (let i = startIdx; i < endIdx; i++) {
			// The secure QR format includes: batchSalt : unitIndex : cryptographicHash
			const unitHash = deriveUnitSalt(batch.batchSalt, i);
			const qrSalt = `${batch.batchSalt}:${i}:${unitHash}`;
			
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
		const { salt, visitorId, lat, lng } = req.body;
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
		// Extract request metadata
		const ip = requestIp.getClientIp(req) || req.socket.remoteAddress || 'unknown';
		const userAgent = req.headers['user-agent'] || '';
		const user = (req as any).user;
		const userId = user ? user._id : undefined;

		let latitude = lat !== undefined ? Number(lat) : undefined;
		let longitude = lng !== undefined ? Number(lng) : undefined;
		let city, country;

		if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
			const geo = geoip.lookup(ip);
			if (geo) {
				city = geo.city;
				country = geo.country;
				// Fallback to IP-geo if frontend didn't provide precise coords
				if (latitude === undefined && longitude === undefined) {
					latitude = geo.ll[0];
					longitude = geo.ll[1];
				}
			}
		}

		// Calculate Suspiciousness using the history of scans
		const suspiciousResult = await calculateSuspiciousness(batch._id, unitIndex, ip, latitude, longitude);

		// Attempt to record a unique scan
		let newCount = batch.scanCounts?.get(String(unitIndex)) || 0;
		try {
			// Require frontend to send visitorId (UUID). Fallback if old client.
			const queryVisitorId = visitorId || `legacy-${ip}`;

			const existingScan = await Scan.findOne({
				batch: batch._id,
				unitIndex,
				visitorId: queryVisitorId,
			});

			if (!existingScan) {
				// Record new unique scan
				await Scan.create({
					batch: batch._id,
					unitIndex,
					visitorId: queryVisitorId,
					user: userId,
					ip,
					userAgent,
					latitude,
					longitude,
					city,
					country
				});
				// Increment cached count only for first-time unique scan
				newCount += 1;
				batch.scanCounts.set(String(unitIndex), newCount);
				await batch.save();
			}
		} catch (scanError) {
			console.error('Unique scan tracking error:', scanError);
		}

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
			isSuspicious: suspiciousResult.isSuspicious,
			suspiciousReason: suspiciousResult.reason,
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

// GET /api/batches/:id/pdf — Generate and download a PDF label sheet
export const getBatchPDF = async (req: Request, res: Response) => {
	try {
		const batch = await Batch.findById(req.params.id).populate('product');
		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		// Ensure we have current QR settings from the product
		const settings = (batch.product as any)?.qrSettings || {
			qrSize: 15,
			columns: 4,
			showProductName: true,
			showUnitIndex: true,
			showBatchNumber: true,
			labelPadding: 5
		};

		const pdfBuffer = await pdfService.generateBatchPDF(batch, settings);

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename=batch-${batch.batchNumber}-labels.pdf`);
		res.send(pdfBuffer);
	} catch (error) {
		console.error('Generate PDF error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
