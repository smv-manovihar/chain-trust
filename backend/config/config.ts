import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 5000;

export const JWT_SECRET = process.env.JWT_SECRET || 'pharma_secure_secret';

export const JWT_REFRESH_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const JWT_ACCESS_EXPIRATION = '15m';
export const SLIDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const EXTEND_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day
export const INACTIVITY_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Email configuration
export const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
export const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 587;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;
export const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@pharmasecure.com';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Email verification settings
export const OTP_EXPIRY_MINUTES = 10;
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
export const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
