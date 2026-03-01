import { Request, Response } from 'express';
import { hash } from 'bcrypt';
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
	const { id, newPassword } = req.body;
	try {
		const user = await User.findById(id);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		const hashedPassword = await hash(newPassword, 10);
		await User.updateOne(
			{ _id: id },
			{ $set: { password: hashedPassword } },
		);
		res.json({ message: 'Password changed successfully' });
	} catch (err) {
		res.status(500).json({ message: 'Server error' });
	}
};

export const updateUserDetails = async (req: Request, res: Response): Promise<void> => {
	const { id, details } = req.body;
	try {
		const user = await User.findById(id);
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		await User.updateOne(
			{ _id: id },
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
		res.json(items);
	} catch (err) {
		console.error("Error getting cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const addToCabinet = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user.id;
		const productData = req.body;
		
		const existingItem = await CabinetItem.findOne({ userId, productId: productData.productId });
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
			images: productData.images
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
		const { productId } = req.body;
		
		await CabinetItem.findOneAndDelete({ userId, productId });
		
		const items = await CabinetItem.find({ userId });
		res.status(200).json({ message: 'Removed from cabinet', cabinet: items });
	} catch (err) {
		console.error("Error removing from cabinet:", err);
		res.status(500).json({ message: 'Server error' });
	}
};
