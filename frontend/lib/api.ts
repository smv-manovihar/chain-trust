import client from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'manufacturer' | 'employee';
  hasPassword: boolean;
  isEmailVerified: boolean;
  avatar: string | null;
  phone_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  company_name?: string;
  website?: string;
  companyId?: string;
  companyPolicies?: Record<string, any>;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
  sessionExpiresAt: string;
  redirectUrl?: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/login', { email, password });
  return response.data;
}

export async function register(userData: {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'manufacturer';
  phone_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  company_name?: string;
  website?: string;
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
  phone_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/setup-account', data);
  return response.data;
}

export async function updateRole(role: 'customer' | 'manufacturer'): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/update-role', { role });
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

// Email verification types
export interface EmailVerificationOTP {
  email: string;
  otp: string;
}

export interface EmailVerificationStatus {
  isEmailVerified: boolean;
  hasOtp: boolean;
  hasToken: boolean;
  otpExpiresAt: string | null;
  tokenExpiresAt: string | null;
}

export interface ResendVerificationData {
  email: string;
  method: 'otp' | 'link' | 'both';
}

export interface EmailVerificationResponse {
  emailSent: boolean;
  method?: string;
  message?: string;
  user?: User;
}

export async function verifyEmailWithOTP(data: EmailVerificationOTP): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>('/auth/verify-email/otp', data);
  return response.data;
}

export async function resendVerificationEmail(data: ResendVerificationData): Promise<EmailVerificationResponse> {
  const response = await client.post<EmailVerificationResponse>('/auth/resend-verification', data);
  return response.data;
}
