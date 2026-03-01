import express, { Router } from 'express';
import { createAlert, logSuspiciousScan, getSuspiciousScans } from '../controllers/alert.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

router.post('/', authenticateJWT, checkManufacturer, createAlert);
router.post('/suspicious-scan', logSuspiciousScan);
router.get('/suspicious-scan', authenticateJWT, checkManufacturer, getSuspiciousScans);

export default router;
