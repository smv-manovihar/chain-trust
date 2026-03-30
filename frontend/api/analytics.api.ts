import client from './client';

export interface TimelineParams {
	from?: string;
	to?: string;
	groupBy?: 'total' | 'product' | 'batch';
	batchNumber?: string;
	productId?: string;
}

export interface GeographicParams {
	from?: string;
	to?: string;
	batchNumber?: string;
	productId?: string;
}

export interface ScanDetailParams {
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
	batchNumber?: string;
	productId?: string;
	country?: string;
	suspiciousOnly?: boolean;
}

export const getTimelineAnalytics = async (params: TimelineParams, signal?: AbortSignal) => {
	const response = await client.get('/analytics/timeline', { params, signal });
	return response.data;
};

export const getGeographicAnalytics = async (params: GeographicParams, signal?: AbortSignal) => {
	const response = await client.get('/analytics/geographic', { params, signal });
	return response.data;
};

export const getScanDetails = async (params: ScanDetailParams, signal?: AbortSignal) => {
	const response = await client.get('/analytics/details', { params, signal });
	return response.data;
};

export const getThreatAnalytics = async (signal?: AbortSignal) => {
	const response = await client.get('/analytics/threats', { signal });
	return response.data;
};
