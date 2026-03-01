export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'manufacturer' | 'employee';
  hasPassword: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  avatar: string | null;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  companyId?: string;
  companyPolicies?: Record<string, any>;
}

export interface InviteEmployeeData {
  email: string;
  name?: string;
  role?: string;
  password?: string;
  autoGenerate?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
  sessionExpiresAt: string;
  redirectUrl?: string;
  credentials?: {
      email: string;
      password?: string;
      loginUrl: string;
  };
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
