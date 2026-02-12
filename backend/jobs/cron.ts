import cron from 'node-cron';
import { Alert } from '../models/alert.model.js';
import { sendExpiryAlert } from '../utils/email.utils.js';

export const startCronJobs = () => {
	// Schedule the job to send email reminders
	// Running every 5 minute to check for reminders
	cron.schedule('*/5 * * * *', async () => {
		console.log('Running cron job: Checking for expiry alerts...');
		try {
			// Find alerts where reminderDate is today (or in the past and not processed?)
			// The original logic was: reminderDate == currentDateTime
			// Which is very specific and likely to miss if the job doesn't run at that exact second.
			// Better logic: reminderDate <= now AND (optional: not sent yet flag)
			// For now, mirroring existing logic but making it more robust: matching the day.

			const now = new Date();
			const startOfDay = new Date(now.setHours(0, 0, 0, 0));
			const endOfDay = new Date(now.setHours(23, 59, 59, 999));

			const alerts = await Alert.find({
				reminderDate: {
					$gte: startOfDay,
					$lte: endOfDay,
				},
			});

			// Send email reminder for each alert
			for (const alert of alerts) {
				const { hash, email, expiryDate } = alert;

				console.log(`Sending alert for hash: ${hash} to ${email}`);
				await sendExpiryAlert(email, hash, expiryDate);
			}
		} catch (error) {
			console.error('Error scheduling email reminders:', error);
		}
	});
};
