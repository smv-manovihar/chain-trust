import client from './client';
import { 
  AuthResponse, 
  User, 
  EmailVerificationOTP, 
  ResendVerificationData, 
  EmailVerificationResponse 
} from '../types/auth.types';

export async function login(email: string, password: string, signal?: AbortSignal): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/login', { email, password }, { signal });
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
}, signal?: AbortSignal): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/register', userData, { signal });
  return response.data;
}

export async function googleLogin(token: string, signal?: AbortSignal): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/google-login', { token }, { signal });
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
}, signal?: AbortSignal): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/setup-account', data, { signal });
  return response.data;
}

export async function updateRole(role: 'customer' | 'manufacturer', signal?: AbortSignal): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/update-role', { role }, { signal });
  return response.data;
}

export async function getCurrentUser(signal?: AbortSignal): Promise<{ user: User; accessToken?: string } | null> {
  try {
    const response = await client.get<{ user: User; accessToken?: string }>('/auth/me', { signal });
    return response.data;
  } catch (error) {
    return null;
  }
}

export async function logout(signal?: AbortSignal): Promise<void> {
  await client.post('/auth/logout', null, { signal });
}

export async function deleteAccount(signal?: AbortSignal): Promise<void> {
  await client.delete('/auth/me', { signal });
}

export async function verifyEmailWithOTP(data: EmailVerificationOTP, signal?: AbortSignal): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/verify-email/otp', data, { signal });
  return response.data;
}

export async function resendVerificationEmail(data: ResendVerificationData, signal?: AbortSignal): Promise<EmailVerificationResponse> {
  const response = await client.post<EmailVerificationResponse>('/auth/resend-verification', data, { signal });
  return response.data;
}
