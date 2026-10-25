import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { AuthService } from '../src/services/authService.js';
import { OrderService } from '../src/services/orderService.js';
import { MarketService } from '../src/services/marketService.js';
import { Order } from '../src/models/Order.js';
import { Account } from '../src/models/Account.js';
import { Position } from '../src/models/Position.js';
import { orderBookManager } from '../src/engine/orderBook.js';
import {
  ORDER_TYPES,
  ORDER_SIDES,
  ORDER_STATUSES,
  ORDER_EVENTS,
} from '../src/config/constants.js';
import {
  ValidationError,
  InsufficientFundsError,
  InsufficientSharesError,
  ConflictError,
} from '../src/utils/errors.js';

describe('OrderService & Reservation Accounting (Transactional Tests)', () => {
  let userA;
  let userB;

  beforeAll(async () => {
    await connectDatabase();
    await MarketService.seedInstruments();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clear collections for clean state
    await Order.deleteMany({});
    await Account.deleteMany({});
    await Position.deleteMany({});
    orderBookManager.rebuildFromDatabase([]);

    // Create User A with ₹1,00,000 cash
    const regA = await AuthService.register({
      name: 'Alice Trader',
      email: `alice_${Date.now()}@example.com`,
      password: 'password123',
    });
    userA = regA.user;

    // Create User B with ₹1,00,000 cash and 50 RELIANCE shares
    const regB = await AuthService.register({
      name: 'Bob Seller',
      email: `bob_${Date.now()}@example.com`,
      password: 'password123',
    });
    userB = regB.user;

    await Position.create({
      userId: userB.id,
      instrument: 'RELIANCE',
      ownedQuantity: 50,
      reservedQuantity: 0,
      averageCostPricePaise: 240000,
      totalCostBasisPaise: 240000 * 50,
    });
  });

  it('rejects BUY order when user has insufficient cash for reservation', async () => {
    // User has ₹1,00,000 (10,000,000 paise). Try to buy 100 shares @ ₹2,500 = ₹2,50,000 (25,000,000 paise)
    await expect(
      OrderService.submitOrder({
        userId: userA.id,
        instrument: 'RELIANCE',
        side: ORDER_SIDES.BUY,
        orderType: ORDER_TYPES.LIMIT,
        priceInPaise: 250000,
        quantity: 100,
      })
    ).rejects.toThrow(InsufficientFundsError);

    // Verify account balance was untouched
    const account = await Account.findOne({ userId: userA.id });
    expect(account.reservedCashPaise).toBe(0);
    expect(account.totalCashPaise).toBe(10000000);
  });

  it('rejects SELL order when user has insufficient available shares', async () => {
    // User B only has 50 shares of RELIANCE. Try to sell 60 shares.
    await expect(
      OrderService.submitOrder({
        userId: userB.id,
        instrument: 'RELIANCE',
        side: ORDER_SIDES.SELL,
        orderType: ORDER_TYPES.LIMIT,
        priceInPaise: 250000,
        quantity: 60,
      })
    ).rejects.toThrow(InsufficientSharesError);

    const pos = await Position.findOne({ userId: userB.id, instrument: 'RELIANCE' });
    expect(pos.reservedQuantity).toBe(0);
  });

  it('rejects order with tick size violation', async () => {
    // RELIANCE tick size is 5 paise. Try to place limit order at 250002 paise
    await expect(
      OrderService.submitOrder({
        userId: userA.id,
        instrument: 'RELIANCE',
        side: ORDER_SIDES.BUY,
        orderType: ORDER_TYPES.LIMIT,
        priceInPaise: 250002,
        quantity: 1,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('reserves cash on BUY limit order submission and releases on cancellation', async () => {
    // Buy 10 shares @ ₹2,500 = ₹25,000 (2,500,000 paise)
    const { order } = await OrderService.submitOrder({
      userId: userA.id,
      instrument: 'RELIANCE',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 250000,
      quantity: 10,
    });

    expect(order.status).toBe(ORDER_STATUSES.OPEN);
    expect(order.reservedCashPaise).toBe(2500000);

    let account = await Account.findOne({ userId: userA.id });
    expect(account.reservedCashPaise).toBe(2500000);
    expect(account.availableCashPaise).toBe(10000000 - 2500000);

    // Cancel order
    const cancelled = await OrderService.cancelOrder(order._id, userA.id);
    expect(cancelled.status).toBe(ORDER_STATUSES.CANCELLED);

    account = await Account.findOne({ userId: userA.id });
    expect(account.reservedCashPaise).toBe(0);
    expect(account.availableCashPaise).toBe(10000000);
  });

  it('reserves shares on SELL order and releases on cancellation', async () => {
    // User B sells 20 shares of RELIANCE
    const { order } = await OrderService.submitOrder({
      userId: userB.id,
      instrument: 'RELIANCE',
      side: ORDER_SIDES.SELL,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 260000,
      quantity: 20,
    });

    expect(order.status).toBe(ORDER_STATUSES.OPEN);

    let pos = await Position.findOne({ userId: userB.id, instrument: 'RELIANCE' });
    expect(pos.reservedQuantity).toBe(20);
    expect(pos.availableQuantity).toBe(30);

    // Cancel order
    await OrderService.cancelOrder(order._id, userB.id);

    pos = await Position.findOne({ userId: userB.id, instrument: 'RELIANCE' });
    expect(pos.reservedQuantity).toBe(0);
    expect(pos.availableQuantity).toBe(50);
  });

  it('idempotency: replaying submission with same key returns identical result without duplicate orders', async () => {
    const key = `test_key_${Date.now()}`;
    const payload = {
      userId: userA.id,
      instrument: 'RELIANCE',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 250000,
      quantity: 5,
      idempotencyKey: key,
    };

    const res1 = await OrderService.submitOrder(payload);
    const res2 = await OrderService.submitOrder(payload);

    expect(res2.order.orderId).toBe(res1.order.orderId);
    expect(res2.order._id.toString()).toBe(res1.order._id.toString());

    // Only 1 order exists in database
    const orderCount = await Order.countDocuments({ idempotencyKey: key });
    expect(orderCount).toBe(1);
  });

  it('idempotency: reusing same key with different payload is rejected with ConflictError', async () => {
    const key = `conflict_key_${Date.now()}`;
    await OrderService.submitOrder({
      userId: userA.id,
      instrument: 'RELIANCE',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 250000,
      quantity: 2,
      idempotencyKey: key,
    });

    // Same key, different quantity
    await expect(
      OrderService.submitOrder({
        userId: userA.id,
        instrument: 'RELIANCE',
        side: ORDER_SIDES.BUY,
        orderType: ORDER_TYPES.LIMIT,
        priceInPaise: 250000,
        quantity: 4,
        idempotencyKey: key,
      })
    ).rejects.toThrow(ConflictError);
  });

  it('cannot cancel an already filled order', async () => {
    // User B places resting sell order @ 2500 for 5 shares
    const { order: sellOrder } = await OrderService.submitOrder({
      userId: userB.id,
      instrument: 'RELIANCE',
      side: ORDER_SIDES.SELL,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 250000,
      quantity: 5,
    });

    // User A crosses it with a buy order @ 2500 for 5 shares -> fills both!
    await OrderService.submitOrder({
      userId: userA.id,
      instrument: 'RELIANCE',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 250000,
      quantity: 5,
    });

    // Attempt to cancel fully filled sellOrder
    await expect(
      OrderService.cancelOrder(sellOrder._id, userB.id)
    ).rejects.toThrow(ConflictError);
  });

  it('restarts and reconstructs the open order book from persistent MongoDB orders', async () => {
    // Submit resting order
    await OrderService.submitOrder({
      userId: userB.id,
      instrument: 'RELIANCE',
      side: ORDER_SIDES.SELL,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 260000,
      quantity: 15,
    });

    // Simulate crash/restart: clear memory book
    orderBookManager.rebuildFromDatabase([]);
    expect(orderBookManager.getRestingOrders('RELIANCE')).toHaveLength(0);

    // Reconstruct from DB
    const activeOrders = await Order.find({
      status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
    }).lean();

    orderBookManager.rebuildFromDatabase(activeOrders);

    const recovered = orderBookManager.getRestingOrders('RELIANCE');
    expect(recovered).toHaveLength(1);
    expect(recovered[0].remainingQuantity).toBe(15);
    expect(recovered[0].priceInPaise).toBe(260000);
  });
});
