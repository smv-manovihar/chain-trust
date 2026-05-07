import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import * as emailUtils from '../utils/email.utils.js';

export interface NotificationPayload {
	user: string; // User ID
	type: 
		| 'medicine_expiry'
		| 'batch_recall'
		| 'dose_reminder'
		| 'low_stock'
		| 'suspicious_scan'
		| 'scan_milestone'
		| 'batch_restored'
		| 'system';
	title: string;
	message: string;
	link: string;
	metadata?: any;
	throttle?: {
		window: 'daily' | 'hourly' | number; // Window size in hours or 'daily'
		key?: string; // Optional metadata key to unique-ify the throttle (e.g., 'cabinetItemId')
	};
}

/**
 * Centralized service to handle multi-channel notifications.
 * It handles persistence to MongoDB and automated email triggering
 * based on the user's notification preferences.
 */
export const sendNotification = async (payload: NotificationPayload): Promise<any> => {
	try {
		// 1. Fetch the user to check notification preferences
		const user = await User.findById(payload.user);
		if (!user) {
			console.warn(`[Notification Service] Skipping - User ${payload.user} not found.`);
			return null;
		}

		// 2. Handle Throttling
		if (payload.throttle) {
			const { window, key } = payload.throttle;
			let startTime = new Date();
			
			if (window === 'daily') {
				startTime.setHours(0, 0, 0, 0);
			} else if (window === 'hourly') {
				startTime.setHours(startTime.getHours() - 1);
			} else if (typeof window === 'number') {
				startTime.setHours(startTime.getHours() - window);
			}

			const query: any = {
				user: payload.user,
				type: payload.type,
				createdAt: { $gte: startTime }
			};

			// If a specific metadata key is provided, match it exactly
			if (key && payload.metadata && payload.metadata[key]) {
				query[`metadata.${key}`] = payload.metadata[key];
			}

			const existing = await Notification.findOne(query);
			if (existing) {
				// console.log(`[Notification Service] Throttled: ${payload.type} already sent within ${window} window.`);
				return existing;
			}
		}

		// 3. Determine Channels & Preferences
		const pref = user.notificationDefaults[payload.type as keyof typeof user.notificationDefaults] as any;
		const shouldSendInApp = pref?.inApp ?? true;
		const shouldSendEmail = (pref?.email ?? false) && user.isEmailVerified;

		if (!shouldSendInApp && !shouldSendEmail) {
			return null;
		}

		// Map to Notification Model channel enum
		const channel = shouldSendInApp && shouldSendEmail ? 'both' : shouldSendInApp ? 'in_app' : 'email';

		// 4. Persist Notification (Deduplication record)
		const notification = await Notification.create({
			...payload,
			channel
		});

		console.log(`[Notification Service] Created (${channel}): ${payload.type} for ${user.email}`);

		// 5. Trigger Email if applicable
		if (shouldSendEmail) {
			dispatchEmail(user, payload);
		}

		return notification;
	} catch (error) {
		console.error('[Notification Service] Error:', error);
		throw error;
	}
};

/**
 * Bulk version of sendNotification for efficient batch processing.
 */
export const sendBulkNotifications = async (payloads: NotificationPayload[]): Promise<void> => {
	// For simplicity and to ensure individual preference checks, 
	// we process them in parallel. If performance becomes an issue, 
	// this can be optimized with bulk user fetches.
	await Promise.all(payloads.map(p => sendNotification(p).catch(err => {
		console.error(`[Notification Service] Bulk item failed for ${p.type}:`, err);
	})));
};

/**
 * Internal logic to map notification types to their corresponding email utilities.
 */
async function dispatchEmail(user: any, payload: NotificationPayload) {
	const { type, metadata, title, message } = payload;
	const email = user.email;
	const name = user.name;

	try {
		let sent = false;
		switch (type) {
			case 'medicine_expiry':
				sent = await emailUtils.sendExpiryAlert(
					email,
					metadata.medicineName || 'Unknown Medicine',
					metadata.expiryDate || 'N/A',
					metadata.daysLeft ?? 0,
					metadata.cabinetItemId
				);
				break;
			case 'batch_recall':
				sent = await emailUtils.sendBatchRecallAlert(
					email,
					name,
					metadata.medicineName || 'Unknown Medicine',
					metadata.batchNumber || 'Unknown',
					metadata.cabinetItemId
				);
				break;
			case 'batch_restored':
				sent = await emailUtils.sendBatchRestoredAlert(
					email,
					name,
					metadata.medicineName || 'Unknown Medicine',
					metadata.batchNumber || 'Unknown',
					metadata.cabinetItemId
				);
				break;
			case 'dose_reminder':
				sent = await emailUtils.sendDoseReminder(
					email,
					metadata.medicineName || 'Unknown Medicine',
					metadata.dosage,
					metadata.mealContext,
					metadata.unit,
					metadata.cabinetItemId
				);
				break;
			case 'low_stock':
				sent = await emailUtils.sendLowStockAlert(
					email,
					name,
					metadata.medicineName || 'Unknown Medicine',
					metadata.currentQuantity || 0,
					metadata.cabinetItemId
				);
				break;
			case 'suspicious_scan':
				sent = await emailUtils.sendSuspiciousScanAlert(
					email,
					name,
					metadata.medicineName || metadata.productName || 'Product',
					metadata.batchNumber || 'Unknown',
					metadata.reason || 'Flagged activity',
					metadata.batchId
				);
				break;
			case 'scan_milestone':
				sent = await emailUtils.sendScanMilestoneAlert(
					email,
					name,
					metadata.batchNumber || 'Unknown',
					metadata.scanCount || 0,
					metadata.batchId
				);
				break;
			case 'system':
				sent = await emailUtils.sendSystemNotification(
					email,
					name,
					title,
					message
				);
				break;
		}

		if (sent) {
			console.log(`[Notification Service] Email sent: ${type} to ${email}`);
		}
	} catch (err) {
		console.error(`[Notification Service] Email dispatch failed for ${type}:`, err);
	}
}
