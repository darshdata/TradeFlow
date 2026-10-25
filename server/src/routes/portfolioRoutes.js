import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolioController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/summary', PortfolioController.getSummary);
router.get('/positions', PortfolioController.getPositions);
router.get('/account', PortfolioController.getAccount);

export default router;
