import client from './client';

export interface CreateBatchDto {
	productRef: string; // ObjectId of the Product catalogue item
	batchNumber: string;
	quantity: number;
	manufactureDate: string;
	expiryDate?: string;
	description?: string;
	batchSalt: string;
	blockchainHash: string;
}

export const createBatch = async (data: CreateBatchDto, signal?: AbortSignal) => {
	const response = await client.post('/batches', data, { signal });
	return response.data;
};

export const listBatches = async (params?: { search?: string; categories?: string | string[] }, signal?: AbortSignal) => {
	const response = await client.get('/batches', { params, signal });
	return response.data;
};

export const getBatch = async (id: string, signal?: AbortSignal) => {
	const response = await client.get(`/batches/${id}`, { signal });
	return response.data;
};

export const getBatchQRData = async (id: string, page = 1, limit = 50, signal?: AbortSignal) => {
	const response = await client.get(`/batches/${id}/qr-data`, {
		params: { page, limit },
		signal
	});
	return response.data;
};

export const verifyScan = async (salt: string, visitorId: string, lat?: number, lng?: number, signal?: AbortSignal) => {
	const response = await client.post('/batches/verify-scan', { salt, visitorId, lat, lng }, { signal });
	return response.data;
};

export const recallBatch = async (id: string, signal?: AbortSignal) => {
	const response = await client.post(`/batches/${id}/recall`, null, { signal });
	return response.data;
};

export const downloadBatchPDF = async (id: string, signal?: AbortSignal) => {
	const response = await client.get(`/batches/${id}/pdf`, {
		responseType: 'blob',
		signal
	});
	return response.data;
};

export const getScanHistory = async (days = 30, signal?: AbortSignal) => {
	const response = await client.get('/batches/scan-history', {
		params: { days },
		signal
	});
	return response.data;
};

export const getBatchScanDetails = async (id: string, signal?: AbortSignal) => {
	const response = await client.get(`/batches/${id}/scan-details`, { signal });
	return response.data;
};

export const getGeoDistribution = async (signal?: AbortSignal) => {
	const response = await client.get('/batches/analytics/geo', { signal });
	return response.data.distribution;
};

export const getThreatIntelligence = async (signal?: AbortSignal) => {
	const response = await client.get('/batches/analytics/threats', { signal });
	return response.data.threats;
};
