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
  doctorName?: string;
  notes?: string;
  reminderTimes?: string[];
  prescriptionIds?: string[];
  prescriptions?: {
    url: string;
    label: string;
    uploadedAt: string;
  }[];
  status?: "active" | "inactive";
}

export const addToCabinet = async (data: Partial<CabinetItem>, signal?: AbortSignal) => {
  const response = await client.post('/cabinet/add', data, { signal });
  return response.data;
};

export const getCabinet = async (search?: string, status?: string, signal?: AbortSignal) => {
  const response = await client.get('/cabinet/list', { 
    params: { search, status },
    signal 
  });
  // Handle both { cabinet: [] } and directly returning []
  return (response.data.cabinet || response.data) as CabinetItem[];
};

export const getCabinetItem = async (id: string, signal?: AbortSignal) => {
  const response = await client.get(`/cabinet/${id}`, { signal });
  return response.data.item as CabinetItem;
};

export const updateCabinetItem = async (id: string, data: Partial<CabinetItem>, signal?: AbortSignal) => {
  const response = await client.put(`/cabinet/${id}`, data, { signal });
  return response.data.item as CabinetItem;
};

export const removeFromCabinet = async (id: string, signal?: AbortSignal) => {
  const response = await client.delete(`/cabinet/${id}`, { signal });
  return response.data;
};

export const getDashboardStats = async (signal?: AbortSignal) => {
  const response = await client.get('/cabinet/stats', { signal });
  return response.data;
};

export const getRecentScans = async (signal?: AbortSignal) => {
  const response = await client.get('/cabinet/recent-scans', { signal });
  return response.data.scans;
};

export const markDoseTaken = async (id: string, signal?: AbortSignal) => {
  const response = await client.post(`/cabinet/mark-taken/${id}`, {}, { signal });
  return response.data;
};

// Prescription Pool
export const getPrescriptions = async (skip: number = 0, limit: number = 10, signal?: AbortSignal) => {
  const response = await client.get('/cabinet/prescriptions/list', { 
    params: { skip, limit },
    signal 
  });
  return response.data;
};

export const uploadPrescription = async (data: any, signal?: AbortSignal) => {
  const response = await client.post('/cabinet/prescriptions/upload', data, { signal });
  return response.data.prescription;
};

export const deletePrescription = async (id: string, signal?: AbortSignal) => {
  const response = await client.delete(`/cabinet/prescriptions/${id}`, { signal });
  return response.data;
};
