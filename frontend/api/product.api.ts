import client from './client';

export interface ProductDto {
	name: string;
	productId: string;
	categories: string[];
	brand: string;
	price?: number;
	description?: string;
	composition?: string;
	images?: string[];
	imageAccessLevel?: 'public' | 'verified_only' | 'internal_only';
	customerVisibleImages?: number[];
	qrSettings?: {
		qrSize: number;
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

export const getProduct = async (productId: string, signal?: AbortSignal) => {
	const response = await client.get(`/products/${productId}`, { signal });
	return response.data;
};

export const updateProduct = async (productId: string, data: Partial<ProductDto>, signal?: AbortSignal) => {
	const response = await client.put(`/products/${productId}`, data, { signal });
	return response.data;
};

export const deleteProduct = async (productId: string, signal?: AbortSignal) => {
	const response = await client.delete(`/products/${productId}`, { signal });
	return response.data;
};
