import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 5000;

export const JWT_SECRET = process.env.JWT_SECRET || 'chain_trust_secret';

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
export const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@chaintrust.com';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Email verification settings
export const OTP_EXPIRY_MINUTES = 10;
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
export const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

// S3 Configuration (Compatible with MinIO for dev)
export const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
export const S3_REGION = process.env.S3_REGION || 'us-east-1'; // Default mostly needed for AWS SDK
export const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'minioadmin';
export const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'minioadmin';
export const S3_BUCKET = process.env.S3_BUCKET || 'chaintrust';
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || `${S3_ENDPOINT}/${S3_BUCKET}`;

