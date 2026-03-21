import client from './client';
import { 
  AuthResponse, 
  User, 
  EmailVerificationOTP, 
  ResendVerificationData, 
  EmailVerificationResponse 
} from '../types/auth.types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/login', { email, password });
  return response.data;
}

export async function register(userData: {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'manufacturer';
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  industry_registration?: string;
}): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/register', userData);
  return response.data;
}

export async function googleLogin(token: string): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/google-login', { token });
  return response.data;
}

export async function setupAccount(data: {
  userId: string;
  companyId: string;
  otp: string;
  password: string;
  name?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/setup-account', data);
  return response.data;
}

export async function updateRole(role: 'customer' | 'manufacturer'): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/update-role', { role });
  return response.data;
}

export async function updateProfile(data: Partial<User>): Promise<AuthResponse> {
  const response = await client.put<AuthResponse>('/users/update', data);
  return response.data;
}

export async function changePassword(data: { currentPassword?: string; newPassword: string }): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/users/change-password', data);
  return response.data;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await client.get<{ user: User }>('/auth/me');
    return response.data.user;
  } catch (error) {
    try {
        await client.post('/auth/refresh');
        const retryRes = await client.get<{ user: User }>('/auth/me');
        return retryRes.data.user;
    } catch {
        return null;
    }
  }
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout');
}

export async function deleteAccount(): Promise<void> {
  await client.delete('/auth/me');
}

export async function verifyEmailWithOTP(data: EmailVerificationOTP): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/verify-email/otp', data);
  return response.data;
}

export async function resendVerificationEmail(data: ResendVerificationData): Promise<EmailVerificationResponse> {
  const response = await client.post<EmailVerificationResponse>('/auth/resend-verification', data);
  return response.data;
}
