import { type Router as RouterType, Router } from 'express';
import {
	loginUser,
	registerUser,
	verifyUser,
	logoutUser,
	refreshAccessToken,
	getUserDevices,
	logoutDevice,
	logoutAllDevices,
	verifyEmailWithOTP,
	verifyEmailWithToken,
	resendVerificationEmail,
	checkEmailVerificationStatus,
	googleAuth,
	googleCallback,
	googleLoginWithToken,
	setupAccount,
	updateUserRole,
	deleteAccount,
	changeEmail,
	requestPasswordReset,
	resetPassword,
} from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { trackUserActivity } from '../middlewares/activity.middleware.js';
import { loginLimiter, emailOpsLimiter } from '../middlewares/rate-limit.middleware.js';

const router: RouterType = Router();

// Public routes
router.post('/login', loginLimiter, loginUser);
router.post('/register', registerUser);
router.post('/setup-account', setupAccount);
router.post('/refresh', refreshAccessToken);

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google-login', googleLoginWithToken);

// Email verification routes (public)
router.post('/verify-email/otp', emailOpsLimiter, verifyEmailWithOTP);
router.get('/verify-email/:token', verifyEmailWithToken);
router.post('/resend-verification', emailOpsLimiter, resendVerificationEmail);
router.get('/verification-status/:email', checkEmailVerificationStatus);

// Password reset routes (public)
router.post('/forgot-password', emailOpsLimiter, requestPasswordReset);
router.post('/reset-password', emailOpsLimiter, resetPassword);

// Protected routes (require authentication)
router.use(authenticateJWT);
router.use(trackUserActivity);

router.get('/verify', verifyUser);
router.get('/me', verifyUser);
router.post('/logout', logoutUser);
router.post('/change-email', changeEmail);

// Device management
router.get('/devices', getUserDevices);
router.delete('/devices/:deviceId', logoutDevice);
router.delete('/devices', logoutAllDevices);

router.post('/update-role', updateUserRole);
router.delete('/me', deleteAccount);

export default router;
