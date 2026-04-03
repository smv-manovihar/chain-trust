import cron from 'node-cron';
import Batch from '../models/batch.model.js';
import Product from '../models/product.model.js';
import { getOnChainBatch } from './blockchain.service.js';
import { deleteFile } from './s3.service.js';

/**
 * Reconciliation Service
 * 
 * Handles distributed atomicity failures by syncing "pending" states 
 * with the blockchain and cleaning up orphaned storage assets.
 */

/**
 * Periodically checks for "pending" batches that might have succeeded on-chain
 * but failed to update the backend status (e.g. browser close, network drop).
 */
export const reconcilePendingBatches = async () => {
	try {
		console.log('[Reconciliation] Starting Pending Batch Sweep...');
		
		// Find batches stuck in 'pending' status for more than 1 hour
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		const pendingBatches = await Batch.find({
			status: 'pending',
			createdAt: { $lt: oneHourAgo }
		});

		console.log(`[Reconciliation] Found ${pendingBatches.length} pending batches to verify.`);

		for (const batch of pendingBatches) {
			const onChain = await getOnChainBatch(batch.batchSalt);
			
			if (onChain && onChain.exists) {
				console.log(`[Reconciliation] Found batch ${batch.batchNumber} on-chain. Finalizing...`);
				batch.status = 'completed';
				batch.isOnBlockchain = true;
				// blockchainHash might still be missing if we didn't capture it from the event,
				// but the batch is now officially active in our system.
				await batch.save();
			} else {
				// If it's been pending for more than 24 hours and still not on-chain, mark as failed
				const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
				if (batch.createdAt < oneDayAgo) {
					console.warn(`[Reconciliation] Batch ${batch.batchNumber} stale for >24h. Marking as failed.`);
					batch.status = 'failed';
					await batch.save();
				}
			}
		}
	} catch (error) {
		console.error('[Reconciliation] Batch sweep failed:', error);
	}
};

/**
 * Cleans up "pending" products that were never finalized.
 * Since products don't have an on-chain component, we purge stale pending 
 * records and their associated S3 images to prevent storage leaks.
 */
export const reconcilePendingProducts = async () => {
	try {
		console.log('[Reconciliation] Starting Pending Product Cleanup...');
		
		// Find products stuck in 'pending' status for more than 4 hours
		const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
		const staleProducts = await Product.find({
			status: 'pending',
			createdAt: { $lt: fourHoursAgo }
		});

		console.log(`[Reconciliation] Found ${staleProducts.length} stale pending products.`);

		for (const product of staleProducts) {
			// [FIX-004] NON-DESTRUCTIVE: We no longer purge stale products.
			// They are treated as persistent drafts. We only log their presence.
			console.log(`[Reconciliation] Identified stale draft: ${product.name} (${product.id})`);
		}
	} catch (error) {
		console.error('[Reconciliation] Product audit failed:', error);
	}
};

/**
 * Initialize the Reconciliation Service Cron Jobs
 */
export const initReconciliation = () => {
	// Run Batch Sweep every hour at minute 0
	// Run Batch Sweep every 15 minutes (Reliability FIX-001)
	cron.schedule('*/15 * * * *', () => {
		reconcilePendingBatches();
	});

	// Run Product Cleanup every 6 hours
	cron.schedule('0 */6 * * *', () => {
		reconcilePendingProducts();
	});

	console.log('\x1b[35m[Reconciliation Service]\x1b[0m Cron jobs initialized (Hourly Batch Sweep / 6H Product Purge)');
};

export default {
	initReconciliation,
	reconcilePendingBatches,
	reconcilePendingProducts
};
