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
  try {
    if (req.headers['x-matched-path']) {
      const originalPath = req.headers['x-matched-path'];
      const queryIndex = req.url.indexOf('?');
      if (queryIndex !== -1 && !originalPath.includes('?')) {
        req.url = originalPath + req.url.slice(queryIndex);
      } else {
        req.url = originalPath;
      }
    }

    const expressApp = await init();
    return expressApp(req, res);
  } catch (err) {
    console.error('Fatal initialization error:', err);
    initPromise = null; // Reset promise so subsequent requests can re-attempt once environment is configured
    return res.status(500).json({
      status: 'error',
      code: 'INITIALIZATION_FAILED',
      message: err.message || 'Database connection or backend initialization failed',
      tip: !process.env.MONGODB_URI
        ? 'MONGODB_URI is not set in Vercel Project Settings -> Environment Variables'
        : 'Verify that MongoDB Atlas Network Access permits connections from anywhere (IP: 0.0.0.0/0)',
    });
  }
}
