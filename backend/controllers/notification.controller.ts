import { Request, Response } from 'express';
import { Notification } from '../models/notification.model.js';

export const getNotifications = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const limit = parseInt(req.query.limit as string) || 20;
		const skip = parseInt(req.query.skip as string) || 0;

		const notifications = await Notification.find({ user: userId })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

		res.json({ notifications, unreadCount });
	} catch (error) {
		console.error('Error fetching notifications:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

export const markAsRead = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = (req as any).user?.id;

		const notification = await Notification.findOneAndUpdate(
			{ _id: id, user: userId },
			{ isRead: true },
			{ new: true }
		);

		if (!notification) {
			return res.status(404).json({ message: 'Notification not found' });
		}

		res.json({ message: 'Notification marked as read', notification });
	} catch (error) {
		console.error('Error marking notification as read:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

export const markAllAsRead = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;

		await Notification.updateMany(
			{ user: userId, isRead: false },
			{ isRead: true }
		);

		res.json({ message: 'All notifications marked as read' });
	} catch (error) {
		console.error('Error marking all notifications as read:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};
