import { type Router as RouterType, Router } from 'express';
import { authenticateJWT as authenticate } from '../middlewares/auth.middleware.js';
import {
	getUserById,
	changeUserPassword,
	updateUserDetails,
	getNotificationPreferences,
	updateNotificationPreferences
} from '../controllers/user.controller.js';

const router: RouterType = Router();

// Profile & Account Management
router.get('/:id', authenticate, getUserById);
router.post('/change-password', authenticate, changeUserPassword);
router.put('/update', authenticate, updateUserDetails);

// User Notifications
router.get('/notifications/preferences', authenticate, getNotificationPreferences);
router.put('/notifications/preferences', authenticate, updateNotificationPreferences);

export default router;
