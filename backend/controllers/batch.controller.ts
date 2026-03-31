import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Batch, { IBatch } from '../models/batch.model.js';
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

const BATCH_NUMBER_REGEX = /^[a-zA-Z0-9\-_.]+$/;

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

		if (!BATCH_NUMBER_REGEX.test(batchNumber)) {
			return res.status(400).json({ message: 'Batch number contains invalid characters.' });
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
			categories: product.categories,
			brand: product.brand,
			images: product.images,
			customerVisibleImages: product.customerVisibleImages || [],
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
		const { search, categories } = req.query;

		const matchQuery: any = { createdBy: new mongoose.Types.ObjectId(userId) };

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

		const batches = await Batch.find(matchQuery)
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

// GET /api/batches/:batchNumber — Get a single batch
export const getBatch = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batchNumber = req.params.batchNumber as string;

		const batch = await resolveItem(Batch, batchNumber, { createdBy: userId }, 'product');

		if (!batch) {
			return res.status(404).json({ message: 'Batch not found' });
		}
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
		// Populate product to check access levels
		await batch.populate('product');
		const product = batch.product as any;
		// Extract request metadata
		const ip = requestIp.getClientIp(req) || req.socket.remoteAddress || 'unknown';
		const userAgent = req.headers['user-agent'] || '';
		const user = (req as any).user;
		const userId = user ? user._id : undefined;

		let latitude = lat !== undefined ? Number(lat) : undefined;
		let longitude = lng !== undefined ? Number(lng) : undefined;
		let city, country;

		if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
			// Phase 1: Try FreeIPAPI for high accuracy (no API key required)
			try {
				const freeGeo = await getGeoLocation(ip);
				if (freeGeo) {
					console.log(`[Geolocation] FreeIPAPI success for ${ip}: ${freeGeo.cityName}, ${freeGeo.countryName}`);
					city = freeGeo.cityName;
					country = freeGeo.countryName;
					
					// Use coordinates from FreeIPAPI if available
					if (latitude === undefined && longitude === undefined) {
						latitude = freeGeo.latitude;
						longitude = freeGeo.longitude;
					}
				} else {
					// Phase 2: Fallback to local geoip-lite if API fails
					const pGeo = geoip.lookup(ip);
					if (pGeo) {
						city = pGeo.city;
						country = pGeo.country;
						if (latitude === undefined && longitude === undefined) {
							latitude = pGeo.ll[0];
							longitude = pGeo.ll[1];
						}
					}
				}
			} catch (err) {
				console.error("[Geolocation] Lookup error, falling back to local DB:", err);
				const fallbackGeo = geoip.lookup(ip);
				if (fallbackGeo) {
					city = fallbackGeo.city;
					country = fallbackGeo.country;
					if (latitude === undefined && longitude === undefined) {
						latitude = fallbackGeo.ll[0];
						longitude = fallbackGeo.ll[1];
					}
				}
			}
		}

		// Calculate Suspiciousness using the history of scans
		const suspiciousResult = await calculateSuspiciousness(batch._id, unitIndex, ip, latitude, longitude);

		// If suspicious, create a Notification for the manufacturer
		if (suspiciousResult.isSuspicious) {
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

				// Check for scan milestones (100, 500, 1000, etc.)
				const totalScans = Array.from(batch.scanCounts.values()).reduce((a: number, b: any) => a + Number(b), 0);
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

		batch.isRecalled = true;
		await batch.save();

		// Notify users who have this batch in their cabinet
		try {
			const batchToRecall = batch; // Local constant for closure safety
			const affectedCabinetItems = await CabinetItem.find({
				batchNumber: batchToRecall.batchNumber,
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

		const pdfBuffer = await pdfService.generateBatchPDF(batch, settings);

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename=batch-${batch.batchNumber}-labels.pdf`);
		res.send(pdfBuffer);
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

		res.json({ scans, batch: {
			batchNumber: batch.batchNumber,
			productName: batch.productName,
			totalScans: Array.from(batch.scanCounts?.values() || []).reduce((a: number, b: any) => a + Number(b), 0)
		} });
	} catch (error) {
		console.error('Error fetching batch scan details:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
