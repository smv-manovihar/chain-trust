import client from './client';

export interface Notification {
	_id: string;
	user: string;
	type: 'medicine_expiry' | 'batch_recall' | 'dose_reminder' | 'suspicious_scan' | 'scan_milestone' | 'system';
	title: string;
	message: string;
	isRead: boolean;
	link?: string;
	metadata?: {
		batchId?: string;
		productId?: string;
		alertId?: string;
	};
	createdAt: string;
	updatedAt: string;
}

export const getNotifications = async (limit = 20, skip = 0, type?: string, signal?: AbortSignal) => {
	const response = await client.get('/notifications', {
		params: { limit, skip, type },
		signal
	});
	return response.data;
};

export const markAsRead = async (id: string, signal?: AbortSignal) => {
	const response = await client.put(`/notifications/${id}/read`, null, { signal });
	return response.data;
};

export const markAllAsRead = async (signal?: AbortSignal) => {
	const response = await client.put('/notifications/read-all', null, { signal });
	return response.data;
};

export const getNotificationPreferences = async (signal?: AbortSignal) => {
	const response = await client.get('/notifications/preferences', { signal });
	return response.data.preferences;
};

export const updateNotificationPreferences = async (data: any, signal?: AbortSignal) => {
	const response = await client.put('/notifications/preferences', data, { signal });
	return response.data;
};
