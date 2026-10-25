import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { MarketService } from './services/marketService.js';
import { Order } from './models/Order.js';
import { ORDER_STATUSES } from './config/constants.js';
import { orderBookManager } from './engine/orderBook.js';
import { logger } from './utils/logger.js';

async function startServer() {
  try {
    logger.info('Starting TradeFlow server initialization...');

    // 1. Connect to Database
    await connectDatabase();

    // 2. Ensure initial seed of instruments & liquidity
    await MarketService.seedInstruments();

    // 3. Durable Order Book Recovery
    logger.info('Reconstructing in-memory order books from persistent MongoDB orders...');
    const activeOrders = await Order.find({
      status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
      remainingQuantity: { $gt: 0 },
    }).lean();

    orderBookManager.rebuildFromDatabase(activeOrders);

    // 4. Seed demo liquidity if enabled and depth is low
    if (env.SIMULATED_MARKET_ENABLED) {
      await MarketService.seedAllDemoLiquidity();
    }

    // 5. Start HTTP server
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`TradeFlow Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`API Base URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`Allowed Client Origin: ${env.CLIENT_URL}`);
    });

    // Graceful shutdown handling
    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    return { app, server };
  } catch (err) {
    logger.error('Fatal server startup error', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

// Start server if run directly
if (process.argv[1]?.endsWith('server.js')) {
  startServer();
}

export { startServer };
