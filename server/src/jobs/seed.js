import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { MarketService } from '../services/marketService.js';
import { logger } from '../utils/logger.js';

export async function runSeed() {
  try {
    logger.info('Starting TradeFlow database seed...');
    await connectDatabase();

    // 1. Seed supported instrument catalogue
    await MarketService.seedInstruments();

    // 2. Seed simulated liquidity provider and demo resting depth
    await MarketService.seedAllDemoLiquidity();

    logger.info('TradeFlow database seed completed successfully!');
  } catch (err) {
    logger.error('Error during database seed', { error: err.message, stack: err.stack });
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

// Direct execution guard
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed().then(() => {
    process.exit(process.exitCode || 0);
  });
}
