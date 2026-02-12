import { Request, Response } from 'express';
import { hash } from 'bcrypt';
import User from '../models/user.model.js';

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
