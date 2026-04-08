import client from './client';

export interface CreateBatchDto {
	productRef: string; // ObjectId of the Product catalogue item
	batchNumber?: string;
	quantity?: number;
	manufactureDate?: string;
	expiryDate?: string;
	description?: string;
	batchSalt?: string;
	blockchainHash?: string;
	status?: 'pending' | 'completed' | 'failed';
	wizardState?: any; // Dynamic dict for UI state tracking (FIX-004)
}

export const createBatch = async (data: CreateBatchDto, signal?: AbortSignal) => {
	const response = await client.post('/batches', data, { signal });
	return response.data;
};

export const listBatches = async (params?: { 
	search?: string; 
	categories?: string | string[];
	page?: number;
	limit?: number;
}, signal?: AbortSignal) => {
	const response = await client.get('/batches', { params, signal });
	return response.data;
};

export const getBatch = async (batchNumber: string, signal?: AbortSignal) => {
	const response = await client.get(`/batches/${batchNumber}`, { signal });
	return response.data;
};

export const getBatchQRData = async (batchNumber: string, page = 1, limit = 50, signal?: AbortSignal) => {
	const response = await client.get(`/batches/${batchNumber}/qr-data`, {
		params: { page, limit },
		signal
	});
	return response.data;
};

export const verifyScan = async (salt: string, visitorId: string, lat?: number, lng?: number, signal?: AbortSignal) => {
	const response = await client.post('/batches/verify-scan', { salt, visitorId, lat, lng }, { signal });
	return response.data;
};

export const recallBatch = async (batchNumber: string, transactionHash?: string, signal?: AbortSignal) => {
	const response = await client.post(`/batches/${batchNumber}/recall`, { transactionHash }, { signal });
	return response.data;
};

export const restoreBatch = async (batchNumber: string, transactionHash?: string, signal?: AbortSignal) => {
	const response = await client.post(`/batches/${batchNumber}/restore`, { transactionHash }, { signal });
	return response.data;
};

export const downloadBatchPDF = async (batchNumber: string, signal?: AbortSignal) => {
	const response = await client.get(`/batches/${batchNumber}/pdf`, {
		responseType: 'blob',
		signal
	});
	return response.data;
};

export const getBatchScanDetails = async (batchNumber: string, signal?: AbortSignal) => {
	const response = await client.get('/analytics/details', {
		params: { batchNumber, limit: 100 },
		signal
	});
	return response.data;
};

export const updateBatch = async (id: string, data: Partial<CreateBatchDto>, signal?: AbortSignal) => {
	const response = await client.put(`/batches/${id}`, data, { signal });
	return response.data;
};
