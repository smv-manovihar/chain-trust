import cron from 'node-cron';
import { 
    reconcilePendingBatches, 
    reconcilePendingProducts 
} from '../services/reconciliation.service.js';

/**
 * Job 3: Reconciliation Jobs
 * Handles distributed state cleanup for batches and products.
 */
export const initReconciliationJob = () => {
	// 1. Batch Sweep: Sync "pending" batches with blockchain every 15 minutes
	cron.schedule('*/15 * * * *', async () => {
		await reconcilePendingBatches();
	});

	// 2. Product Cleanup: Audit stale pending products every 6 hours
	cron.schedule('0 */6 * * *', async () => {
		await reconcilePendingProducts();
	});

	console.log('\x1b[35m[Jobs]\x1b[0m Reconciliation schedules initialized (15m Batch / 6h Product)');
};
