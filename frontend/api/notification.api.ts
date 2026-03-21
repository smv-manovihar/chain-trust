import client from './client';

export interface Notification {
	_id: string;
	user: string;
	type: 'alert' | 'scan_milestone' | 'system' | 'expiry';
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

export const getNotifications = async (limit = 20, skip = 0) => {
	const response = await client.get('/notifications', {
		params: { limit, skip }
	});
	return response.data;
};

export const markAsRead = async (id: string) => {
	const response = await client.put(`/notifications/${id}/read`);
	return response.data;
};

export const markAllAsRead = async () => {
	const response = await client.put('/notifications/read-all');
	return response.data;
};
