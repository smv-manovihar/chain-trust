import express, { Router } from 'express';
import { createProduct, listProducts, getProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

// All product catalogue routes are protected
router.use(authenticateJWT, checkManufacturer);

router.post('/', createProduct);
router.get('/', listProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
