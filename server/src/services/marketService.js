import { Instrument } from '../models/Instrument.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { Position } from '../models/Position.js';
import { Order } from '../models/Order.js';
import { ORDER_TYPES, ORDER_SIDES, ORDER_STATUSES, ORDER_EVENTS, SYSTEM_LIQUIDITY_USER_ID } from '../config/constants.js';
import { orderBookManager } from '../engine/orderBook.js';
import { logger } from '../utils/logger.js';

export const SEED_INSTRUMENTS = [
  {
    symbol: 'RELIANCE',
    displayName: 'Reliance Industries Ltd.',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 250000, // ₹2,500.00
    lastPricePaise: 250000,
    dayHighPaise: 252500,
    dayLowPaise: 248000,
  },
  {
    symbol: 'TCS',
    displayName: 'Tata Consultancy Services Ltd.',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 350000, // ₹3,500.00
    lastPricePaise: 350000,
    dayHighPaise: 354000,
    dayLowPaise: 347500,
  },
  {
    symbol: 'INFY',
    displayName: 'Infosys Ltd.',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 145000, // ₹1,450.00
    lastPricePaise: 145000,
    dayHighPaise: 146500,
    dayLowPaise: 143500,
  },
  {
    symbol: 'HDFCBANK',
    displayName: 'HDFC Bank Ltd.',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 165000, // ₹1,650.00
    lastPricePaise: 165000,
    dayHighPaise: 166800,
    dayLowPaise: 164200,
  },
  {
    symbol: 'ICICIBANK',
    displayName: 'ICICI Bank Ltd.',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 102000, // ₹1,020.00
    lastPricePaise: 102000,
    dayHighPaise: 103200,
    dayLowPaise: 101100,
  },
  {
    symbol: 'TATAMOTORS',
    displayName: 'Tata Motors Ltd.',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 88000, // ₹880.00
    lastPricePaise: 88000,
    dayHighPaise: 89500,
    dayLowPaise: 87100,
  },
  {
    symbol: 'ZOMATO',
    displayName: 'Zomato Ltd.',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 21000, // ₹210.00
    lastPricePaise: 21000,
    dayHighPaise: 21500,
    dayLowPaise: 20600,
  },
  {
    symbol: 'PAYTM',
    displayName: 'One97 Communications Ltd. (Paytm)',
    exchange: 'NSE (Simulated)',
    tickSizePaise: 5,
    simulatedReferencePricePaise: 65000, // ₹650.00
    lastPricePaise: 65000,
    dayHighPaise: 66200,
    dayLowPaise: 64100,
  },
];

export class MarketService {
  /**
   * Seeds the supported instrument catalogue idempotently.
   */
  static async seedInstruments() {
    for (const inst of SEED_INSTRUMENTS) {
      await Instrument.findOneAndUpdate(
        { symbol: inst.symbol },
        { $setOnInsert: inst },
        { upsert: true, new: true }
      );
    }
    logger.info(`Seeded ${SEED_INSTRUMENTS.length} simulated instruments`);
  }

  /**
   * Ensures the system liquidity provider account exists with sufficient demo cash and inventory.
   */
  static async getOrCreateLiquidityProvider() {
    let lpUser = await User.findOne({ role: 'system_liquidity' });
    if (!lpUser) {
      lpUser = await User.create({
        name: 'TradeFlow Liquidity Provider',
        email: 'liquidity.provider@tradeflow.simulated',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890TradeFlowSystem',
        role: 'system_liquidity',
      });
    }

    let lpAccount = await Account.findOne({ userId: lpUser._id });
    if (!lpAccount) {
      lpAccount = await Account.create({
        userId: lpUser._id,
        totalCashPaise: 1_000_000_000, // ₹1 Crore simulated cash
        reservedCashPaise: 0,
      });
    }

    // Ensure LP has positions in all instruments
    for (const inst of SEED_INSTRUMENTS) {
      await Position.findOneAndUpdate(
        { userId: lpUser._id, instrument: inst.symbol },
        {
          $setOnInsert: {
            ownedQuantity: 100_000,
            reservedQuantity: 0,
            averageCostPricePaise: inst.simulatedReferencePricePaise,
            totalCostBasisPaise: inst.simulatedReferencePricePaise * 100_000,
          },
        },
        { upsert: true }
      );
    }

    return { lpUser, lpAccount };
  }

  /**
   * Seeds public resting orders around reference price for an instrument
   * to guarantee realistic depth for demonstration matching.
   */
  static async seedDemoLiquidityForInstrument(symbol) {
    const { lpUser } = await this.getOrCreateLiquidityProvider();
    const inst = await Instrument.findOne({ symbol });
    if (!inst) return;

    const refPrice = inst.simulatedReferencePricePaise;
    const tick = inst.tickSizePaise;

    // Check if resting orders already exist
    const existingOrders = await Order.countDocuments({
      instrument: symbol,
      status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
    });

    if (existingOrders >= 6) {
      return; // Already sufficient resting depth
    }

    // Seed 3 bids and 3 asks
    const bidLevels = [
      { offset: -tick * 2, qty: 50 },
      { offset: -tick * 4, qty: 100 },
      { offset: -tick * 8, qty: 150 },
    ];

    const askLevels = [
      { offset: tick * 2, qty: 50 },
      { offset: tick * 4, qty: 100 },
      { offset: tick * 8, qty: 150 },
    ];

    for (const bid of bidLevels) {
      const price = refPrice + bid.offset;
      const notional = price * bid.qty;
      const order = await Order.create({
        orderId: `SEED_BID_${symbol}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: lpUser._id,
        instrument: symbol,
        side: ORDER_SIDES.BUY,
        orderType: ORDER_TYPES.LIMIT,
        priceInPaise: price,
        quantity: bid.qty,
        filledQuantity: 0,
        remainingQuantity: bid.qty,
        reservedCashPaise: notional,
        reservedQuantity: 0,
        status: ORDER_STATUSES.OPEN,
      });
      orderBookManager.addOrUpdateOrder(order);
      await Account.findOneAndUpdate(
        { userId: lpUser._id },
        { $inc: { reservedCashPaise: notional } }
      );
    }

    for (const ask of askLevels) {
      const price = refPrice + ask.offset;
      const order = await Order.create({
        orderId: `SEED_ASK_${symbol}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: lpUser._id,
        instrument: symbol,
        side: ORDER_SIDES.SELL,
        orderType: ORDER_TYPES.LIMIT,
        priceInPaise: price,
        quantity: ask.qty,
        filledQuantity: 0,
        remainingQuantity: ask.qty,
        reservedCashPaise: 0,
        reservedQuantity: ask.qty,
        status: ORDER_STATUSES.OPEN,
      });
      orderBookManager.addOrUpdateOrder(order);
      await Position.findOneAndUpdate(
        { userId: lpUser._id, instrument: symbol },
        { $inc: { reservedQuantity: ask.qty } }
      );
    }

    logger.info(`Seeded demo two-sided liquidity for ${symbol}`);
  }

  static async seedAllDemoLiquidity() {
    for (const inst of SEED_INSTRUMENTS) {
      await this.seedDemoLiquidityForInstrument(inst.symbol);
    }
  }

  static async getInstruments() {
    return Instrument.find({ tradable: true }).sort({ symbol: 1 });
  }

  static async getInstrumentBySymbol(symbol) {
    return Instrument.findOne({ symbol: symbol.toUpperCase() });
  }
}
