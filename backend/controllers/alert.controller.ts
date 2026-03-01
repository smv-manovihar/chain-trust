import { Request, Response } from 'express';
import { Alert } from '../models/alert.model.js';
import { SuspiciousScan } from '../models/suspiciousScan.model.js';

export const createAlert = async (req: Request, res: Response) => {
	try {
		const { hash, email, expiryDate, reminderDate } = req.body;

		// Check if the hash already exists
		const existingAlert = await Alert.findOne({ hash });

		if (existingAlert) {
			return res.status(400).json({ message: 'Alert with this hash already exists' });
		}

		// Create a new alert
		const alert = new Alert({
			hash,
			email,
			expiryDate,
			reminderDate,
		});

		// Save the alert to MongoDB
		await alert.save();

		res.status(201).json({ message: 'Alert added successfully' });
	} catch (error) {
		console.error('Error adding alert:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

export const logSuspiciousScan = async (req: Request, res: Response) => {
	try {
		const { saltValue, brandId, location } = req.body;
		const ipAddress = req.ip || req.socket.remoteAddress;
		const userAgent = req.headers['user-agent'];

		if (!saltValue) {
			return res.status(400).json({ message: 'Salt value is required' });
		}

		const suspiciousScan = new SuspiciousScan({
			saltValue,
			brandId,
			location,
			ipAddress,
			userAgent
		});

		await suspiciousScan.save();
		
		res.status(201).json({ message: 'Suspicious scan logged' });
	} catch (error) {
		console.error('Error logging suspicious scan:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};

export const getSuspiciousScans = async (req: Request, res: Response) => {
	try {
		const scans = await SuspiciousScan.find().sort({ createdAt: -1 }).limit(50);
		res.status(200).json(scans);
	} catch (error) {
		console.error('Error fetching suspicious scans:', error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
};
