import client from './client';
import { AuthResponse, InviteEmployeeData } from './types';

export async function inviteEmployee(data: InviteEmployeeData): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/company/invite', data);
  return response.data;
}
