import { Request, Response } from 'express';
import { hash, compare } from 'bcrypt';
import User from '../models/user.model.js';
import CabinetItem from '../models/cabinet.model.js';
import Scan from '../models/scan.model.js';
import Batch from '../models/batch.model.js';
import { Notification } from '../models/notification.model.js';

export const getUserById = async (req: Request, res: Response): Promise<void> => {
	const { id } = req.params;
	try {
		const user = await User.findById(id).select('-password');
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		res.json({ message: 'User found', user });
	} catch (err) {
		res.status(500).json({ message: 'Server error' });
	}
};

export const changeUserPassword = async (req: Request, res: Response): Promise<void> => {
	const userId = (req as any).user.id;
	const { currentPassword, newPassword } = req.body;
	try {
		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		
		if (currentPassword) {
			if (!user.password) {
				res.status(400).json({ message: 'Account has no password set. Please use password reset.' });
				return;
			}
			const isMatch = await compare(currentPassword, user.password);
			if (!isMatch) {
				res.status(400).json({ message: 'Incorrect current password' });
				return;
			}
		}

		const hashedPassword = await hash(newPassword, 10);
		await User.updateOne(
			{ _id: userId },
			{ $set: { password: hashedPassword } },
		);
		res.json({ message: 'Password changed successfully' });
	} catch (err) {
		res.status(500).json({ message: 'Server error' });
	}
};

export const updateUserDetails = async (req: Request, res: Response): Promise<void> => {
	const userId = (req as any).user.id;
	const details = req.body;
	// Remove sensitive/unwanted fields from mass-assignment
	delete details.password;
	delete details.role;
	delete details.email; // Usually shouldn't update email here

	try {
		const user = await User.findById(userId);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		await User.updateOne(
			{ _id: userId },
			{ $set: { ...details } },
		);
		res.json({ message: 'Details updated successfully' });
	} catch (err) {
		res.status(500).json({ message: 'Server error' });
	}
};

export const getCabinetStats = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const todayStr = new Date().toISOString().split('T')[0];

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
					createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Don't spam: once every 7 days
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
			.limit(limit);

		res.json({ 
			cabinet: items,
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

export const getCabinetItem = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;
		const item = await CabinetItem.findOne({ userId, _id: id });
		
		if (!item) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}
		res.json({ item });
	} catch (err) {
		console.error("Error getting cabinet item:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const addToCabinet = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const productData = req.body;
		
		// If verified product, check for duplicate productId
		if (!productData.isUserAdded) {
			const existingItem = await CabinetItem.findOne({ 
				userId, 
				productId: productData.productId,
				isUserAdded: false
			});
			if (existingItem) {
				res.status(400).json({ message: 'Product already in cabinet' });
				return;
			}
		}
		
		const newItem = new CabinetItem({
			userId,
			name: productData.name,
			brand: productData.brand,
			productId: productData.productId,
			batchNumber: productData.batchNumber,
			medicineCode: productData.medicineCode,
			composition: productData.composition,
			expiryDate: productData.expiryDate,
			images: productData.images || [],
			salt: productData.salt,
			isUserAdded: !!productData.isUserAdded,
			// New management fields
			dosage: productData.dosage,
			frequency: productData.frequency,
			currentQuantity: productData.currentQuantity,
			totalQuantity: productData.totalQuantity,
			unit: productData.unit,
			notes: productData.notes,
			reminderTimes: productData.reminderTimes || [],
			prescriptions: productData.prescriptions || [],
		});
		await newItem.save();
		
		res.status(201).json({ message: 'Added to cabinet', item: newItem });
	} catch (err) {
		console.error("Error adding to cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const markDoseTaken = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;

		const item = await CabinetItem.findOne({ _id: id, userId });
		if (!item) {
			res.status(404).json({ message: 'Cabinet item not found' });
			return;
		}

		// Calculate how much to decrement (dosage can be a number or default to 1)
		// Try to parse dosage like "20mg" or "1 tablet"
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

export const updateCabinetItem = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const { id } = req.params;
		const updates = req.body;

		// Security: don't allow changing ownership or core verification fields
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

export const getNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const user = await User.findById(userId).select('notificationDefaults');
		
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		res.json({ preferences: user.notificationDefaults });
	} catch (error) {
		console.error('Error fetching notification preferences:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

export const updateNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const preferences = req.body;

		const user = await User.findOneAndUpdate(
			{ _id: userId },
			{ $set: { notificationDefaults: preferences } },
			{ new: true }
		).select('notificationDefaults');

		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}

		res.json({ message: 'Notification preferences updated', preferences: user.notificationDefaults });
	} catch (error) {
		console.error('Error updating notification preferences:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};
