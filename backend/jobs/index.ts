import { initExpiryJob } from './expiry.job.js';
import { initReminderJob, initMissedDoseJob } from './reminder.job.js';
import { initReconciliationJob } from './reconciliation.job.js';

/**
 * Initializes all system-wide background jobs.
 */
export const initAllJobs = () => {
    console.log('[Jobs] Initializing all background tasks...');
    
    initExpiryJob();
    initReminderJob();
    initMissedDoseJob();
    initReconciliationJob();
    
    console.log('[Jobs] All background tasks registered.');
};
