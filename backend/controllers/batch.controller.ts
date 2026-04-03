import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Batch, { IBatch, EnrollmentStatus } from '../models/batch.model.js';
import Product from '../models/product.model.js';
import Scan from '../models/scan.model.js';
import * as pdfService from '../services/pdf.service.js';
import geoip from 'geoip-lite';
import requestIp from 'request-ip';
import { calculateSuspiciousness } from '../utils/suspicious.util.js';
import { getGeoLocation } from '../utils/geo.util.js';
import Notification from '../models/notification.model.js';
import CabinetItem from '../models/cabinet.model.js';
import { resolveItem } from '../utils/identifier.util.js';
import { getOnChainBatch } from '../services/blockchain.service.js';
import NodeCache from 'node-cache';

const BATCH_NUMBER_REGEX = /^[a-zA-Z0-9\-_.]+$/;

// [FIX-007] Initialize Blockchain Cache: 5-minute TTL (300 seconds)
const blockchainCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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

/**
 * Synchronizes the batch's state (isRecalled, blockchainHash) with the actual
 * blockchain state. This is called during verification and detail views to 
 * ensure local data matches the immutable truth.
 * uses [FIX-007] RPC Caching to reduce latency.
 */
export const syncBatchWithBlockchain = async (batch: any, newTxHash?: string) => {
	try {
		// [FIX-007] RPC Caching Layer
		const cacheKey = `bc_${batch.batchSalt}`;
		let onChainData = blockchainCache.get(cacheKey) as any;

		if (!onChainData) {
			onChainData = await getOnChainBatch(batch.batchSalt);
			if (onChainData) {
				blockchainCache.set(cacheKey, onChainData);
			}
		}

		if (!onChainData) {
			// console.warn(`[Blockchain Sync] Batch ${batch.batchSalt} not found on-chain.`);
			return batch;
		}

		let hasChanged = false;

		// 2. Sync isRecalled status
		if (batch.isRecalled !== onChainData.isRecalled) {
			console.log(`[Blockchain Sync] Updating isRecalled status: ${batch.isRecalled} -> ${onChainData.isRecalled}`);
			batch.isRecalled = onChainData.isRecalled;
			hasChanged = true;
		}

		// 3. Update blockchainHash if a new transaction occurred or if it's currently missing
		if (newTxHash && batch.blockchainHash !== newTxHash) {
			console.log(`[Blockchain Sync] Updating transaction hash: ${batch.blockchainHash} -> ${newTxHash}`);
			batch.blockchainHash = newTxHash;
			hasChanged = true;
		}

		// 4. Persistence
		if (hasChanged) {
			await batch.save();
			console.log(`[Blockchain Sync] Batch ${batch.batchNumber} synchronized.`);
		}

		return batch;
	} catch (error) {
		console.error(`[Blockchain Sync] Failure for batch ${batch.batchSalt}:`, error);
		return batch;
	}
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
			status = 'completed',
		} = req.body;

		const userId = (req as any).user?.id;
		const isPending = status === 'pending';

		// Relaxed validation for pending drafts (FIX-001)
		if (isPending) {
			if (!productRef) {
				return res.status(400).json({ message: 'Product reference is required to start a draft.' });
			}
		} else {
			// Strict validation for completed enrollments
			if (!productRef || !batchNumber || !quantity || !manufactureDate || !batchSalt) {
				return res.status(400).json({ message: 'Missing required fields (productRef, batchNumber, quantity, manufactureDate, batchSalt)' });
			}

			if (!BATCH_NUMBER_REGEX.test(batchNumber)) {
				return res.status(400).json({ message: 'Batch number contains invalid characters.' });
			}

			if (quantity < 1 || quantity > 10000000) {
				return res.status(400).json({ message: 'Quantity must be between 1 and 10,000,000' });
			}
		}

		// Look up the product from the manufacturer's catalogue
		const product = await Product.findById(productRef);
		if (!product) {
			return res.status(404).json({ message: 'Product not found in your catalogue.' });
		}
		if (product.createdBy.toString() !== userId) {
			return res.status(403).json({ message: 'This product does not belong to your catalogue.' });
		}

		// Check for duplicate batch number (only if provided)
		if (batchNumber) {
			const existingBatch = await Batch.findOne({ batchNumber, createdBy: userId });
			if (existingBatch) {
				return res.status(400).json({ message: 'Batch number already exists for your account.' });
			}
		}

		const newBatch = new Batch({
			batchNumber,
			product: product._id,
			// Cache product fields for fast access
			productName: product.name,
			productId: product.productId,
			categories: product.categories,
			brand: product.brand,
			images: product.images,
			customerVisibleImages: product.customerVisibleImages || [],
			// Batch-specific
			quantity,
			manufactureDate,
			expiryDate,
			description,
			batchSalt: batchSalt || undefined,
			blockchainHash: blockchainHash || '',
			isOnBlockchain: !!blockchainHash,
			isRecalled: false,
			createdBy: userId,
			status: (status as EnrollmentStatus) || 'pending',
			wizardState: req.body.wizardState || {},
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

// PUT /api/batches/:id — Full update of a batch (supports draft persistence FIX-004)
export const updateBatch = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = (req as any).user?.id;
		const updates = req.body;

		// Security: Only the creator can update
		const batch = await Batch.findOne({ _id: id, createdBy: userId });
		if (!batch) {
			return res.status(404).json({ message: 'Batch not found.' });
		}

		// Validation if finalizing
		if (updates.status === 'completed') {
			const required = ['batchNumber', 'quantity', 'manufactureDate', 'batchSalt'];
			const missing = required.filter(field => !updates[field] && !batch[field as keyof IBatch]);
			if (missing.length > 0) {
				return res.status(400).json({ message: `Cannot finalize: missing fields (${missing.join(', ')})` });
			}
		}

		// Apply updates
		const allowedUpdates = [
			'batchNumber', 'quantity', 'manufactureDate', 'expiryDate', 
			'description', 'batchSalt', 'status', 'wizardState', 'blockchainHash'
		];

		allowedUpdates.forEach(key => {
			if (updates[key] !== undefined) {
				(batch as any)[key] = updates[key];
			}
		});

		if (updates.blockchainHash) {
			batch.isOnBlockchain = true;
		}

		await batch.save();

		res.json({ message: 'Batch updated successfully', batch });
	} catch (error: any) {
		console.error('Update batch error:', error);
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
		const { search, categories } = req.query;

		const matchQuery: any = { createdBy: mongoose.Types.ObjectId.createFromHexString(userId) };

		if (search) {
			matchQuery.$or = [
				{ batchNumber: { $regex: search, $options: 'i' } },
				{ productName: { $regex: search, $options: 'i' } },
				{ productId: { $regex: search, $options: 'i' } },
			];
		}

		if (categories) {
			const catList = Array.isArray(categories) ? categories : (categories as string).split(',');
			matchQuery.categories = { $in: catList };
		}

		const batches = await Batch.aggregate([
			{ $match: matchQuery },
			{ $sort: { createdAt: -1 } },
			{
				$lookup: {
					from: 'scans',
					let: { batchId: '$_id' },
					pipeline: [
						{ $match: { $expr: { $eq: ['$batch', '$$batchId'] } } },
						{ $count: 'count' }
					],
					as: 'scanCountData'
				}
			},
			{
				$addFields: {
					totalScans: { $ifNull: [{ $arrayElemAt: ['$scanCountData.count', 0] }, 0] }
				}
			},
			{
				$project: {
					scanCountData: 0
				}
			}
		]);

		res.json({ batches });
	} catch (error) {
		console.error('List batches error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// PATCH /api/batches/:id/status — Finalize a pending batch or mark as failed
export const updateBatchStatus = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { status, blockchainHash } = req.body;
		const userId = (req as any).user?.id;

		if (!['completed', 'failed'].includes(status)) {
			return res.status(400).json({ message: 'Invalid status update. Use "completed" or "failed".' });
		}

		const batch = await Batch.findOne({ _id: id, createdBy: userId });
		if (!batch) {
			return res.status(404).json({ message: 'Batch not found.' });
		}

		if (batch.status !== 'pending') {
			return res.status(400).json({ message: 'Only pending batches can be updated.' });
		}

		batch.status = status;
		if (status === 'completed' && blockchainHash) {
			batch.blockchainHash = blockchainHash;
			batch.isOnBlockchain = true;
		}

		await batch.save();

		res.json({
			message: `Batch marked as ${status}`,
			batch
		});
	} catch (error) {
		console.error('Update batch status error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/batches/:batchNumber — Get a single batch
export const getBatch = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batchNumber = req.params.batchNumber as string;

		const batch = await resolveItem(Batch, batchNumber, { createdBy: userId }, 'product');

		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		// Perform blockchain synchronization in the background to avoid blocking the detail view
		syncBatchWithBlockchain(batch).catch(err => console.error('[Background Sync] Error:', err));

		res.json({ batch });
	} catch (error) {
		console.error('Get batch error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/batches/:batchNumber/qr-data — Get QR data for all units in a batch
export const getBatchQRData = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batchNumber = req.params.batchNumber as string;

		const batch = await resolveItem(Batch, batchNumber, { createdBy: userId }, 'product');

		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 50;
		const startIdx = (page - 1) * limit;
		const endIdx = Math.min(startIdx + limit, (batch as any).quantity);

		// Fetch scan counts for the current range of units
		const scanCounts = await Scan.aggregate([
			{ $match: { batch: (batch as any)._id, unitIndex: { $gte: startIdx, $lt: endIdx } } },
			{ $group: { _id: '$unitIndex', count: { $sum: 1 } } }
		]);

		const countsMap = new Map(scanCounts.map(item => [item._id, item.count]));

		const units = [];
		for (let i = startIdx; i < endIdx; i++) {
			// The secure QR format includes: batchSalt : unitIndex : cryptographicHash
			const unitHash = deriveUnitSalt(batch.batchSalt, i);
			const qrSalt = `${batch.batchSalt}:${i}:${unitHash}`;
			
			const scanCount = countsMap.get(i) || 0;
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
		const ip = requestIp.getClientIp(req) || req.socket.remoteAddress || 'unknown';

		// 1. Initial Logging
		console.log(`\x1b[36m[Verification]\x1b[0m Incoming Scan | Salt: ${salt?.substring(0, 8)}... | IP: ${ip} | Visitor: ${visitorId || 'legacy'}`);

		if (!salt) {
			return res.status(400).json({ message: 'Salt value is required' });
		}

		const result = await findBatchByUnitSalt(salt);
		if (!result) {
			console.log(`\x1b[31m[Verification]\x1b[0m 404 - Product/Salt Not Found | Salt: ${salt.substring(0, 8)}... | IP: ${requestIp.getClientIp(req)}`);
			return res.status(404).json({
				message: 'Product not found',
				isValid: false,
			});
		}

		const { batch, unitIndex } = result;
		// Populate product to check access levels
		await batch.populate('product');
		const product = batch.product as any;

		const userAgent = req.headers['user-agent'] || '';
		const user = (req as any).user;
		const userId = user ? user._id : undefined;

		let latitude = lat !== undefined ? Number(lat) : undefined;
		let longitude = lng !== undefined ? Number(lng) : undefined;
		let city, country;

		// Reliability FIX-005: Use local, synchronous lookup first to prevent external API blocking
		if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
			const pGeo = geoip.lookup(ip);
			if (pGeo) {
				city = pGeo.city;
				country = pGeo.country;
				if (latitude === undefined && longitude === undefined) {
					latitude = pGeo.ll[0];
					longitude = pGeo.ll[1];
				}
			}

			// Background enrichment: Fire-and-forget external API for more precision
			getGeoLocation(ip).then(freeGeo => {
				if (freeGeo) {
					console.log(`[Geolocation] Background Enrichment for ${ip}: ${freeGeo.cityName}`);
				}
			}).catch(() => {}); 
		} else if (ip === '::1' || ip === '127.0.0.1') {
			city = 'Local Development';
			country = 'Internal Network';
		}

		// Calculate Suspiciousness using the history of scans
		const suspiciousResult = await calculateSuspiciousness(batch._id, unitIndex, ip, latitude, longitude);

		// If suspicious, create a Notification for the manufacturer
		if (suspiciousResult.isSuspicious) {
			console.log(`\x1b[33m[Verification]\x1b[0m Flagged Suspicious | Reason: ${suspiciousResult.reason} | Batch: ${batch.batchNumber} | Unit: #${unitIndex+1}`);
			try {
				await Notification.create({
					user: batch.createdBy,
					type: 'suspicious_scan',
					title: 'Suspicious Scan Detected',
					message: `A suspicious scan was flagged for ${batch.productName} (Batch: ${batch.batchNumber}). Reason: ${suspiciousResult.reason}`,
					link: `/manufacturer/batches/${batch._id}`,
					metadata: {
						batchId: batch._id,
						productId: batch.product,
						ip,
						medicineName: batch.productName
					}
				});
			} catch (notifError) {
				console.error('Error creating suspicious scan notification:', notifError);
			}
		}

		// Attempt to record a unique scan
		let newCount = await Scan.countDocuments({ batch: batch._id, unitIndex });
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
				const newScan = await Scan.create({
					batch: batch._id,
					manufacturer: batch.createdBy, // Essential for fast analytics
					unitIndex,
					visitorId: queryVisitorId,
					user: userId,
					ip,
					userAgent,
					latitude,
					longitude,
					city,
					country,
					isSuspicious: suspiciousResult.isSuspicious,
					suspiciousReason: suspiciousResult.reason || undefined,
				});

				// We no longer update the batch model for scan counts per user instruction.
				// The Scan collection is the solo source of truth.
				newCount += 1;

				console.log(`\x1b[32m[Verification]\x1b[0m New Unique Scan Saved | ID: ${newScan._id} | Location: ${city || 'Unknown'}, ${country || 'Unknown'} | Risk: ${newScan.isSuspicious ? 'HIGH' : 'Safe'}`);

				// Check for scan milestones (100, 500, 1000, etc.)
				const totalScans = await Scan.countDocuments({ batch: batch._id });
				const milestones = [100, 500, 1000, 5000, 10000];
				
				if (milestones.includes(totalScans)) {
					try {
						await Notification.create({
							user: batch.createdBy,
							type: 'scan_milestone',
							title: 'Scan Milestone Reached',
							message: `Batch ${batch.batchNumber} has reached ${totalScans} total scans!`,
							link: `/manufacturer/batches/${batch._id}`,
							metadata: {
								batchId: batch._id,
								productId: batch.product,
								medicineName: batch.productName
							}
						});
					} catch (milestoneError) {
						console.error('Error creating milestone notification:', milestoneError);
					}
				}
			} else {
				console.log(`\x1b[2m[Verification]\x1b[0m Repeat Scan (Visitor: ${queryVisitorId.substring(0,8)}...) | Location: ${city || 'Unknown'}`);
			}
		} catch (scanError) {
			console.error('Unique scan tracking error:', scanError);
		}

		// Filter images for customer visibility based on Product settings
		let filteredImages = [];
		const accessLevel = product?.imageAccessLevel || 'public';

		if (accessLevel === 'public' || accessLevel === 'verified_only') {
			const customerVisibleIndices = batch.customerVisibleImages || [];
			filteredImages = customerVisibleIndices.length > 0 
				? customerVisibleIndices.map((idx: number) => batch.images[idx]).filter((img: string) => !!img)
				: batch.images;
		} else {
			// internal_only: hide images from consumer verification view
			filteredImages = [];
		}

		// Trigger background blockchain synchronization without awaiting it
		syncBatchWithBlockchain(batch).catch(err => console.error('[Background Sync] Error:', err));

		res.json({
			isValid: !batch.isRecalled,
			product: {
				// Masked: productId, categories, totalUnits NOT sent to customer
				productName: batch.productName,
				brand: batch.brand,
				batchNumber: batch.batchNumber,
				manufactureDate: batch.manufactureDate,
				expiryDate: batch.expiryDate,
				images: filteredImages,
				unitIndex,
				unitNumber: unitIndex + 1,
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

// POST /api/batches/:batchNumber/recall — Recall a batch
export const recallBatch = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batchNumber = req.params.batchNumber as string;
		const { transactionHash } = req.body; // Capture the latest hash from blockchain

		let batch: IBatch | null;
		if (mongoose.isValidObjectId(batchNumber)) {
			batch = await Batch.findOne({
				$or: [{ _id: batchNumber }, { batchNumber }],
				createdBy: userId,
			});
		} else {
			batch = await Batch.findOne({ batchNumber, createdBy: userId });
		}

		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		// Only the creator can recall
		if (batch.createdBy.toString() !== (req as any).user?.id) {
			return res.status(403).json({ message: 'Not authorized to recall this batch' });
		}

		// Update backend state and link to the new transaction hash via forced sync
		// [FIX-007] Invalidate cache for real-time consistency on status change
		blockchainCache.del(`bc_${batch.batchSalt}`);
		await syncBatchWithBlockchain(batch, transactionHash);

		// Notify users who have this batch in their cabinet
		try {
			const batchToRecall = batch; // Local constant for closure safety
			const affectedCabinetItems = await CabinetItem.find({
				batchId: batchToRecall._id,
				isUserAdded: false // Only for verified batches
			});

			if (affectedCabinetItems.length > 0) {
				const notifications = affectedCabinetItems.map(item => ({
					user: item.userId,
					type: 'batch_recall',
					title: 'Safety Recall Alert',
					message: `The product "${item.name}" (Batch: ${item.batchNumber}) has been recalled by the manufacturer for safety reasons. Please discontinue use immediately and contact your pharmacy.`,
					link: `/customer/cabinet/${item._id}`,
					metadata: {
						batchId: batchToRecall._id,
						productId: batchToRecall.product,
						cabinetItemId: item._id,
						medicineName: item.name
					}
				}));

				await Notification.insertMany(notifications);
			}
		} catch (notificationError) {
			console.error('Error creating recall notifications:', notificationError);
		}

		res.json({ message: 'Batch recalled successfully', batch });
	} catch (error) {
		console.error('Recall batch error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// POST /api/batches/:batchNumber/restore — Restore a recalled batch
export const restoreBatch = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batchNumber = req.params.batchNumber as string;
		const { transactionHash } = req.body; // Capture the latest hash from blockchain

		let batch: IBatch | null;
		if (mongoose.isValidObjectId(batchNumber)) {
			batch = await Batch.findOne({
				$or: [{ _id: batchNumber }, { batchNumber }],
				createdBy: userId,
			});
		} else {
			batch = await Batch.findOne({ batchNumber, createdBy: userId });
		}

		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		// Only the creator can restore
		if (batch.createdBy.toString() !== (req as any).user?.id) {
			return res.status(403).json({ message: 'Not authorized to restore this batch' });
		}

		// Update backend state and link to the new transaction hash via forced sync
		// [FIX-007] Invalidate cache for real-time consistency on status change
		blockchainCache.del(`bc_${batch.batchSalt}`);
		await syncBatchWithBlockchain(batch, transactionHash);

		// Notify users who have this batch in their cabinet that it's restored
		try {
			const batchToRestore = batch;
			const affectedCabinetItems = await CabinetItem.find({
				batchId: batchToRestore._id,
				isUserAdded: false
			});

			if (affectedCabinetItems.length > 0) {
				const notifications = affectedCabinetItems.map(item => ({
					user: item.userId,
					type: 'batch_restored',
					title: 'Medicine Safety Update',
					message: `The product "${item.name}" (Batch: ${item.batchNumber}) has been restored. The manufacturer has resolved the previous safety concerns.`,
					link: `/customer/cabinet/${item._id}`,
					metadata: {
						batchId: batchToRestore._id,
						productId: batchToRestore.product,
						cabinetItemId: item._id,
						medicineName: item.name
					}
				}));

				await Notification.insertMany(notifications);
			}
		} catch (notificationError) {
			console.error('Error creating restore notifications:', notificationError);
		}

		res.json({ message: 'Batch restored successfully', batch });
	} catch (error) {
		console.error('Restore batch error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/batches/:batchNumber/pdf — Generate and download a PDF label sheet
export const getBatchPDF = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batchNumber = req.params.batchNumber as string;

		let batch;
		if (mongoose.isValidObjectId(batchNumber)) {
			batch = await Batch.findOne({
				$or: [{ _id: batchNumber }, { batchNumber }],
				createdBy: userId,
			}).populate('product');
		} else {
			batch = await Batch.findOne({ batchNumber, createdBy: userId }).populate('product');
		}

		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		// Ensure we have current QR settings from the product
		const settings = ((batch as any).product as any)?.qrSettings || {
			qrSize: 15,
			columns: 4,
			showProductName: true,
			showUnitIndex: true,
			showBatchNumber: true,
			labelPadding: 5
		};

		// Set response headers for PDF download
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename=batch-${batch.batchNumber}-labels.pdf`);

		// Generate and stream directly to response
		await pdfService.generateBatchPDF(batch, settings, res);
	} catch (error) {
		console.error('Generate PDF error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};


// GET /api/batches/:batchNumber/scan-details — Get detailed scan records for a specific batch
export const getBatchScanDetails = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batchNumber = req.params.batchNumber as string;

		// Verify batch ownership
		let batch: IBatch | null;
		if (mongoose.isValidObjectId(batchNumber)) {
			batch = await Batch.findOne({
				$or: [{ _id: batchNumber }, { batchNumber }],
				createdBy: userId,
			});
		} else {
			batch = await Batch.findOne({ batchNumber, createdBy: userId });
		}

		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}

		const batchId = batch._id;

		// Get scan records
		const scans = await Scan.find({ batch: batchId })
			.sort({ createdAt: -1 })
			.limit(100); // Limit to top 100 recent scans for deep dive

		const totalScans = await Scan.countDocuments({ batch: batchId });

		res.json({ scans, batch: {
			batchNumber: batch.batchNumber,
			productName: batch.productName,
			totalScans
		} });
	} catch (error) {
		console.error('Error fetching batch scan details:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
