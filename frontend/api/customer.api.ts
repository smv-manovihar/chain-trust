import client from './client';

export interface CabinetItem {
  _id: string;
  name: string;
  brand: string;
  productId: string;
  batchNumber: string;
  medicineCode?: string;
  composition?: string;
  expiryDate?: string;
  images?: string[];
  salt?: string;
  isUserAdded: boolean;
  addedAt?: string;
  createdAt?: string;
  // Dosage & Management
  dosage?: string;
  frequency?: string;
  currentQuantity?: number;
  totalQuantity?: number;
  unit?: string;
  notes?: string;
  reminderTimes?: string[];
  prescriptions?: {
    url: string;
    label: string;
    uploadedAt: string;
  }[];
}

export const addToCabinet = async (data: Partial<CabinetItem>, signal?: AbortSignal) => {
  const response = await client.post('/users/cabinet/add', data, { signal });
  return response.data;
};

export const getCabinet = async (search?: string, signal?: AbortSignal) => {
  const response = await client.get('/users/cabinet/list', { 
    params: { search },
    signal 
  });
  // Handle both { cabinet: [] } and directly returning []
  return (response.data.cabinet || response.data) as CabinetItem[];
};

export const getCabinetItem = async (id: string, signal?: AbortSignal) => {
  const response = await client.get(`/users/cabinet/${id}`, { signal });
  return response.data.item as CabinetItem;
};

export const updateCabinetItem = async (id: string, data: Partial<CabinetItem>, signal?: AbortSignal) => {
  const response = await client.put(`/users/cabinet/${id}`, data, { signal });
  return response.data.item as CabinetItem;
};

export const removeFromCabinet = async (id: string, signal?: AbortSignal) => {
  const response = await client.delete(`/users/cabinet/${id}`, { signal });
  return response.data;
};

export const getDashboardStats = async (signal?: AbortSignal) => {
  const response = await client.get('/users/cabinet/stats', { signal });
  return response.data;
};

export const getRecentScans = async (signal?: AbortSignal) => {
  const response = await client.get('/users/scans/recent', { signal });
  return response.data.scans;
};

export const markDoseTaken = async (id: string, signal?: AbortSignal) => {
  const response = await client.post(`/users/cabinet/${id}/take-dose`, null, { signal });
  return response.data;
};
