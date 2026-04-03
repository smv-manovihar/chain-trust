import cron from 'node-cron';
import CabinetItem from '../models/cabinet.model.js';
import Notification from '../models/notification.model.js';
import Batch from '../models/batch.model.js';
import Product from '../models/product.model.js';
import { getOnChainBatch } from '../services/blockchain.service.js';
import { syncBatchWithBlockchain } from '../controllers/batch.controller.js';

/**
 * Background jobs to maintain system state and user communications 
 * without impacting request latency.
 */

/**
 * [JOB-001] Medication Expiry Sweep
 * Frequency: Once a day (Daily)
 * Purpose: Finds items expiring in 30 days and alerts users.
 */
export const runDailyExpiriesCheck = async () => {
	console.log('[Cron] [Expiries] Starting Daily Sweep...');
	try {
		const thirtyDaysFromNow = new Date();
		thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

		const expiringSoonItems = await CabinetItem.find({
			status: 'active',
			expiryDate: { $lte: thirtyDaysFromNow },
		});

		console.log(`[Cron] [Expiries] Scanning ${expiringSoonItems.length} potential items.`);

		for (const item of expiringSoonItems) {
			const recentNotification = await Notification.findOne({
				user: item.userId,
				type: 'medicine_expiry',
				'metadata.cabinetItemId': item._id,
				createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
			});

			if (!recentNotification) {
				await Notification.create({
					user: item.userId,
					type: 'medicine_expiry',
					title: 'Medication Expiring Soon',
					message: `Your medication "${item.name}" is expiring on ${new Date(item.expiryDate as any).toLocaleDateString()}. Please check for a replacement soon.`,
					link: `/customer/cabinet/${item._id}`,
					metadata: {
						cabinetItemId: item._id,
						medicineName: item.name,
						expiryDate: item.expiryDate
					}
				});
				console.log(`[Cron] [Expiries] Alert generated for User ${item.userId}`);
			}
		}
		console.log('[Cron] [Expiries] Sweep Completed.');
	} catch (error) {
		console.error('[Cron] [Expiries] Job Failed:', error);
	}
};

/**
 * [JOB-002] Dose Reminders
 * Frequency: Every 15 minutes
 * Purpose: Reminds users to take their scheduled medications.
 */
export const runFrequentDoseReminders = async () => {
    // Note: Implementation logic will look for reminderTimes matching the current hour/minute
    console.log('[Cron] [Reminders] Skipping dose reminder check for now (Skeleton Ready).');
};

/**
 * [JOB-003] Pending Batch Reconciliation
 * Frequency: Every 30 minutes
 * Purpose: Resolves batches stuck in 'pending' for >30 mins.
 */
export const runPendingBatchesReconciliation = async () => {
    console.log('[Cron] [Reconciliation] Starting Pending Sweep...');
    try {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        // Find stuck batches
        const stuckBatches = await Batch.find({
            status: 'pending',
            createdAt: { $lte: thirtyMinsAgo }
        });

        console.log(`[Cron] [Reconciliation] Found ${stuckBatches.length} stuck batches.`);

        for (const batch of stuckBatches) {
            try {
                // Check on-chain status
                const onChain = await getOnChainBatch(batch.batchSalt);
                
                if (onChain) {
                    console.log(`[Cron] [Reconciliation] Batch ${batch.batchNumber} found on blockchain. Syncing...`);
                    batch.status = 'completed';
                    await syncBatchWithBlockchain(batch);
                } else {
                    console.log(`[Cron] [Reconciliation] Batch ${batch.batchNumber} NOT found on blockchain. Marking failed.`);
                    batch.status = 'failed';
                    await batch.save();

                    // Notify the manufacturer
                    await Notification.create({
                        user: batch.createdBy,
                        type: 'security_alert', // Or a custom 'batch_failed' type
                        title: 'Batch Enrollment Stalled',
                        message: `The enrollment for Batch "${batch.batchNumber}" did not complete. Click here to resume or retry.`,
                        link: `/manufacturer/batches/new?id=${batch._id}`,
                        metadata: {
                            batchId: batch._id,
                            batchNumber: batch.batchNumber
                        }
                    });
                }
            } catch (err) {
                console.error(`[Cron] [Reconciliation] Failed to reconcile batch ${batch._id}:`, err);
            }
        }
        console.log('[Cron] [Reconciliation] Sweep Completed.');
    } catch (error) {
        console.error('[Cron] [Reconciliation] Job Failed:', error);
    }
};

/**
 * Initializes all system-wide background jobs with independent schedules.
 */
export const initCronJobs = () => {
	console.log('[Cron] Initializing Background Services...');

	// 1. Daily Expiry Check (At midnight)
	cron.schedule('0 0 * * *', async () => {
		await runDailyExpiriesCheck();
	});

	// 2. Dose Reminders (Every 15 minutes)
    // Formula: */15 * * * *
	cron.schedule('*/15 * * * *', async () => {
		await runFrequentDoseReminders();
	});

	// 3. Pending Reconciliation (Every 30 minutes)
	cron.schedule('*/30 * * * *', async () => {
		await runPendingBatchesReconciliation();
	});

	// Run health-check/initial check on startup with 5s delay
	setTimeout(async () => {
        console.log('[Cron] Running startup health check...');
		await runDailyExpiriesCheck();
		await runPendingBatchesReconciliation();
	}, 5000);
};

export default {
    initCronJobs,
    runDailyExpiriesCheck,
    runFrequentDoseReminders
};
