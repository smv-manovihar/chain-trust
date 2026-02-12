import { type Router as RouterType, Router } from 'express';
import { inviteEmployee } from '../controllers/company.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: RouterType = Router();

router.use(authenticateJWT);

router.post('/invite', inviteEmployee);

export default router;
