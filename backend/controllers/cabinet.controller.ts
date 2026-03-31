import { Request, Response } from 'express';
import CabinetItem from '../models/cabinet.model.js';
import Scan from '../models/scan.model.js';
import Batch from '../models/batch.model.js';
import Notification from '../models/notification.model.js';
import Prescription from '../models/prescription.model.js';
import { generateIdSlug, resolveItem } from '../utils/identifier.util.js';

/**
 * GET /api/cabinet/stats
 * Dashboard counters for the cabinet.
 */
export const getCabinetStats = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;

		const totalItems = await CabinetItem.countDocuments({ userId });
		const expiringSoon = await CabinetItem.countDocuments({ 
			userId, 
			expiryDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } 
		});
		const scheduledToday = await CabinetItem.countDocuments({
			userId,
			'reminderTimes.0': { $exists: true }
		});

		// Auto-generate expiry notifications (Side effect for dashboard load)
		try {
			const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
			const expiringSoonItems = await CabinetItem.find({
				userId,
				expiryDate: { $lte: thirtyDaysFromNow },
			});

			for (const item of expiringSoonItems) {
				const existing = await Notification.findOne({
					user: userId,
					type: 'medicine_expiry',
					'metadata.cabinetItemId': item._id,
					createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
				});

				if (!existing) {
					await Notification.create({
						user: userId,
						type: 'medicine_expiry',
						title: 'Medication Expiring Soon',
						message: `Your medication "${item.name}" is expiring on ${new Date(item.expiryDate as any).toLocaleDateString()}. Please check for a replacement soon.`,
						link: `/customer/cabinet/${item._id}`,
						metadata: {
							cabinetItemId: item._id,
							medicineName: item.name,
							expiryDate: item.expiryDate
						}
					});
				}
			}
		} catch (expiryNoteErr) {
			console.error('Error auto-generating expiry notifications:', expiryNoteErr);
		}

		res.json({
			totalItems,
			expiringSoon,
			scheduledToday
		});
	} catch (err) {
		console.error("Error getting cabinet stats:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * GET /api/cabinet/list
 * Paginated list of medications.
 */
export const getPersonalCabinet = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;
		const search = req.query.search as string;

		const query: any = { userId };
		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ brand: { $regex: search, $options: 'i' } }
			];
		}

		const total = await CabinetItem.countDocuments(query);
		const items = await CabinetItem.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.populate('batchId', 'isRecalled scanCounts')
			.populate('prescriptionIds')
			.lean();

		const enrichedItems = items.map((item: any) => {
			const batch = item.batchId as any;
			if (batch) {
				const unitIndex = item.salt?.includes(':') ? item.salt.split(':')[1] : '0';
				return {
					...item,
					isRecalled: batch.isRecalled,
					liveScanCount: batch.scanCounts?.get(String(unitIndex)) || 0
				};
			}
			return item;
		});

		res.json({ 
			cabinet: enrichedItems,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (err) {
		console.error("Error getting cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * GET /api/cabinet/:id
 * Single medication details.
 */
export const getCabinetItem = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;
		const item = await CabinetItem.findOne({ userId, _id: id })
			.populate('batchId', 'isRecalled scanCounts')
			.populate('prescriptionIds')
			.lean();
		
		if (!item) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}

		let enrichedItem: any = { ...item };
		const batch = item.batchId as any;
		if (batch) {
			const unitIndex = item.salt?.includes(':') ? item.salt.split(':')[1] : '0';
			enrichedItem.isRecalled = batch.isRecalled;
			enrichedItem.liveScanCount = batch.scanCounts?.get(String(unitIndex)) || 0;
		}

		res.json({ item: enrichedItem });
	} catch (err) {
		console.error("Error getting cabinet item:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * POST /api/cabinet/add
 * Add verified or manual medication.
 */
export const addToCabinet = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const productData = req.body;
		const isUserAdded = !!productData.isUserAdded;
		
		const productId = isUserAdded ? generateIdSlug(productData.name) : productData.productId;

		const existingItem = await CabinetItem.findOne({ 
			userId, 
			productId,
			isUserAdded
		});

		if (existingItem) {
			res.status(400).json({ message: `This medication is already in your cabinet.` });
			return;
		}

		let batchId = null;
		if (!isUserAdded && productData.salt) {
			const batchSalt = productData.salt.split(':')[0];
			const batch = await resolveItem(Batch, batchSalt);
			if (batch) batchId = batch._id;
		}
		
		const newItem = new CabinetItem({
			userId,
			name: productData.name,
			brand: productData.brand,
			productId,
			batchId,
			batchNumber: productData.batchNumber,
			medicineCode: productData.medicineCode,
			composition: productData.composition,
			expiryDate: productData.expiryDate,
			images: productData.images || [],
			salt: productData.salt,
			isUserAdded,
			dosage: productData.dosage,
			frequency: productData.frequency,
			currentQuantity: productData.currentQuantity,
			totalQuantity: productData.totalQuantity,
			unit: productData.unit,
			notes: productData.notes,
			reminderTimes: productData.reminderTimes || [],
			prescriptionIds: productData.prescriptionIds || [],
		});
		await newItem.save();
		
		res.status(201).json({ message: 'Added to cabinet', item: newItem });
	} catch (err) {
		console.error("Error adding to cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * POST /api/cabinet/mark-taken/:id
 * Decrement inventory.
 */
export const markDoseTaken = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;

		const item = await CabinetItem.findOne({ _id: id, userId });
		if (!item) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}

		let decrement = 1;
		if (item.dosage) {
			const match = item.dosage.match(/^\d+/);
			if (match) decrement = parseInt(match[0]);
		}

		if (item.currentQuantity !== undefined && item.currentQuantity > 0) {
			item.currentQuantity = Math.max(0, item.currentQuantity - decrement);
			await item.save();
		}

		res.json({ message: 'Dose marked as taken', currentQuantity: item.currentQuantity });
	} catch (err) {
		console.error("Error marking dose as taken:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * PUT /api/cabinet/:id
 * Update metadata (dosage, reminders, etc).
 */
export const updateCabinetItem = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;
		const updates = req.body;

		delete updates.userId;
		delete updates.productId;
		delete updates.salt;
		delete updates.isUserAdded;

		const item = await CabinetItem.findOneAndUpdate(
			{ _id: id, userId },
			{ $set: updates },
			{ new: true }
		);

		if (!item) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}

		res.json({ message: 'Cabinet item updated', item });
	} catch (err) {
		console.error("Error updating cabinet item:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * DELETE /api/cabinet/:id
 * Remove record.
 */
export const removeFromCabinet = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;
		
		const result = await CabinetItem.findOneAndDelete({ userId, _id: id });
		if (!result) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}
		
		res.status(200).json({ message: 'Removed from cabinet' });
	} catch (err) {
		console.error("Error removing from cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * GET /api/cabinet/recent-scans
 * Last 5 scans for the user.
 */
export const getRecentUserScans = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		
		const scans = await Scan.find({ user: userId })
			.sort({ createdAt: -1 })
			.limit(5)
			.populate({
				path: 'batch',
				select: 'productName batchNumber brand'
			});

		res.json({
			scans: scans.map((s: any) => ({
				id: s._id,
				name: (s.batch as any)?.productName || 'Unknown Product',
				brand: (s.batch as any)?.brand || 'Unknown Brand',
				batchNumber: (s.batch as any)?.batchNumber || 'Unknown',
				status: (s.batch as any)?.isRecalled ? 'Recalled' : 'Authentic',
				date: s.createdAt
			}))
		});
	} catch (err) {
		console.error("Error getting recent scans:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

// --- Prescription Pool Management ---

/**
 * GET /api/cabinet/prescriptions/list
 * User's prescription pool with pagination and linked medication metadata.
 * Query params: page (number), limit (number)
 */
export const getUserPrescriptions = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const skip = parseInt(req.query.skip as string) || 0;
		const limit = parseInt(req.query.limit as string) || 10;

		// 1. Fetch prescriptions with pagination
		const prescriptions = await Prescription.find({ userId })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		const total = await Prescription.countDocuments({ userId });

		// 2. For each prescription, find linked cabinet items
		const prescriptionsWithMedData = await Promise.all(
			prescriptions.map(async (p) => {
				const linkedMedications = await CabinetItem.find({
					userId,
					prescriptionIds: p._id
				}).select('name brand productId batchNumber isUserAdded');

				return {
					...p.toObject(),
					linkedMedications,
					itemCount: linkedMedications.length
				};
			})
		);

		res.json({
			prescriptions: prescriptionsWithMedData,
			pagination: {
				total,
				skip,
				limit,
				hasMore: skip + prescriptions.length < total
			}
		});
	} catch (error) {
		console.error('Error fetching prescriptions:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

/**
 * POST /api/cabinet/prescriptions/upload
 * Add new prescription to the pool.
 */
export const uploadPrescription = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { url, label, doctorName, issuedDate, notes } = req.body;

		if (!url || !label) {
			res.status(400).json({ message: 'URL and label are required' });
			return;
		}

		// Max Overall Media Uploads Limit Check
		const MAX_PRESCRIPTIONS_PER_USER = 50; 
		const currentCount = await Prescription.countDocuments({ userId });
		
		if (currentCount >= MAX_PRESCRIPTIONS_PER_USER) {
			res.status(403).json({ 
				message: `Vault Limit Reached: You have reached the maximum allowed prescriptions (${MAX_PRESCRIPTIONS_PER_USER}). Please delete old documents to add new ones.` 
			});
			return;
		}

		const prescription = new Prescription({
			userId,
			url,
			label,
			doctorName,
			issuedDate,
			notes
		});

		await prescription.save();
		res.status(201).json({ message: 'Prescription added to pool', prescription });
	} catch (error) {
		console.error('Error uploading prescription:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

/**
 * DELETE /api/cabinet/prescriptions/:id
 * Remove and unlink prescription.
 */
export const deletePrescription = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;

		const prescription = await Prescription.findOneAndDelete({ _id: id, userId });
		if (!prescription) {
			res.status(404).json({ message: 'Prescription not found' });
			return;
		}

		// Also remove reference from all cabinet items
		await CabinetItem.updateMany(
			{ userId, prescriptionIds: id },
			{ $pull: { prescriptionIds: id } }
		);

		res.json({ message: 'Prescription deleted and unlinked from cabinet items' });
	} catch (error) {
		console.error('Error deleting prescription:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};
