import cron from 'node-cron';
import CabinetItem from '../models/cabinet.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import { sendExpiryAlert } from '../utils/email.utils.js';
import { wasRecentlyNotified } from '../utils/job.utils.js';

/**
 * Job 1: Daily Expiry Check (Runs at 00:05 UTC every day)
 * Scans for medicines expiring in 30, 7, 3, or 1 days.
 */
export const initExpiryJob = () => {
	cron.schedule('5 0 * * *', async () => {
		console.log('[Cron] Running UTC Daily Expiry Check...');
		try {
			const now = new Date();
			const thresholds = [30, 7, 3, 1]; // Days

			for (const days of thresholds) {
				const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
				
				// Find items where expiryDate matches target day (UTC)
				const startOfDay = new Date(target.setUTCHours(0, 0, 0, 0));
				const endOfDay = new Date(target.setUTCHours(23, 59, 59, 999));

				const expiringItems = await CabinetItem.find({
					expiryDate: { $gte: startOfDay, $lte: endOfDay }
				});

				for (const item of expiringItems) {
					// Deduplicate: Don't notify multiple times for the same milestone
					if (await wasRecentlyNotified(item.userId, item._id, 'medicine_expiry')) continue;

					const user = await User.findById(item.userId);
					if (!user) continue;

					const override = item.notificationOverrides?.medicine_expiry;
					const defaults = user.notificationDefaults?.medicine_expiry;
					
					const notifyInApp = override?.inApp !== undefined ? override.inApp : (defaults?.inApp ?? true);
					const notifyEmail = (override?.email !== undefined ? override.email : (defaults?.email ?? true)) && !!user.email;

					if (!notifyInApp && !notifyEmail) continue;

					// Map to Notification Model channel enum
					const channel = notifyInApp && notifyEmail ? 'both' : notifyInApp ? 'in_app' : 'email';

					const dateStr = item.expiryDate?.toISOString().split('T')[0] || 'N/A';

					await Notification.create({
						user: user._id,
						type: 'medicine_expiry',
						title: 'Medicine Expiring Soon',
						message: `${item.name} expires in ${days} days (${dateStr}).`,
						link: `/customer/cabinet/${item._id}`,
						channel,
						metadata: {
							cabinetItemId: item._id,
							medicineName: item.name,
							expiryDate: item.expiryDate
						}
					});

					if (notifyEmail) {
						await sendExpiryAlert(user.email, item.name, dateStr, days, item._id.toString());
					}
				}
			}
		} catch (error) {
			console.error('[Cron Error] Expiry check failed:', error);
		}
	});
};
