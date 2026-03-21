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
} from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { trackUserActivity } from '../middlewares/activity.middleware.js';

const router: RouterType = Router();

// Public routes
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/setup-account', setupAccount);
router.post('/refresh', refreshAccessToken);

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.post('/google-login', googleLoginWithToken);

// Email verification routes (public)
router.post('/verify-email/otp', verifyEmailWithOTP);
router.get('/verify-email/:token', verifyEmailWithToken);
router.post('/resend-verification', resendVerificationEmail);
router.get('/verification-status/:email', checkEmailVerificationStatus);

// Protected routes (require authentication)
router.use(authenticateJWT);
router.use(trackUserActivity);

router.get('/verify', verifyUser);
router.get('/me', verifyUser);
router.post('/logout', logoutUser);

// Device management
router.get('/devices', getUserDevices);
router.delete('/devices/:deviceId', logoutDevice);
router.delete('/devices', logoutAllDevices);

router.post('/update-role', updateUserRole);
router.delete('/me', deleteAccount);

export default router;
