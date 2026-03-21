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

export const createBatch = async (data: CreateBatchDto) => {
	const response = await client.post('/batches', data);
	return response.data;
};

export const listBatches = async () => {
	const response = await client.get('/batches');
	return response.data;
};

export const getBatch = async (id: string) => {
	const response = await client.get(`/batches/${id}`);
	return response.data;
};

export const getBatchQRData = async (id: string, page = 1, limit = 50) => {
	const response = await client.get(`/batches/${id}/qr-data`, {
		params: { page, limit }
	});
	return response.data;
};

export const verifyScan = async (salt: string, visitorId: string, lat?: number, lng?: number) => {
	const response = await client.post('/batches/verify-scan', { salt, visitorId, lat, lng });
	return response.data;
};

export const recallBatch = async (id: string) => {
	const response = await client.post(`/batches/${id}/recall`);
	return response.data;
};

export const downloadBatchPDF = async (id: string) => {
	const response = await client.get(`/batches/${id}/pdf`, {
		responseType: 'blob'
	});
	return response.data;
};
