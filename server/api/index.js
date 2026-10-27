import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { MarketService } from '../src/services/marketService.js';
import { Order } from '../src/models/Order.js';
import { ORDER_STATUSES } from '../src/config/constants.js';
import { orderBookManager } from '../src/engine/orderBook.js';

let app = null;
let initPromise = null;

async function init() {
  if (app) return app;

  if (!initPromise) {
    initPromise = (async () => {
      await connectDatabase();
      await MarketService.seedInstruments();

      const activeOrders = await Order.find({
        status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
        remainingQuantity: { $gt: 0 },
      }).lean();
      orderBookManager.rebuildFromDatabase(activeOrders);

      app = createApp();
      return app;
    })();
  }

  return initPromise;
}

export default async function handler(req, res) {
  const expressApp = await init();
  return expressApp(req, res);
}
