import express, { Router } from 'express';
import { getProductFlow, updateTrackingStatus } from '../controllers/tracking.controller.js';
// import { verifyToken } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();

// Public route to get tracking info
router.get('/:productId', getProductFlow);

// Protected route to update status (should add auth middleware later)
router.post('/:productId/status', updateTrackingStatus);

export default router;
