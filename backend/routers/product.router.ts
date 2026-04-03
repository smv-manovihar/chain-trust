import express, { Router } from 'express';
import { createProduct, listProducts, getProduct, updateProductDetails, deleteProduct, updateProductStatus } from '../controllers/product.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();
const checkManufacturer = checkRole(['manufacturer', 'employee']);

// All product catalogue routes are protected
router.use(authenticateJWT, checkManufacturer);

router.post('/', createProduct);
router.get('/', listProducts);
router.get('/:productId', getProduct);
router.put('/:id', updateProductDetails);
router.delete('/:productId', deleteProduct);
router.patch('/:id/status', updateProductStatus);

export default router;
