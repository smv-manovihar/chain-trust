import client from './client';

export interface ProductDto {
	name: string;
	productId: string;
	category: string;
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

export const createProduct = async (data: ProductDto) => {
	const response = await client.post('/products', data);
	return response.data;
};

export const listProducts = async () => {
	const response = await client.get('/products');
	return response.data;
};

export const getProduct = async (id: string) => {
	const response = await client.get(`/products/${id}`);
	return response.data;
};

export const updateProduct = async (id: string, data: Partial<ProductDto>) => {
	const response = await client.put(`/products/${id}`, data);
	return response.data;
};

export const deleteProduct = async (id: string) => {
	const response = await client.delete(`/products/${id}`);
	return response.data;
};
