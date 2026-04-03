import { rateLimit } from 'express-rate-limit';

/**
 * Stricter limiter for authentication attempts (Login)
 * Prevents brute-force attacks on user accounts.
 */
export const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // 10 attempts per 15 minutes
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
});

/**
 * Limiter for public verification scans
 * Prevents automated scraping of batch/unit data.
 */
export const verificationLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 60, // 60 scans per hour
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: 'Too many verification attempts. Please try again after an hour.' },
});

/**
 * Limiter for email-related operations (verification, OTP resend)
 */
export const emailOpsLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	max: 5, // 5 attempts per 10 minutes
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: 'Too many email requests. Please wait before trying again.' },
});
