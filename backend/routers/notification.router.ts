import express, { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller.js';
import { getNotificationPreferences, updateNotificationPreferences } from '../controllers/user.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();

router.get('/', authenticateJWT, getNotifications);
router.get('/preferences', authenticateJWT, getNotificationPreferences);
router.put('/preferences', authenticateJWT, updateNotificationPreferences);
router.put('/read-all', authenticateJWT, markAllAsRead);
router.put('/:id/read', authenticateJWT, markAsRead);

export default router;
