import Notification from '../models/notification.model.js';

/**
 * Helper to check if a notification of a specific type has already been sent
 * for a specific cabinet item within a certain window.
 */
export async function wasRecentlyNotified(
    userId: any, 
    cabinetItemId: any, 
    type: string, 
    hours = 23, 
    extraFilter: any = {}
) {
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
