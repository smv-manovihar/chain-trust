import express, { Router } from 'express';
import { createAlert } from '../controllers/alert.controller.js';

const router: Router = express.Router();

router.post('/', createAlert);

export default router;
