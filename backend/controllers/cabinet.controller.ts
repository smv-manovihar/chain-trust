import { Request, Response } from 'express';
import CabinetItem from '../models/cabinet.model.js';
import Scan from '../models/scan.model.js';
import Batch from '../models/batch.model.js';
import Prescription from '../models/prescription.model.js';
import DosageLog from '../models/dosage.model.js';
import Notification from '../models/notification.model.js';
import { AI_SERVICE_URL, INTERNAL_API_KEY } from '../config/config.js';
import { generateIdSlug, resolveItem } from '../utils/identifier.util.js';

const WINDOW_MINUTES = 180; // 3 hours window for "in time"

const calculateStreak = async (item: any): Promise<number> => {
	if (!item.reminderTimes || item.reminderTimes.length === 0) return 0;

	const now = new Date();
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);

	// Get logs for this item sorted DESC
	const logs = await DosageLog.find({ cabinetItemId: item._id }).sort({ timestamp: -1 }).lean();
	
	let streak = 0;
	let checkDate = new Date(startOfToday);

	// Function to check if a single day was "Perfect"
	const isDayPerfect = (day: Date, dayLogs: any[]): boolean => {
		const reminderCount = item.reminderTimes.length;
		if (dayLogs.length !== reminderCount) return false;

		// Optimization: If logs have the 'wasPunctual' flag, use it directly.
		// This avoids expensive date comparisons for most records.
		return dayLogs.every(log => {
			if (log.wasPunctual !== undefined) return log.wasPunctual;
			
			// Fallback for legacy logs
			const dayReminders = [...item.reminderTimes].sort((a: any, b: any) => {
				const da = new Date(a.time);
				const db = new Date(b.time);
				return (da.getHours() * 60 + da.getMinutes()) - (db.getHours() * 60 + db.getMinutes());
			});
			
			// For legacy, we still need a sorted comparison
			const sortedLogs = [...dayLogs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			const logIndex = sortedLogs.indexOf(log);
			const reminderTime = new Date(dayReminders[logIndex].time);
			const scheduled = new Date(day);
			scheduled.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);
			const diffMins = Math.abs(log.timestamp.getTime() - scheduled.getTime()) / (1000 * 60);
			return diffMins <= WINDOW_MINUTES;
		});
	};

	// Function to check if Today is still "On Track"
	const isTodayOnTrack = (dayLogs: any[]): boolean => {
		const dayReminders = [...item.reminderTimes].sort((a: any, b: any) => {
			const da = new Date(a.time);
			const db = new Date(b.time);
			return (da.getHours() * 60 + da.getMinutes()) - (db.getHours() * 60 + db.getMinutes());
		});

		// Check each reminder due so far today
		for (let i = 0; i < dayReminders.length; i++) {
			const reminderTime = new Date(dayReminders[i].time);
			const scheduled = new Date(now);
			scheduled.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);

			if (scheduled.getTime() < now.getTime() - (WINDOW_MINUTES * 60 * 1000)) {
				// Past due (outside window). Must have a punctual log.
				const matchingLog = dayLogs.find(l => {
					if (l.wasPunctual !== undefined) return l.wasPunctual;
					// Legacy fallback
					const diffMins = Math.abs(l.timestamp.getTime() - scheduled.getTime()) / (1000 * 60);
					return diffMins <= WINDOW_MINUTES;
				});
				
				if (!matchingLog) return false;
			}
		}
		return true;
	};

	// 1. Check Today
	const logsToday = logs.filter(l => l.timestamp >= startOfToday);
	if (!isTodayOnTrack(logsToday)) return 0; // Missed today

	// If today is actually finished (all doses taken), count it
	if (logsToday.length === item.reminderTimes.length && isDayPerfect(startOfToday, logsToday)) {
		streak++;
	}

	// 2. Check previous days
	checkDate.setDate(checkDate.getDate() - 1);
	while (true) {
		const dayStart = new Date(checkDate);
		const dayEnd = new Date(checkDate);
		dayEnd.setHours(23, 59, 59, 999);

		const dayLogs = logs.filter(l => l.timestamp >= dayStart && l.timestamp <= dayEnd);
		if (isDayPerfect(checkDate, dayLogs)) {
			streak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else {
			break;
		}
		
		if (streak > 365) break; // Safety break
	}

	return streak;
};

const refreshStreak = async (itemId: string): Promise<number> => {
	const item = await CabinetItem.findById(itemId);
	if (!item) return 0;
	const streak = await calculateStreak(item);
	item.currentStreak = streak;
	item.lastStreakUpdate = new Date();
	await item.save();
	return streak;
};

