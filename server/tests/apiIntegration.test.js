import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { MarketService } from '../src/services/marketService.js';
import { User } from '../src/models/User.js';
import { Order } from '../src/models/Order.js';
import { Account } from '../src/models/Account.js';
import { Position } from '../src/models/Position.js';
import { orderBookManager } from '../src/engine/orderBook.js';

describe('TradeFlow Full REST API Integration Tests', () => {
  let app;
  let tokenA;
  let userAId;
  let tokenB;
  let userBId;

  beforeAll(async () => {
    await connectDatabase();
    await MarketService.seedInstruments();
    app = createApp();

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'Trader Alpha',
      email: `alpha_${Date.now()}@fintech.test`,
      password: 'SecurePassword123!',
    });
    expect(resA.status).toBe(201);
    tokenA = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'Trader Beta',
      email: `beta_${Date.now()}@fintech.test`,
      password: 'SecurePassword123!',
    });
    expect(resB.status).toBe(201);
    tokenB = resB.body.data.token;
    userBId = resB.body.data.user.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET /api/health returns system health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/health/database returns database state', async () => {
    const res = await request(app).get('/api/health/database');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/v1/auth/login authenticates registered user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: (await User.findById(userAId)).email,
        password: 'SecurePassword123!',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('GET /api/v1/auth/me returns authenticated user details', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(userAId);
    expect(res.body.data.account.availableCashPaise).toBe(10000000);
  });

  it('GET /api/v1/instruments returns supported catalogue', async () => {
    const res = await request(app).get('/api/v1/instruments');
    expect(res.status).toBe(200);
    expect(res.body.data.instruments.length).toBeGreaterThan(0);
    const symbols = res.body.data.instruments.map((i) => i.symbol);
    expect(symbols).toContain('RELIANCE');
    expect(symbols).toContain('TCS');
  });

  it('POST /api/v1/orders creates limit order and reserves cash', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        instrument: 'RELIANCE',
        side: 'BUY',
        orderType: 'LIMIT',
        priceInPaise: 240000,
        quantity: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.status).toBe('OPEN');
    expect(res.body.data.order.remainingQuantity).toBe(10);
  });

  it('GET /api/v1/orderbook/:symbol returns real aggregated L2 book', async () => {
    const res = await request(app).get('/api/v1/orderbook/RELIANCE');
    expect(res.status).toBe(200);
    expect(res.body.data.symbol).toBe('RELIANCE');
    expect(Array.isArray(res.body.data.bids)).toBe(true);
    // User A's bid at 240000 should appear
    const bid2400 = res.body.data.bids.find((b) => b.priceInPaise === 240000);
    expect(bid2400).toBeDefined();
    expect(bid2400.totalQuantity).toBeGreaterThanOrEqual(10);
  });

  it('GET /api/v1/orders returns paginated user orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders?instrument=RELIANCE')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orders.length).toBeGreaterThan(0);
    expect(res.body.data.pagination.total).toBeGreaterThan(0);
  });

  it('authorization: User B cannot cancel User A private order', async () => {
    // Get User A order
    const listRes = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenA}`);
    const orderId = listRes.body.data.orders[0]._id;

    // User B tries to cancel it
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(cancelRes.status).toBe(403);
  });

  it('POST /api/v1/orders/:id/cancel cancels order and releases reservation', async () => {
    const listRes = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenA}`);
    const orderId = listRes.body.data.orders[0]._id;

    const res = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('CANCELLED');

    // Verify orderbook no longer has this order
    const obRes = await request(app).get('/api/v1/orderbook/RELIANCE');
    const bid = obRes.body.data.bids.find((b) => b.priceInPaise === 240000);
    expect(bid).toBeUndefined();
  });

  it('GET /api/v1/portfolio/summary returns account summary and metrics', async () => {
    const res = await request(app)
      .get('/api/v1/portfolio/summary')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.account).toBeDefined();
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.audit.isReconciled).toBe(true);
  });

  it('GET /api/v1/market/status returns real-time market schedule', async () => {
    const res = await request(app).get('/api/v1/market/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session).toBeDefined();
    expect(res.body.data.istTime).toBeDefined();
    expect(res.body.data.regularHours).toBe('09:15 - 15:30 IST (Mon–Fri)');
  });

  it('POST /api/v1/orders with enforceExchangeHours=true validates market schedule when closed', async () => {
    const statusRes = await request(app).get('/api/v1/market/status');
    const { isRegularOpen } = statusRes.body.data;

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        instrument: 'RELIANCE',
        side: 'BUY',
        orderType: 'LIMIT',
        priceInPaise: 245000,
        quantity: 5,
        enforceExchangeHours: true,
      });

    if (!isRegularOpen) {
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Regular equity exchange is closed');
    } else {
      expect(res.status).toBe(201);
    }
  });
});
