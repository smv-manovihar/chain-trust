import { Request, Response } from 'express';
import { Alert } from '../models/alert.model.js';

export const createAlert = async (req: Request, res: Response) => {
	try {
		const { type, message, metadata } = req.body;
		const userId = (req as any).user?.id;

		const alert = new Alert({
			type,
			message,
			metadata,
			createdBy: userId,
		});

		await alert.save();
		res.status(201).json({ message: 'Alert added successfully', alert });
	} catch (error) {
		console.error('Error adding alert:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

export const getAlerts = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const alerts = await Alert.find({ createdBy: userId })
			.sort({ createdAt: -1 })
			.limit(50);
		
		res.json({ alerts });
	} catch (error) {
		console.error('Error fetching alerts:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

export const markAlertAsRead = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = (req as any).user?.id;

		const alert = await Alert.findOneAndUpdate(
			{ _id: id, createdBy: userId },
			{ isRead: true },
			{ new: true }
		);

		if (!alert) {
			return res.status(404).json({ message: 'Alert not found' });
		}

		res.json({ message: 'Alert marked as read', alert });
	} catch (error) {
		console.error('Error marking alert as read:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

