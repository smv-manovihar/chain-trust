import api from "./client";

export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const createCategory = async (data: { name: string; description?: string }): Promise<Category> => {
  const response = await api.post("/categories", data);
  return response.data;
};

export const fetchCategories = async (): Promise<{ categories: Category[] }> => {
  const response = await api.get("/categories");
  return response.data;
};

export const updateCategory = async (id: string, data: { name?: string; description?: string }): Promise<Category> => {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
