import { MarketService } from '../services/marketService.js';
import { NotFoundError } from '../utils/errors.js';

export class InstrumentController {
  static async getInstruments(req, res, next) {
    try {
      const instruments = await MarketService.getInstruments();
      res.status(200).json({
        status: 'success',
        data: { instruments },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInstrumentBySymbol(req, res, next) {
    try {
      const instrument = await MarketService.getInstrumentBySymbol(req.params.symbol);
      if (!instrument) {
        throw new NotFoundError(`Instrument ${req.params.symbol} not found`);
      }
      res.status(200).json({
        status: 'success',
        data: { instrument },
      });
    } catch (err) {
      next(err);
    }
  }
}
