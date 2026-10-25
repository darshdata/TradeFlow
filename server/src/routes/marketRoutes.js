import { Router } from 'express';
import { MarketController } from '../controllers/marketController.js';

const router = Router();

router.get('/status', MarketController.getStatus);

export default router;
