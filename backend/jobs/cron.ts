import cron from 'node-cron';
import CabinetItem from '../models/cabinet.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { sendExpiryAlert, sendDoseReminder } from '../utils/email.utils.js';
import { isOccurrenceOnDay } from '../utils/medicine.util.js';

/**
 * Helper to check if a notification of a specific type has already been sent
 * for a specific cabinet item today.
 */
/**
 * Helper to check if a notification of a specific type has already been sent
 * for a specific cabinet item today.
 */
async function wasRecentlyNotified(userId: any, cabinetItemId: any, type: string, hours = 23, extraFilter: any = {}) {
	const since = new Date(Date.now() - hours * 60 * 60 * 1000);
	const query: any = {
		user: userId,
		type,
		'metadata.cabinetItemId': cabinetItemId,
		createdAt: { $gte: since },
		...extraFilter
	};
	
	const existing = await Notification.findOne(query);
	return !!existing;
}

export const startCronJobs = () => {
	// Job 1: Daily Expiry Check (Runs at 00:05 UTC every day)
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
					const notifyEmail = override?.email !== undefined ? override.email : (defaults?.email ?? true);

					const dateStr = item.expiryDate?.toISOString().split('T')[0] || 'N/A';

					if (notifyInApp) {
						await Notification.create({
							user: user._id,
							type: 'medicine_expiry',
							title: 'Medicine Expiring Soon',
							message: `${item.name} expires in ${days} days (${dateStr}).`,
							link: `/customer/cabinet/${item._id}`,
							metadata: {
								cabinetItemId: item._id,
								medicineName: item.name,
								expiryDate: item.expiryDate
							}
						});
					}

					if (notifyEmail && user.email) {
						await sendExpiryAlert(user.email, item.name, dateStr, days);
					}
				}
			}
		} catch (error) {
			console.error('[Cron Error] Expiry check failed:', error);
		}
	});

	// Job 2: Dose Reminders (Every 5 minutes)
	cron.schedule('*/5 * * * *', async () => {
		const now = new Date();
		const currentHour = now.getUTCHours();
		const currentMinute = Math.floor(now.getUTCMinutes() / 5) * 5; // Normalize to 5-min window
		
		console.log(`[Cron] Checking Dose Reminders for UTC ${currentHour}:${currentMinute}...`);
		
		try {
			// Find items that have reminders
			const items = await CabinetItem.find({
				'reminderTimes.0': { $exists: true }
			});

			for (const item of items) {
				const user = await User.findById(item.userId);
				if (!user) continue;

				// Determine lead time (Preference: Medicine Override > User Default > 0)
				const override = item.notificationOverrides?.dose_reminder;
				const defaults = user.notificationDefaults?.dose_reminder;
				const leadTime = override?.leadTimeMinutes !== undefined ? override.leadTimeMinutes : (defaults?.leadTimeMinutes ?? 0);

				// Filter reminders matching current UTC time window + lead time + frequency rules
				const matching = item.reminderTimes?.filter(r => {
					const rDate = new Date(r.time);
					// Subtract lead time from scheduled time to find 'trigger time'
					const triggerDate = new Date(rDate.getTime() - leadTime * 60 * 1000);
					
					// 1. Check time window (Standard)
					const timeMatches = triggerDate.getUTCHours() === currentHour && 
						   Math.abs(triggerDate.getUTCMinutes() - currentMinute) < 5;
					
					if (!timeMatches) return false;

					// 2. Check Frequency Rules
					return isOccurrenceOnDay(r, now);
				}) || [];

				for (const reminder of matching) {
					const rDate = new Date(reminder.time);
					const scheduledTime = `${rDate.getUTCHours().toString().padStart(2, '0')}:${rDate.getUTCMinutes().toString().padStart(2, '0')}`;

					// Deduplicate: Don't repeat THE SAME specific reminder within the same hour
					if (await wasRecentlyNotified(item.userId, item._id, 'dose_reminder', 1, { 'metadata.scheduledTime': scheduledTime })) {
						continue;
					}

					const notifyInApp = override?.inApp !== undefined ? override.inApp : (defaults?.inApp ?? true);
					const notifyEmail = override?.email !== undefined ? override.email : (defaults?.email ?? false);

					if (notifyInApp) {
						const mealText = reminder.mealContext ? ` (${reminder.mealContext.replace('_', ' ')})` : '';
						const timeContext = leadTime > 0 ? `In ${leadTime} minutes: ` : '';
						
						await Notification.create({
							user: user._id,
							type: 'dose_reminder',
							title: 'Time for your Medicine',
							message: `${timeContext}It's time to take ${item.dosage || ''} of ${item.name}${mealText}.`,
							link: `/customer/cabinet/${item._id}`,
							metadata: {
								cabinetItemId: item._id,
								medicineName: item.name,
								scheduledTime: scheduledTime,
								leadTimeApplied: leadTime
							}
						});
					}

					if (notifyEmail && user.email) {
						await sendDoseReminder(user.email, item.name, item.dosage, reminder.mealContext, item.unit);
					}
				}
			}
		} catch (error) {
			console.error('[Cron Error] Dose reminder check failed:', error);
		}
	});
};
