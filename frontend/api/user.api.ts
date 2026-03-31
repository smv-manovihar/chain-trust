import client from "./client";

export interface UserProfileUpdate {
  name?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  avatar?: string;
}

export const updateProfile = async (data: UserProfileUpdate, signal?: AbortSignal) => {
  const response = await client.put("/users/update", data, { signal });
  return response.data;
};

export const changePassword = async (data: { currentPassword?: string; newPassword: string }, signal?: AbortSignal) => {
  const response = await client.post("/users/change-password", data, { signal });
  return response.data;
};
