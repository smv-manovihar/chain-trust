import { Request, Response } from 'express';
import { hash, compare } from 'bcrypt';
import User from '../models/user.model.js';

export const getUserById = async (req: Request, res: Response): Promise<void> => {
	const { id } = req.params;
	try {
		const user = await User.findById(id).select('-password');
		if (!user) {
			res.status(404).json({ message: 'User not found', user: null });
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
		
		// If user already has a password, currentPassword is REQUIRED
		if (user.password) {
			if (!currentPassword) {
				res.status(400).json({ message: 'Current password is required to change password' });
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
			{ 
				$set: { 
					password: hashedPassword,
					mustChangePassword: false // Clear the flag if it was set
				} 
			},
		);
		res.json({ message: 'Password updated successfully' });
	} catch (err) {
		console.error('Change password error:', err);
		res.status(500).json({ message: 'Server error' });
	}
};

export const updateUserDetails = async (req: Request, res: Response): Promise<void> => {
	const userId = (req as any).user.id;
	const details = req.body;
	
	delete details.password;
	delete details.role;
	delete details.email;

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
