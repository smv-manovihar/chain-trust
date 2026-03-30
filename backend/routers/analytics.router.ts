import express, { Router } from 'express';
import {
	getTimelineAnalytics,
	getGeographicAnalytics,
	getScanDetails,
	getThreatAnalytics,
} from '../controllers/analytics.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

// All analytics routes require authentication and manufacturer/employee role
router.use(authenticateJWT, checkManufacturer);

router.get('/timeline', getTimelineAnalytics);
router.get('/geographic', getGeographicAnalytics);
router.get('/details', getScanDetails);
router.get('/threats', getThreatAnalytics);

export default router;
