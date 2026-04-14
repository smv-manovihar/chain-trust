import cron from 'node-cron';
import CabinetItem from '../models/cabinet.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import { sendDoseReminder } from '../utils/email.utils.js';
import { isOccurrenceOnDay } from '../utils/medicine.util.js';
import { wasRecentlyNotified } from '../utils/job.utils.js';

/**
 * Job 2: Dose Reminders (Every 5 minutes)
 * Checks for scheduled doses and applies lead-time notifications.
 */
/**
 * Logic to execute a single dose reminder notification.
 * Includes a safety check to ensure the user wasn't already notified 
 * (e.g., if multiple crons triggered or server restarted).
 */
async function executeReminder(item: any, user: any, reminder: any, leadTime: number) {
    try {
        const rDate = new Date(reminder.time);
        const scheduledTime = `${rDate.getUTCHours().toString().padStart(2, '0')}:${rDate.getUTCMinutes().toString().padStart(2, '0')}`;

        // SAFETY: Deduplicate one last time before sending
        if (await wasRecentlyNotified(item.userId, item._id, 'dose_reminder', 1, { 'metadata.scheduledTime': scheduledTime })) {
            return;
        }

        const override = item.notificationOverrides?.dose_reminder;
        const defaults = user.notificationDefaults?.dose_reminder;
        
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
        
        console.log(`[Jobs] [Reminder] Sent: ${item.name} for scheduled ${scheduledTime} (lead: ${leadTime}m)`);
    } catch (error) {
        console.error(`[Jobs] [Reminder] Execution failed for ${item.name}:`, error);
    }
}

/**
 * Job 2: Dose Reminders Dispatcher (Every 5 minutes)
 * 
 * High-Precision Strategy:
 * 1. Pulls all reminders due in the upcoming 5-minute window.
 * 2. Pulls all reminders due in the past 6 minutes (catch-up for restarts).
 * 3. Immediately executes "due now/past" reminders.
 * 4. Schedules "upcoming" reminders using node-cron/setTimeout for exact-minute precision.
 */
export const initReminderJob = () => {
	cron.schedule('*/5 * * * *', async () => {
		const now = new Date();
        const lookaheadWindowMs = 5 * 60 * 1000 + 10000; // 5m 10s look-ahead
        const lookbackWindowMs = 6 * 60 * 1000;        // 6m look-back for catch-up
        
		const futureBound = new Date(now.getTime() + lookaheadWindowMs);
        const pastBound = new Date(now.getTime() - lookbackWindowMs);
		
		console.log(`[Jobs] [Reminder] Dispatching for window: ${pastBound.toISOString()} -> ${futureBound.toISOString()}`);
		
		try {
			const items = await CabinetItem.find({
				'reminderTimes.0': { $exists: true }
			});

			for (const item of items) {
				const user = await User.findById(item.userId);
				if (!user) continue;

				const override = item.notificationOverrides?.dose_reminder;
				const defaults = user.notificationDefaults?.dose_reminder;
				const leadTime = override?.leadTimeMinutes !== undefined ? override.leadTimeMinutes : (defaults?.leadTimeMinutes ?? 0);

				// Filter reminders matching current Dispatch window + Frequency Rules
				const windowReminders = item.reminderTimes?.filter(r => {
					const rDate = new Date(r.time);
					const triggerDate = new Date(rDate.getTime() - leadTime * 60 * 1000);
					
					// 1. Check Window
					const IsInWindow = triggerDate >= pastBound && triggerDate <= futureBound;
					if (!IsInWindow) return false;

					// 2. Check Frequency Rules (Daily, Weekly, Interval)
					return isOccurrenceOnDay(r, now);
				}) || [];

				for (const reminder of windowReminders) {
                    const rDate = new Date(reminder.time);
					const triggerTime = new Date(rDate.getTime() - leadTime * 60 * 1000).getTime();
                    const delay = triggerTime - now.getTime();

                    if (delay <= 0) {
                        // Due now or missed: Execute immediately
                        await executeReminder(item, user, reminder, leadTime);
                    } else {
                        // Future in this window: Schedule for exact precision
                        console.log(`[Jobs] [Reminder] Scheduling ${item.name} for ${new Date(triggerTime).toISOString()} (in ${Math.round(delay/1000)}s)`);
                        setTimeout(() => executeReminder(item, user, reminder, leadTime), delay);
                    }
				}
			}
		} catch (error) {
			console.error('[Jobs Error] Dose reminder dispatcher failed:', error);
		}
	});
};
