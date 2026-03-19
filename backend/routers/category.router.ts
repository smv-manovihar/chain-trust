import { Router } from 'express';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';
import { createCategory, listCategories, updateCategory, deleteCategory } from '../controllers/category.controller.js';

const router: Router = Router();

// Only manufacturers can manage their categories
router.use(authenticateJWT);
router.use(checkRole(['manufacturer']));

router.post('/', createCategory);
router.get('/', listCategories);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
