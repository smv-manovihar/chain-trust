import { Request, Response } from 'express';
import { hash, compare } from 'bcrypt';
import User from '../models/user.model.js';
import CabinetItem from '../models/cabinet.model.js';

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

export const getPersonalCabinet = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const items = await CabinetItem.find({ userId });
		res.json({ cabinet: items });
	} catch (err) {
		console.error("Error getting cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const addToCabinet = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const productData = req.body;
		
		const existingItem = await CabinetItem.findOne({ 
			userId, 
			productId: productData.productId,
			isUserAdded: !!productData.isUserAdded
		});
		
		if (existingItem) {
			res.status(400).json({ message: 'Product already in cabinet' });
			return;
		}
		
		const newItem = new CabinetItem({
			userId,
			name: productData.name,
			brand: productData.brand,
			productId: productData.productId,
			batchNumber: productData.batchNumber,
			expiryDate: productData.expiryDate,
			images: productData.images,
			salt: productData.salt,
			isUserAdded: !!productData.isUserAdded
		});
		await newItem.save();
		
		const items = await CabinetItem.find({ userId });
		res.status(200).json({ message: 'Added to cabinet', cabinet: items });
	} catch (err) {
		console.error("Error adding to cabinet:", err);
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
		
		const items = await CabinetItem.find({ userId });
		res.status(200).json({ message: 'Removed from cabinet', cabinet: items });
	} catch (err) {
		console.error("Error removing from cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};
