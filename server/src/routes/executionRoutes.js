import { Router } from 'express';
import { ExecutionController } from '../controllers/executionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', ExecutionController.getExecutions);

export default router;
