import { Router } from 'express';
import { InstrumentController } from '../controllers/instrumentController.js';

const router = Router();

router.get('/', InstrumentController.getInstruments);
router.get('/:symbol', InstrumentController.getInstrumentBySymbol);

export default router;
