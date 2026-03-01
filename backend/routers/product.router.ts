import express, { Router } from 'express';
import { createProduct, recallProduct } from '../controllers/product.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

// Route to create a new product
router.post('/', authenticateJWT, checkManufacturer, createProduct);
router.post('/recall', authenticateJWT, checkManufacturer, recallProduct);

export default router;
