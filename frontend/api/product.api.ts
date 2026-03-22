import client from './client';

export interface ProductDto {
	name: string;
	productId: string;
	categories: string[];
	brand: string;
	price?: number;
	description?: string;
	images?: string[];
	qrSettings?: {
		qrSize: number;
		columns: number;
		showProductName: boolean;
		showUnitIndex: boolean;
		showBatchNumber: boolean;
		labelPadding: number;
	};
}

export const createProduct = async (data: ProductDto, signal?: AbortSignal) => {
	const response = await client.post('/products', data, { signal });
	return response.data;
};

export const listProducts = async (params?: { search?: string; categories?: string | string[] }, signal?: AbortSignal) => {
	const response = await client.get('/products', { params, signal });
	return response.data;
};

export const getProduct = async (id: string, signal?: AbortSignal) => {
	const response = await client.get(`/products/${id}`, { signal });
	return response.data;
};

export const updateProduct = async (id: string, data: Partial<ProductDto>, signal?: AbortSignal) => {
	const response = await client.put(`/products/${id}`, data, { signal });
	return response.data;
};

export const deleteProduct = async (id: string, signal?: AbortSignal) => {
	const response = await client.delete(`/products/${id}`, { signal });
	return response.data;
};
