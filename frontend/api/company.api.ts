import client from './client';
import { AuthResponse, InviteEmployeeData } from '../types/auth.types';

export async function inviteEmployee(data: InviteEmployeeData, signal?: AbortSignal): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/company/invite', data, { signal });
  return response.data;
}
