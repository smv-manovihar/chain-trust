import { type Router as RouterType, Router } from 'express';
import { inviteEmployee } from '../controllers/company.controller.js';
import { authenticateJWT, checkRole } from '../middlewares/auth.middleware.js';

const router: RouterType = Router();
const checkManufacturer = checkRole(['manufacturer']);

router.use(authenticateJWT);

router.post('/invite', checkManufacturer, inviteEmployee);

export default router;
