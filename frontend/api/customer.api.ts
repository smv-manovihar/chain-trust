import client from './client';

export interface CabinetItem {
  _id: string;
  name: string;
  brand: string;
  productId: string;
  batchNumber: string;
  expiryDate?: string;
  images?: string[];
  salt?: string;
  isUserAdded: boolean;
  addedAt?: string;
  createdAt?: string;
}

export const addToCabinet = async (data: Partial<CabinetItem>) => {
  const response = await client.post('/users/cabinet/add', data);
  return response.data;
};

export const getCabinet = async () => {
  const response = await client.get('/users/cabinet/list');
  // Handle both { cabinet: [] } and directly returning []
  return (response.data.cabinet || response.data) as CabinetItem[];
};

export const removeFromCabinet = async (id: string) => {
  const response = await client.delete(`/users/cabinet/${id}`);
  return response.data;
};
