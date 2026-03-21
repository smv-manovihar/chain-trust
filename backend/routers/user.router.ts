import { type Router as RouterType, Router } from 'express';
import { authenticateJWT as authenticate } from '../middlewares/auth.middleware.js';
import {
	getUserById,
	changeUserPassword,
	updateUserDetails,
	getPersonalCabinet,
	addToCabinet,
	removeFromCabinet
} from '../controllers/user.controller.js';

const router: RouterType = Router();

router.get('/:id', authenticate, getUserById);
router.post('/change-password', authenticate, changeUserPassword);
router.put('/update', authenticate, updateUserDetails);

// Personal Cabinet
router.get('/cabinet/list', authenticate, getPersonalCabinet);
router.post('/cabinet/add', authenticate, addToCabinet);
router.delete('/cabinet/:id', authenticate, removeFromCabinet);

export default router;
