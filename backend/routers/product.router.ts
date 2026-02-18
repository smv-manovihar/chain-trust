import express, { Router } from 'express';
import { createProduct } from '../controllers/product.controller.js';
// Add auth middleware if needed, e.g. verifyToken
// import { verifyToken } from '../middlewares/auth.middleware.js'; 

const router: Router = express.Router();

// Route to create a new product
// Protected logic (e.g. only company can add) should be added here
router.post('/', createProduct);

export default router;
