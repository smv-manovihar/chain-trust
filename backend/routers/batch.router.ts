import express, { Router } from 'express';
import {
	createBatch,
	listBatches,
	getBatch,
	getBatchQRData,
	verifyScan,
	recallBatch,
	getBatchPDF,
} from '../controllers/batch.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

// Public endpoint - verify product scan (no auth required for consumers)
router.post('/verify-scan', verifyScan);

// Protected endpoints - manufacturer only
router.post('/', authenticateJWT, checkManufacturer, createBatch);
router.get('/', authenticateJWT, checkManufacturer, listBatches);
router.get('/:id', authenticateJWT, checkManufacturer, getBatch);
router.get('/:id/qr-data', authenticateJWT, checkManufacturer, getBatchQRData);
router.get('/:id/pdf', authenticateJWT, checkManufacturer, getBatchPDF);
router.post('/:id/recall', authenticateJWT, checkManufacturer, recallBatch);

export default router;
