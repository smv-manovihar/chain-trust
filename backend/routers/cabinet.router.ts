import { type Router as RouterType, Router } from 'express';
import { authenticateJWT as authenticate } from '../middlewares/auth.middleware.js';
import {
	getCabinetStats,
	getRecentUserScans,
	getPersonalCabinet,
	addToCabinet,
	getCabinetItem,
	updateCabinetItem,
	removeFromCabinet,
	markDoseTaken,
	getUserPrescriptions,
	uploadPrescription,
	deletePrescription
} from '../controllers/cabinet.controller.js';

const router: RouterType = Router();

// Stats & Scans
router.get('/stats', authenticate, getCabinetStats);
router.get('/recent-scans', authenticate, getRecentUserScans);

// Cabinet CRUD
router.get('/list', authenticate, getPersonalCabinet);
router.post('/add', authenticate, addToCabinet);
router.get('/:id', authenticate, getCabinetItem);
router.put('/:id', authenticate, updateCabinetItem);
router.delete('/:id', authenticate, removeFromCabinet);
router.post('/mark-taken/:id', authenticate, markDoseTaken);

// Prescription Pool
router.get('/prescriptions/list', authenticate, getUserPrescriptions);
router.post('/prescriptions/upload', authenticate, uploadPrescription);
router.delete('/prescriptions/:id', authenticate, deletePrescription);

export default router;
