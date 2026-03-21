import express, { Router } from 'express';
import { createAlert, getAlerts, markAlertAsRead } from '../controllers/alert.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

router.post('/', authenticateJWT, checkManufacturer, createAlert);
router.get('/', authenticateJWT, getAlerts);
router.put('/:id/read', authenticateJWT, markAlertAsRead);

export default router;
