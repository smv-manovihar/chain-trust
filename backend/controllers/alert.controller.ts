import { Request, Response } from 'express';
import { Alert } from '../models/alert.model.js';

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

