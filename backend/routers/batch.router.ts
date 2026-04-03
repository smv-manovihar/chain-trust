import express, { Router } from 'express';
import {
	createBatch,
	listBatches,
	getBatch,
	getBatchQRData,
	verifyScan,
	recallBatch,
	restoreBatch,
	getBatchPDF,
	getBatchScanDetails,
} from '../controllers/batch.controller.js';
import { authenticateJWT, authenticateJWTOptional, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

// Public endpoint - verify product scan (no auth required for consumers)
router.post('/verify-scan', authenticateJWTOptional, verifyScan);

// Protected endpoints - manufacturer only
router.post('/', authenticateJWT, checkManufacturer, createBatch);
router.get('/', authenticateJWT, checkManufacturer, listBatches);
router.get('/:batchNumber', authenticateJWT, checkManufacturer, getBatch);
router.get('/:batchNumber/qr-data', authenticateJWT, checkManufacturer, getBatchQRData);
router.get('/:batchNumber/pdf', authenticateJWT, checkManufacturer, getBatchPDF);
router.get('/:batchNumber/scan-details', authenticateJWT, checkManufacturer, getBatchScanDetails);
router.post('/:batchNumber/recall', authenticateJWT, checkManufacturer, recallBatch);
router.post('/:batchNumber/restore', authenticateJWT, checkManufacturer, restoreBatch);

export default router;
