import { orderBookManager } from '../engine/orderBook.js';
import { Instrument } from '../models/Instrument.js';
import { NotFoundError } from '../utils/errors.js';

export class OrderBookController {
  static async getOrderBook(req, res, next) {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const instrument = await Instrument.findOne({ symbol });
      if (!instrument) {
        throw new NotFoundError(`Instrument ${symbol} not found`);
      }

      const snapshot = orderBookManager.getL2Snapshot(symbol);

      res.status(200).json({
        status: 'success',
        data: {
          ...snapshot,
          instrument: {
            symbol: instrument.symbol,
            displayName: instrument.displayName,
            tickSizePaise: instrument.tickSizePaise,
            simulatedReferencePricePaise: instrument.simulatedReferencePricePaise,
            lastPricePaise: instrument.lastPricePaise,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
