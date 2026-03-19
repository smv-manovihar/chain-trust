import client from './client';

export interface CabinetItem {
  _id?: string;
  name: string;
  brand: string;
  productId: string;
  batchNumber: string;
  expiryDate?: string;
  images?: string[];
  addedAt?: string;
}

export const addToCabinet = async (data: Partial<CabinetItem>) => {
  const response = await client.post('/users/cabinet/add', data);
  return response.data;
};

export const getCabinet = async () => {
  const response = await client.get('/users/cabinet');
  return response.data;
};

export const removeFromCabinet = async (id: string) => {
  const response = await client.delete(`/users/cabinet/${id}`);
  return response.data;
};
