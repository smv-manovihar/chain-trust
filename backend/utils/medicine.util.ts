
/**
 * Determines if a medicine reminder occurrence should happen on a specific date
 * based on its frequency configuration.
 * 
 * @param reminder The reminder object with frequency settings
 * @param date The date to check
 * @returns boolean
 */
export const isOccurrenceOnDay = (reminder: any, date: Date): boolean => {
	const freq = reminder.frequencyType || 'daily';
	if (freq === 'daily') return true;
	
	// Normalize date and anchor to UTC start of day for accurate interval calculations
	const target = new Date(date);
	target.setUTCHours(0, 0, 0, 0);

	const anchor = new Date(reminder.time);
	anchor.setUTCHours(0, 0, 0, 0);

	// Don't trigger if the target date is before the anchor date
	if (target.getTime() < anchor.getTime()) return false;

	if (freq === 'weekly') {
		return reminder.daysOfWeek?.includes(target.getUTCDay());
	}

	if (freq === 'interval_days') {
		const diffMs = target.getTime() - anchor.getTime();
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		return diffDays % (reminder.interval || 1) === 0;
	}

	if (freq === 'interval_months') {
		// Match the day of the month (e.g., if set to 15th, always triggers on 15th)
		if (target.getUTCDate() !== anchor.getUTCDate()) return false;
		
		const monthDiff = (target.getUTCFullYear() * 12 + target.getUTCMonth()) - 
						  (anchor.getUTCFullYear() * 12 + anchor.getUTCMonth());
		return monthDiff % (reminder.interval || 1) === 0;
	}

	return false;
};
