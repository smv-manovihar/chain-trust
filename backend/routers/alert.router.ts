import express, { Router } from 'express';
import { createAlert } from '../controllers/alert.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

router.post('/', authenticateJWT, checkManufacturer, createAlert);

export default router;
