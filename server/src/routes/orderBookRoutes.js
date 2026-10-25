import { Router } from 'express';
import { OrderBookController } from '../controllers/orderBookController.js';

const router = Router();

router.get('/:symbol', OrderBookController.getOrderBook);

export default router;