/**
 * GET /api/cabinet/upcoming
 * Returns a list of upcoming doses for the next 24 hours.
 */
export const getUpcomingDoses = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date();
		endOfDay.setHours(23, 59, 59, 999);

		const items = await CabinetItem.find({ 
			userId, 
			status: 'active', 
			'reminderTimes.0': { $exists: true } 
		}).lean();
		
		const upcoming: any[] = [];
		const now = new Date();

		for (const item of items) {
			if (!item.reminderTimes) continue;

			// Get logs for today for this item
			const logsTodayCount = await DosageLog.countDocuments({
				cabinetItemId: item._id,
				timestamp: { $gte: startOfDay, $lte: endOfDay }
			});

			// Use cached streak if recently updated, otherwise trigger a background refresh logic might be needed
			// For now, return the cached value directly for performance
			const currentStreak = item.currentStreak || 0;

			// Sort reminder times for this item chronologically by hour/min
			const sortedReminders = [...item.reminderTimes].sort((a: any, b: any) => {
				const da = new Date(a.time);
				const db = new Date(b.time);
				return (da.getHours() * 60 + da.getMinutes()) - (db.getHours() * 60 + db.getMinutes());
			});

			for (const reminder of sortedReminders) {
				const index = sortedReminders.indexOf(reminder);
				const reminderDate = new Date(reminder.time);
				const h = reminderDate.getHours();
				const m = reminderDate.getMinutes();

				const scheduledToday = new Date();
				scheduledToday.setHours(h, m, 0, 0);

				// Logic:
				// If index < logsTodayCount, this reminder was fulfilled today.
				let scheduledTime = scheduledToday;
				let isMissed = false;
				let isFulfilled = index < logsTodayCount;

				if (isFulfilled) {
					// Fulfilled today, next occurrence is tomorrow
					scheduledTime = new Date(scheduledToday.getTime() + 24 * 60 * 60 * 1000);
					isFulfilled = false;
				} else if (scheduledToday.getTime() < now.getTime()) {
					// Past time today and not fulfilled => Missed
					isMissed = true;
				}

				upcoming.push({
					cabinetItemId: item._id,
					name: item.name,
					brand: item.brand,
					image: item.images?.[0],
					scheduledTime,
					isMissed,
					mealContext: reminder.mealContext,
					dosage: item.dosage,
					unit: item.unit,
					currentStreak
				});
			}
		}

		// Sort all upcoming doses by their next scheduled time
		upcoming.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

		res.json({ upcoming: upcoming.slice(0, 10) }); // Limit to next 10
	} catch (err) {
		console.error("Error getting upcoming doses:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

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
		const searchTerm = req.query.search as string;
		const status = req.query.status as string;

		const query: any = { userId };
		if (searchTerm) {
			query.$or = [
				{ name: { $regex: searchTerm, $options: 'i' } },
				{ brand: { $regex: searchTerm, $options: 'i' } },
				{ composition: { $regex: searchTerm, $options: 'i' } },
				{ doctorName: { $regex: searchTerm, $options: 'i' } },
				{ notes: { $regex: searchTerm, $options: 'i' } },
				{ productId: { $regex: searchTerm, $options: 'i' } },
			];
		}
		if (status === 'all') {
			// No filter on status
		} else if (status) {
			query.status = status;
		} else {
			query.status = 'active'; // Default to active items
		}

		const total = await CabinetItem.countDocuments(query);
		const items = await CabinetItem.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.populate('batchId', 'isRecalled')
			.populate('prescriptionIds')
			.lean();

		// Fetch scan counts for all items in bulk to avoid N+1 queries
		const scanPairs = items
			.filter(item => item.batchId && item.salt?.includes(':'))
			.map(item => ({
				batch: (item.batchId as any)._id,
				unitIndex: parseInt(item.salt?.split(':')[1] || '0', 10)
			}));

		let countsMap = new Map<string, number>();
		if (scanPairs.length > 0) {
			const counts = await Scan.aggregate([
				{ $match: { $or: scanPairs } },
				{ $group: { 
					_id: { batch: "$batch", unit: "$unitIndex" }, 
					count: { $sum: 1 } 
				}}
			]);
			counts.forEach(c => {
				countsMap.set(`${c._id.batch}:${c._id.unit}`, c.count);
			});
		}

		const enrichedItems = items.map((item: any) => {
			const batch = item.batchId as any;
			const currentStreak = item.currentStreak || 0;
			
			if (batch) {
				const salt = item.salt as string | undefined;
				const unitIndex = salt?.includes(':') ? salt.split(':')[1] : '0';
				const countKey = `${batch._id}:${unitIndex}`;
				return {
					...item,
					isRecalled: batch.isRecalled,
					liveScanCount: countsMap.get(countKey) || 0,
					currentStreak
				};
			}
			return { ...item, currentStreak };
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
			.populate('batchId', 'isRecalled')
			.populate('prescriptionIds')
			.lean();
		
		if (!item) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}

		let enrichedItem: any = { ...item };
		const batch = item.batchId as any;
		if (batch) {
			const unitIndexString = item.salt?.includes(':') ? item.salt.split(':')[1] : '0';
			const unitIndex = parseInt(unitIndexString, 10) || 0;
			const liveScanCount = await Scan.countDocuments({ batch: batch._id, unitIndex });
			
			enrichedItem.isRecalled = batch.isRecalled;
			enrichedItem.liveScanCount = liveScanCount;
		}

		enrichedItem.currentStreak = item.currentStreak || 0;

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
			doctorName: productData.doctorName,
			notes: productData.notes,
			reminderTimes: productData.reminderTimes || [],
			prescriptionIds: productData.prescriptionIds || [],
		});

		try {
			await newItem.save();
			res.status(201).json({ message: 'Added to cabinet', item: newItem });
			return;
		} catch (saveErr: any) {
			if (saveErr.code === 11000) {
				res.status(400).json({ message: 'This medication is already in your cabinet.' });
				return;
			}
			throw saveErr;
		}
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

		// 1. Recency Check (Double-click prevention)
		// Threshold: 5 minutes
		const RE_SCAN_THRESHOLD_MS = 5 * 60 * 1000;
		if (item.lastDoseTaken) {
			const timeSinceLastDose = Date.now() - new Date(item.lastDoseTaken).getTime();
			if (timeSinceLastDose < RE_SCAN_THRESHOLD_MS) {
				const remainingMinutes = Math.ceil(( RE_SCAN_THRESHOLD_MS - timeSinceLastDose ) / 1000 / 60);
				res.status(400).json({ 
					message: `Dose recently recorded. Please wait ${remainingMinutes} minute(s) before logging another dose for this medicine.`,
					lastDoseTaken: item.lastDoseTaken
				});
				return;
			}
		}

		// 2. Inventory Logic
		const decrement = item.dosage || 1;

		const inventoryBefore = item.currentQuantity || 0;
		if (item.currentQuantity !== undefined && item.currentQuantity > 0) {
			item.currentQuantity = Math.max(0, item.currentQuantity - decrement);
		}

		// 3. Create Dosage Log (Audit Trail)
		const log = new DosageLog({
			userId,
			cabinetItemId: item._id,
			timestamp: new Date(),
			doseAmount: decrement,
			inventoryBefore
		});
		await log.save();

		// 4. Update Adherence State & Streak (Calculate on Write)
		item.lastDoseTaken = log.timestamp;
		
		// Calculate wasPunctual
		let wasPunctual = false;
		if (item.reminderTimes && item.reminderTimes.length > 0) {
			const now = new Date();
			for (const reminder of item.reminderTimes) {
				const rTime = new Date(reminder.time);
				const scheduled = new Date();
				scheduled.setHours(rTime.getHours(), rTime.getMinutes(), 0, 0);
				
				const diffMins = Math.abs(now.getTime() - scheduled.getTime()) / (1000 * 60);
				if (diffMins <= WINDOW_MINUTES) {
					wasPunctual = true;
					break;
				}
			}
		}
		log.wasPunctual = wasPunctual;
		await log.save();
		
		await item.save();
		const currentStreak = await refreshStreak(item._id.toString());

		// 5. Dynamic Low-Stock Alert
		// Threshold: 3 days of doses (buffer)
		const dailyRequirement = item.reminderTimes?.length || 1; 
		const lowStockThreshold = dailyRequirement * 3;

		if (item.currentQuantity !== undefined && item.currentQuantity <= lowStockThreshold) {
			// Check if we already sent a low stock alert today to avoid spam
			const startOfDay = new Date();
			startOfDay.setHours(0, 0, 0, 0);

			const existingAlert = await Notification.findOne({
				user: userId,
				type: 'medicine_expiry', 
				'metadata.cabinetItemId': item._id,
				createdAt: { $gte: startOfDay }
			});

			if (!existingAlert) {
				await Notification.create({
					user: userId,
					type: 'medicine_expiry',
					title: 'Low Medication Stock',
					message: `Your supply for "${item.name}" is low (${item.currentQuantity} remaining). This is less than a 3-day buffer based on your routine.`,
					link: `/customer/cabinet/${item._id}`,
					metadata: {
						cabinetItemId: item._id,
						medicineName: item.name,
						currentQuantity: item.currentQuantity,
						isLowStock: true
					}
				});
			}
		}

		res.json({ 
			message: 'Dose marked as taken', 
			currentQuantity: item.currentQuantity,
			lastDoseTaken: item.lastDoseTaken,
			currentStreak,
			wasPunctual: log.wasPunctual,
			logId: log._id
		});
	} catch (err) {
		console.error("Error marking dose as taken:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

/**
 * POST /api/cabinet/undo-dose/:id
 * Reverts the last taken dose using DosageLog history.
 */
export const undoDose = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;

		// 1. Find the cabinet item
		const item = await CabinetItem.findOne({ _id: id, userId });
		if (!item) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}

		// 2. Find the most recent log for this item
		const latestLog = await DosageLog.findOne({ 
			userId, 
			cabinetItemId: id 
		}).sort({ timestamp: -1 });

		if (!latestLog) {
			res.status(400).json({ message: 'No dose records found to undo.' });
			return;
		}

		// 3. Restore inventory
		if (item.currentQuantity !== undefined) {
			item.currentQuantity += latestLog.doseAmount;
		}

		// 4. Delete the log
		await DosageLog.findByIdAndDelete(latestLog._id);

		// 5. Revert lastDoseTaken to the next most recent log (if any)
		const previousLog = await DosageLog.findOne({ 
			userId, 
			cabinetItemId: id 
		}).sort({ timestamp: -1 });

		item.lastDoseTaken = previousLog ? previousLog.timestamp : undefined;
		await item.save();

		// 6. Update Streak (Calculate on Write)
		const currentStreak = await refreshStreak(item._id.toString());

		res.json({ 
			message: 'Dose reverted successfully', 
			currentQuantity: item.currentQuantity,
			lastDoseTaken: item.lastDoseTaken,
			currentStreak
		});
	} catch (err) {
		console.error("Error undoing dose:", err);
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
		const search = req.query.search as string;

		const query: any = { userId };
		if (search) {
			query.$or = [
				{ label: { $regex: search, $options: 'i' } },
				{ doctorName: { $regex: search, $options: 'i' } },
				{ notes: { $regex: search, $options: 'i' } },
			];
		}

		// 1. Fetch prescriptions with pagination and search
		const prescriptions = await Prescription.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		const total = await Prescription.countDocuments(query);

		const prescriptionIds = prescriptions.map(p => p._id);
		const allLinkedMedications = await CabinetItem.find({
			userId,
			prescriptionIds: { $in: prescriptionIds }
		}).select('name brand productId batchNumber isUserAdded images prescriptionIds');

		// 2. For each prescription, filter the pre-fetched medications
		const prescriptionsWithMedData = prescriptions.map((p) => {
			const linkedMedications = allLinkedMedications.filter(med => 
				med.prescriptionIds.some(id => id.toString() === p._id.toString())
			);

			return {
				...p.toObject(),
				linkedMedications,
				itemCount: linkedMedications.length
			};
		});

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

		// Ensure label includes extension from URL if missing
		const extension = url.includes('.') ? url.slice(url.lastIndexOf('.')) : '';
		const finalLabel = label.toLowerCase().endsWith(extension.toLowerCase()) 
			? label 
			: `${label}${extension}`;

		const prescription = new Prescription({
			userId,
			url,
			label: finalLabel,
			doctorName,
			issuedDate,
			notes
		});

		await prescription.save();

		// Trigger background digitalization (fire-and-forget)
		fetch(`${AI_SERVICE_URL}/api/ai/parse`, {
			method: 'POST',
			headers: { 
				'Content-Type': 'application/json',
				'X-Internal-Secret': INTERNAL_API_KEY
			},
			body: JSON.stringify({
				url: prescription.url,
				display_name: prescription.label,
				prescription_id: prescription._id.toString()
			})
		}).catch(err => {
			console.error('Failed to trigger background prescription parsing:', err);
		});

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

/**
 * GET /api/cabinet/logs/:id
 * Retrieve dosage logs for a specific cabinet item.
 */
export const getDosageLogs = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;

		const logs = await DosageLog.find({ 
			userId, 
			cabinetItemId: id 
		})
		.sort({ timestamp: -1 })
		.limit(50) // Return last 50 logs
		.lean();

		res.json(logs);
	} catch (err) {
		console.error("Error getting dosage logs:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

