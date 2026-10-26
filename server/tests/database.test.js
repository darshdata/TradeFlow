import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase, hasReplicaSet, getMemoryReplSet } from '../src/config/database.js';
import { Account } from '../src/models/Account.js';
import { MarketService } from '../src/services/marketService.js';

describe('Database Configuration, Startup Guards & Portfolio Reconciliation', () => {
  const originalEnv = { ...process.env };

  afterEach(async () => {
    // Restore environment variables and mocks
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Task 1 — Database Startup Guards', () => {
    it('1. Production mode with missing MONGODB_URI rejects with expected configuration error', async () => {
      process.env.NODE_ENV = 'production';

      await expect(connectDatabase('')).rejects.toThrow(
        /MONGODB_URI is required in production mode/
      );
    });

    it('2. Production mode with whitespace-only MONGODB_URI is also rejected', async () => {
      process.env.NODE_ENV = 'production';

      await expect(connectDatabase('   ')).rejects.toThrow(
        /MONGODB_URI is required in production mode/
      );
    });

    it('3. Valid production URI does not trigger in-memory fallback', async () => {
      process.env.NODE_ENV = 'production';
      const fakeProdUri = 'mongodb://user:pass@production-cluster.mongodb.net:27017/tradeflow';

      // Mock mongoose.connect to prevent external network attempt to fake host
      const connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose.connection);

      const conn = await connectDatabase(fakeProdUri);
      expect(conn).toBe(mongoose.connection);
      expect(connectSpy).toHaveBeenCalledWith(
        fakeProdUri,
        expect.objectContaining({ autoIndex: true })
      );
      // In-memory replica set was not instantiated
      expect(getMemoryReplSet()).toBeNull();

      connectSpy.mockRestore();
    });

    it('4. Development/test fallback starts in-memory replica set when intended', async () => {
      process.env.NODE_ENV = 'test';

      const conn = await connectDatabase('');
      expect(conn).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      expect(hasReplicaSet()).toBe(true);
      expect(getMemoryReplSet()).not.toBeNull();

      await disconnectDatabase();
    }, 20000);
  });

  describe('Task 2 — Portfolio Invariant Reconciliation Endpoint', () => {
    let app;
    let tokenA;
    let userAId;
    let tokenB;
    let userBId;

    beforeAll(async () => {
      // Connect to test database and seed instruments
      await connectDatabase();
      await MarketService.seedInstruments();
      app = createApp();

      // Register User A
      const resA = await request(app).post('/api/v1/auth/register').send({
        name: 'Reconcile User Alpha',
        email: `reconcile_alpha_${Date.now()}@test.internal`,
        password: 'Password123!Safe',
      });
      tokenA = resA.body.data.token;
      userAId = resA.body.data.user.id;

      // Register User B
      const resB = await request(app).post('/api/v1/auth/register').send({
        name: 'Reconcile User Beta',
        email: `reconcile_beta_${Date.now()}@test.internal`,
        password: 'Password123!Safe',
      });
      tokenB = resB.body.data.token;
      userBId = resB.body.data.user.id;
    });

    afterAll(async () => {
      await disconnectDatabase();
    });

    it('7. Unauthenticated requests are rejected with 401', async () => {
      const res = await request(app).get('/api/v1/portfolio/reconcile');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Authentication required');
    });

    it('5. Reconciliation succeeds when invariants hold', async () => {
      const res = await request(app)
        .get('/api/v1/portfolio/reconcile')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.invariantsValid).toBe(true);
      expect(res.body.data.discrepancies).toEqual([]);
      expect(res.body.data.details).toBeDefined();
      expect(res.body.data.details.totalCashPaise).toBeGreaterThan(0);
      expect(res.body.data.details.reservedCashPaise).toBe(0);
      expect(res.body.data.details.expectedReservedCashPaise).toBe(0);
      expect(res.body.data.reconciledAt).toBeDefined();
    });

    it("8. Users cannot reconcile another user's account (403 Forbidden)", async () => {
      // User A attempts to inspect User B's reconciliation by passing query param
      const res = await request(app)
        .get(`/api/v1/portfolio/reconcile?userId=${userBId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain("You are not authorized to reconcile another user's account");
    });

    it('6. Reconciliation identifies discrepancies without leaking other users data', async () => {
      // Intentionally corrupt User A's reserved cash to simulate a ledger discrepancy
      await Account.updateOne(
        { userId: userAId },
        { $inc: { reservedCashPaise: 75000 } }
      );

      const res = await request(app)
        .get('/api/v1/portfolio/reconcile')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.invariantsValid).toBe(false);
      expect(res.body.data.discrepancies.length).toBeGreaterThan(0);
      expect(res.body.data.discrepancies[0]).toContain('Reserved cash mismatch');

      // Verify no leak of User B's identifiers or data
      const jsonString = JSON.stringify(res.body);
      expect(jsonString).not.toContain(userBId);
      expect(jsonString).not.toContain('Reconcile User Beta');

      // Revert the corruption on User A
      await Account.updateOne(
        { userId: userAId },
        { $inc: { reservedCashPaise: -75000 } }
      );

      // Verify restored reconciliation
      const restoredRes = await request(app)
        .get('/api/v1/portfolio/reconcile')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(restoredRes.status).toBe(200);
      expect(restoredRes.body.data.invariantsValid).toBe(true);
      expect(restoredRes.body.data.discrepancies).toEqual([]);
    });
  });
});
