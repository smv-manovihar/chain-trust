import client from './client';

export const uploadImages = async (files: File[]): Promise<string[]> => {
  if (files.length === 0) return [];

  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const response = await client.post('/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.urls || [];
};
