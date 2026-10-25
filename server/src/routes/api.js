import { Router } from 'express';
import authRoutes from './authRoutes.js';
import instrumentRoutes from './instrumentRoutes.js';
import orderRoutes from './orderRoutes.js';
import orderBookRoutes from './orderBookRoutes.js';
import executionRoutes from './executionRoutes.js';
import portfolioRoutes from './portfolioRoutes.js';
import { PortfolioController } from '../controllers/portfolioController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/instruments', instrumentRoutes);
router.use('/orders', orderRoutes);
router.use('/orderbook', orderBookRoutes);
router.use('/executions', executionRoutes);
router.use('/portfolio', portfolioRoutes);

// Direct shortcuts as specified in specs
router.get('/positions', authenticate, PortfolioController.getPositions);
router.get('/account', authenticate, PortfolioController.getAccount);

export default router;
