import api from "./client";

export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const createCategory = async (data: { name: string; description?: string }, signal?: AbortSignal): Promise<Category> => {
  const response = await api.post("/categories", data, { signal });
  return response.data;
};

export const fetchCategories = async (signal?: AbortSignal): Promise<{ categories: Category[] }> => {
  const response = await api.get("/categories", { signal });
  return response.data;
};

export const updateCategory = async (id: string, data: { name?: string; description?: string }, signal?: AbortSignal): Promise<Category> => {
  const response = await api.put(`/categories/${id}`, data, { signal });
  return response.data;
};

export const deleteCategory = async (id: string, signal?: AbortSignal): Promise<void> => {
  await api.delete(`/categories/${id}`, { signal });
};
