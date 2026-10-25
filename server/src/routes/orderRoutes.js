import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, queryOrdersSchema } from '../validators/orderValidator.js';
import { tradeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);

router.post('/', tradeLimiter, validate(createOrderSchema), OrderController.createOrder);
router.get('/', validate(queryOrdersSchema, 'query'), OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.post('/:id/cancel', tradeLimiter, OrderController.cancelOrder);
router.get('/:id/events', OrderController.getOrderEvents);

export default router;
