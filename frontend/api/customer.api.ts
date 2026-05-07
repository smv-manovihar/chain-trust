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
  dosage?: number;
  frequency?: string;
  currentQuantity?: number;
  totalQuantity?: number;
  unit?: string;
  doctorName?: string;
  notes?: string;
  reminderTimes?: {
    time: string;
    mealContext?: 'before_meal' | 'after_meal' | 'with_meal' | 'no_preference';
    frequencyType?: 'daily' | 'weekly' | 'interval_days' | 'interval_months';
    daysOfWeek?: number[];
    interval?: number;
  }[];
  prescriptionIds?: string[];
  prescriptions?: {
    url: string;
    label: string;
    uploadedAt: string;
  }[];
  lastDoseTaken?: string;
  notificationOverrides?: {
    medicine_expiry?: { inApp?: boolean; email?: boolean };
    batch_recall?: { inApp?: boolean; email?: boolean };
    dose_reminder?: { inApp?: boolean; email?: boolean };
    missed_dose?: { inApp?: boolean; email?: boolean };
  };
  status?: "active" | "inactive";
  currentStreak?: number;
  /** True when all reminder-scheduled doses for today have been logged. Prevents accidental over-logging. */
  isDoseDoneToday?: boolean;
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

export const getUpcomingDoses = async (signal?: AbortSignal) => {
  const response = await client.get('/cabinet/upcoming', { signal });
  return response.data.upcoming;
};

export const getRecentScans = async (signal?: AbortSignal) => {
  const response = await client.get('/cabinet/recent-scans', { signal });
  return response.data.scans;
};

export const markDoseTaken = async (id: string, signal?: AbortSignal) => {
  const response = await client.post(`/cabinet/mark-taken/${id}`, {}, { signal });
  return response.data;
};

export const undoDose = async (id: string, signal?: AbortSignal) => {
  const response = await client.post(`/cabinet/undo-dose/${id}`, {}, { signal });
  return response.data;
};

export const getDosageLogs = async (id: string, signal?: AbortSignal) => {
  const response = await client.get(`/cabinet/logs/${id}`, { signal });
  return response.data;
};

// Prescription Pool
export const getPrescriptions = async (skip: number = 0, limit: number = 10, search?: string, signal?: AbortSignal) => {
  const response = await client.get('/cabinet/prescriptions/list', { 
    params: { skip, limit, search },
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
