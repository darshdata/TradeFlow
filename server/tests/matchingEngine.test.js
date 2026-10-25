import { describe, it, expect } from 'vitest';
import { MatchingEngine } from '../src/engine/matchingEngine.js';
import { ORDER_TYPES, ORDER_SIDES, ORDER_STATUSES } from '../src/config/constants.js';

describe('MatchingEngine (Pure Domain Logic)', () => {
  const createMockOrder = (overrides = {}) => ({
    _id: `ord_${Math.random().toString(36).substring(2, 9)}`,
    userId: `user_${Math.random().toString(36).substring(2, 9)}`,
    instrument: 'RELIANCE',
    side: ORDER_SIDES.BUY,
    orderType: ORDER_TYPES.LIMIT,
    priceInPaise: 250000,
    quantity: 10,
    filledQuantity: 0,
    remainingQuantity: 10,
    status: ORDER_STATUSES.NEW,
    createdAt: new Date(),
    ...overrides,
  });

  it('A BUY limit order with no opposing liquidity becomes OPEN', () => {
    const buyOrder = createMockOrder({ side: ORDER_SIDES.BUY, priceInPaise: 250000, quantity: 10 });
    const resting = [];

    const result = MatchingEngine.matchOrder(buyOrder, resting);
    expect(result.executions).toHaveLength(0);
    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.OPEN);
    expect(result.updatedIncomingOrder.remainingQuantity).toBe(10);
    expect(result.updatedIncomingOrder.filledQuantity).toBe(0);
  });

  it('A SELL limit order with no opposing liquidity becomes OPEN', () => {
    const sellOrder = createMockOrder({ side: ORDER_SIDES.SELL, priceInPaise: 250000, quantity: 10 });
    const resting = [];

    const result = MatchingEngine.matchOrder(sellOrder, resting);
    expect(result.executions).toHaveLength(0);
    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.OPEN);
    expect(result.updatedIncomingOrder.remainingQuantity).toBe(10);
  });

  it('A crossing limit order executes at the resting order price', () => {
    // Resting ask at 2450.00 (245000 paise)
    const restingSell = createMockOrder({
      _id: 'resting_sell_1',
      userId: 'user_seller',
      side: ORDER_SIDES.SELL,
      priceInPaise: 245000,
      quantity: 10,
      remainingQuantity: 10,
      status: ORDER_STATUSES.OPEN,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });

    // Incoming buy with higher limit price 2500.00 (250000 paise)
    const incomingBuy = createMockOrder({
      _id: 'incoming_buy_1',
      userId: 'user_buyer',
      side: ORDER_SIDES.BUY,
      priceInPaise: 250000,
      quantity: 10,
      remainingQuantity: 10,
    });

    const result = MatchingEngine.matchOrder(incomingBuy, [restingSell]);

    expect(result.executions).toHaveLength(1);
    const exec = result.executions[0];
    // Deterministic rule: execution occurs at resting order's price
    expect(exec.priceInPaise).toBe(245000);
    expect(exec.quantity).toBe(10);
    expect(exec.notionalPaise).toBe(2450000);

    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.FILLED);
    expect(result.updatedIncomingOrder.filledQuantity).toBe(10);
    expect(result.updatedIncomingOrder.remainingQuantity).toBe(0);
    expect(result.updatedIncomingOrder.averageExecutionPriceInPaise).toBe(245000);

    expect(result.updatedRestingOrders[0].status).toBe(ORDER_STATUSES.FILLED);
    expect(result.updatedRestingOrders[0].remainingQuantity).toBe(0);
  });

  it('A market order matches an eligible resting limit order', () => {
    const restingAsk = createMockOrder({
      _id: 'resting_ask_1',
      userId: 'user_seller',
      side: ORDER_SIDES.SELL,
      priceInPaise: 251000,
      quantity: 5,
      remainingQuantity: 5,
      status: ORDER_STATUSES.OPEN,
    });

    const marketBuy = createMockOrder({
      _id: 'mkt_buy_1',
      userId: 'user_buyer',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.MARKET,
      priceInPaise: 0,
      quantity: 5,
      remainingQuantity: 5,
    });

    const result = MatchingEngine.matchOrder(marketBuy, [restingAsk]);
    expect(result.executions).toHaveLength(1);
    expect(result.executions[0].priceInPaise).toBe(251000);
    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.FILLED);
  });

  it('An order is partially filled when opposing liquidity is smaller than order quantity', () => {
    const restingAsk = createMockOrder({
      _id: 'ask_1',
      userId: 'user_seller',
      side: ORDER_SIDES.SELL,
      priceInPaise: 250000,
      quantity: 4,
      remainingQuantity: 4,
      status: ORDER_STATUSES.OPEN,
    });

    const incomingBuy = createMockOrder({
      _id: 'buy_1',
      userId: 'user_buyer',
      side: ORDER_SIDES.BUY,
      priceInPaise: 250000,
      quantity: 10,
      remainingQuantity: 10,
    });

    const result = MatchingEngine.matchOrder(incomingBuy, [restingAsk]);

    expect(result.executions).toHaveLength(1);
    expect(result.executions[0].quantity).toBe(4);
    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.PARTIALLY_FILLED);
    expect(result.updatedIncomingOrder.filledQuantity).toBe(4);
    expect(result.updatedIncomingOrder.remainingQuantity).toBe(6);

    expect(result.updatedRestingOrders[0].status).toBe(ORDER_STATUSES.FILLED);
  });

  it('A single incoming order matches multiple resting orders with price priority', () => {
    const askLow = createMockOrder({
      _id: 'ask_low',
      userId: 'seller_1',
      side: ORDER_SIDES.SELL,
      priceInPaise: 248000, // ₹2480
      quantity: 5,
      remainingQuantity: 5,
      status: ORDER_STATUSES.OPEN,
      createdAt: new Date('2026-01-01T10:05:00Z'),
    });

    const askHigh = createMockOrder({
      _id: 'ask_high',
      userId: 'seller_2',
      side: ORDER_SIDES.SELL,
      priceInPaise: 249000, // ₹2490
      quantity: 10,
      remainingQuantity: 10,
      status: ORDER_STATUSES.OPEN,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });

    // Incoming BUY for 12 shares @ ₹2500
    const incomingBuy = createMockOrder({
      _id: 'incoming_buy',
      userId: 'buyer_1',
      side: ORDER_SIDES.BUY,
      priceInPaise: 250000,
      quantity: 12,
      remainingQuantity: 12,
    });

    // Feed unsorted: high price first
    const result = MatchingEngine.matchOrder(incomingBuy, [askHigh, askLow]);

    expect(result.executions).toHaveLength(2);
    // Price priority for sells: lowest price matched first!
    expect(result.executions[0].makerOrderId).toBe('ask_low');
    expect(result.executions[0].priceInPaise).toBe(248000);
    expect(result.executions[0].quantity).toBe(5);

    // Remaining 7 shares matched against askHigh
    expect(result.executions[1].makerOrderId).toBe('ask_high');
    expect(result.executions[1].priceInPaise).toBe(249000);
    expect(result.executions[1].quantity).toBe(7);

    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.FILLED);
    expect(result.updatedIncomingOrder.filledQuantity).toBe(12);

    // askHigh partially filled: 10 - 7 = 3 remaining
    const updatedHigh = result.updatedRestingOrders.find((o) => o._id === 'ask_high');
    expect(updatedHigh.status).toBe(ORDER_STATUSES.PARTIALLY_FILLED);
    expect(updatedHigh.remainingQuantity).toBe(3);
    expect(updatedHigh.filledQuantity).toBe(7);
  });

  it('Time priority is respected for equal prices', () => {
    const earlyAsk = createMockOrder({
      _id: 'early_ask',
      userId: 'seller_1',
      side: ORDER_SIDES.SELL,
      priceInPaise: 250000,
      quantity: 10,
      remainingQuantity: 10,
      status: ORDER_STATUSES.OPEN,
      createdAt: new Date('2026-01-01T09:00:00Z'),
    });

    const lateAsk = createMockOrder({
      _id: 'late_ask',
      userId: 'seller_2',
      side: ORDER_SIDES.SELL,
      priceInPaise: 250000,
      quantity: 10,
      remainingQuantity: 10,
      status: ORDER_STATUSES.OPEN,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });

    // Incoming buy for 5 shares
    const incomingBuy = createMockOrder({
      _id: 'incoming_buy',
      userId: 'buyer_1',
      side: ORDER_SIDES.BUY,
      priceInPaise: 250000,
      quantity: 5,
      remainingQuantity: 5,
    });

    // Pass in reverse chronological order
    const result = MatchingEngine.matchOrder(incomingBuy, [lateAsk, earlyAsk]);

    expect(result.executions).toHaveLength(1);
    // Early ask must execute first!
    expect(result.executions[0].makerOrderId).toBe('early_ask');
    expect(result.executions[0].quantity).toBe(5);
  });

  it('A non-crossing limit order remains open and does not execute', () => {
    // Resting ask at 2550
    const restingAsk = createMockOrder({
      _id: 'ask_1',
      userId: 'seller_1',
      side: ORDER_SIDES.SELL,
      priceInPaise: 255000,
      quantity: 10,
      remainingQuantity: 10,
      status: ORDER_STATUSES.OPEN,
    });

    // Incoming buy at 2500 (2500 < 2550 => no cross)
    const incomingBuy = createMockOrder({
      _id: 'buy_1',
      userId: 'buyer_1',
      side: ORDER_SIDES.BUY,
      priceInPaise: 250000,
      quantity: 5,
      remainingQuantity: 5,
    });

    const result = MatchingEngine.matchOrder(incomingBuy, [restingAsk]);
    expect(result.executions).toHaveLength(0);
    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.OPEN);
  });

  it('A market order with no liquidity follows the IOC remainder policy and cancels', () => {
    const marketBuy = createMockOrder({
      _id: 'mkt_buy_empty',
      userId: 'buyer_1',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.MARKET,
      priceInPaise: 0,
      quantity: 10,
      remainingQuantity: 10,
    });

    const result = MatchingEngine.matchOrder(marketBuy, []);
    expect(result.executions).toHaveLength(0);
    // Remainder cancelled as per IOC policy
    expect(result.updatedIncomingOrder.status).toBe(ORDER_STATUSES.CANCELLED);
    expect(result.updatedIncomingOrder.filledQuantity).toBe(0);
    expect(result.updatedIncomingOrder.remainingQuantity).toBe(10);
  });

  it('Self-trade prevention: skips opposing orders owned by the same user to prevent wash trading', () => {
    const ownAsk = createMockOrder({
      _id: 'own_ask',
      userId: 'trader_A',
      side: ORDER_SIDES.SELL,
      priceInPaise: 250000,
      quantity: 10,
      remainingQuantity: 10,
      status: ORDER_STATUSES.OPEN,
    });

    const thirdPartyAsk = createMockOrder({
      _id: 'third_party_ask',
      userId: 'trader_B',
      side: ORDER_SIDES.SELL,
      priceInPaise: 251000,
      quantity: 10,
      remainingQuantity: 10,
      status: ORDER_STATUSES.OPEN,
    });

    // Incoming BUY by trader_A @ 252000
    const incomingBuy = createMockOrder({
      _id: 'buy_trader_A',
      userId: 'trader_A', // SAME USER
      side: ORDER_SIDES.BUY,
      priceInPaise: 252000,
      quantity: 5,
      remainingQuantity: 5,
    });

    const result = MatchingEngine.matchOrder(incomingBuy, [ownAsk, thirdPartyAsk]);

    // Should skip ownAsk and execute against thirdPartyAsk!
    expect(result.executions).toHaveLength(1);
    expect(result.executions[0].makerOrderId).toBe('third_party_ask');
    expect(result.executions[0].sellerId).toBe('trader_B');
    expect(result.executions[0].priceInPaise).toBe(251000);
  });
});
