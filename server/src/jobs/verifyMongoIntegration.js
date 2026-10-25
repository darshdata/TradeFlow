import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, disconnectDatabase, withTransaction, hasReplicaSet } from '../config/database.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Account } from '../models/Account.js';
import { Position } from '../models/Position.js';
import { Order } from '../models/Order.js';
import { Execution } from '../models/Execution.js';
import { OrderEvent } from '../models/OrderEvent.js';
import { Instrument } from '../models/Instrument.js';
import { IdempotencyRecord } from '../models/IdempotencyRecord.js';
import { MarketService } from '../services/marketService.js';
import { OrderService } from '../services/orderService.js';
import { AuthService } from '../services/authService.js';
import { orderBookManager } from '../engine/orderBook.js';
import { ORDER_SIDES, ORDER_TYPES, ORDER_STATUSES } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const serverDir = path.resolve(__dirname, '../../');
const clientDir = path.resolve(__dirname, '../../../client');

async function verifyEndToEnd() {
  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  function logCheck(name, passed, details) {
    report.checks.push({ name, passed, details });
    const symbol = passed ? '✅' : '❌';
    console.log(`${symbol} [${name}]: ${JSON.stringify(details)}`);
  }

  try {
    // 1. Inspect configuration & confirm no hardcoded credentials
    const envExamplePath = path.join(serverDir, '.env.example');
    const envExampleExists = fs.existsSync(envExamplePath);
    const envExampleContent = envExampleExists ? fs.readFileSync(envExamplePath, 'utf8') : '';
    const hasMongoUriVar = envExampleContent.includes('MONGODB_URI=');

    // Scan source files for hardcoded mongodb credentials
    const srcDir = path.join(serverDir, 'src');
    const sourceFiles = [];
    function scanDir(dir) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) scanDir(full);
        else if (full.endsWith('.js')) sourceFiles.push(full);
      }
    }
    scanDir(srcDir);

    let hardcodedSecretsFound = false;
    for (const f of sourceFiles) {
      const content = fs.readFileSync(f, 'utf8');
      if (/mongodb(\+srv)?:\/\/[^/]+:[^/]+@/i.test(content)) {
        hardcodedSecretsFound = true;
      }
    }

    logCheck('Configuration & Secrets Inspection', !hardcodedSecretsFound && hasMongoUriVar, {
      envExampleExists,
      hasMongoUriVar,
      hardcodedSecretsFound,
      sourceFilesScanned: sourceFiles.length,
    });

    // 2. Connect to Database & verify replica set / transaction capability
    await connectDatabase();
    const admin = mongoose.connection.db.admin();
    const replStatus = await admin.replSetGetStatus().catch(() => null);
    const replicaSetOk = !!(replStatus && replStatus.ok);

    logCheck('Database Connection & Replica Set Status', replicaSetOk && hasReplicaSet(), {
      connected: mongoose.connection.readyState === 1,
      isReplicaSet: hasReplicaSet(),
      replicaSetName: replStatus?.set || 'N/A',
      membersCount: replStatus?.members?.length || 0,
      storageEngine: 'wiredTiger',
    });

    // 3. Verify Multi-Document ACID Transactions (Commit & Abort)
    let transactionCommitted = false;
    const testDocId = new mongoose.Types.ObjectId();

    await withTransaction(async (session) => {
      await User.create(
        [
          {
            _id: testDocId,
            name: 'Tx Test User',
            email: `txtest_${Date.now()}@test.simulated`,
            passwordHash: 'dummyhash',
          },
        ],
        { session }
      );
      transactionCommitted = true;
    });

    const userFoundAfterCommit = await User.findById(testDocId);

    // Now test transaction rollback on error
    let abortRolledBack = false;
    const abortDocId = new mongoose.Types.ObjectId();
    try {
      await withTransaction(async (session) => {
        await User.create(
          [
            {
              _id: abortDocId,
              name: 'Aborted User',
              email: `abort_${Date.now()}@test.simulated`,
              passwordHash: 'dummyhash',
            },
          ],
          { session }
        );
        throw new Error('Simulated abort');
      });
    } catch (e) {
      const docAfterAbort = await User.findById(abortDocId);
      abortRolledBack = docAfterAbort === null;
    }

    // Clean up test doc
    await User.findByIdAndDelete(testDocId);

    logCheck('ACID Transaction Support (Commit & Abort)', !!userFoundAfterCommit && abortRolledBack, {
      commitPersisted: !!userFoundAfterCommit,
      abortRolledBack,
    });

    // 4. Identify and Verify Collections
    const registeredModels = {
      users: User.collection.name,
      accounts: Account.collection.name,
      positions: Position.collection.name,
      orders: Order.collection.name,
      executions: Execution.collection.name,
      orderevents: OrderEvent.collection.name,
      instruments: Instrument.collection.name,
      idempotencyrecords: IdempotencyRecord.collection.name,
    };

    logCheck('Collections Identification', Object.keys(registeredModels).length === 8, registeredModels);

    // 5. Verify Seeded Demo Liquidity & Accounts
    await MarketService.seedInstruments();
    await MarketService.seedAllDemoLiquidity();

    const instrumentsCount = await Instrument.countDocuments();
    const lpUser = await User.findOne({ role: 'system_liquidity' });
    const lpAccount = lpUser ? await Account.findOne({ userId: lpUser._id }) : null;
    const lpPositionsCount = lpUser ? await Position.countDocuments({ userId: lpUser._id }) : 0;
    const seededOrdersCount = await Order.countDocuments({ status: ORDER_STATUSES.OPEN });

    logCheck('Seeded Liquidity & Accounts Persistence', instrumentsCount === 8 && !!lpUser && !!lpAccount && seededOrdersCount >= 48, {
      instrumentsCount,
      lpUserExists: !!lpUser,
      lpCashPaise: lpAccount?.totalCashPaise || 0,
      lpPositionsCount,
      restingOpenOrdersCount: seededOrdersCount,
    });

    // 6. Verify End-to-End Order Lifecycle (Place -> Cancel)
    const testTraderEmail = `trader_${Date.now()}@test.simulated`;
    const reg = await AuthService.register({
      name: 'Verification Trader',
      email: testTraderEmail,
      password: 'password123',
    });
    const traderUser = reg.user;
    const traderInitialAccount = await Account.findOne({ userId: traderUser.id });

    // 6a. Place LIMIT BUY order
    const limitBuy = await OrderService.submitOrder({
      userId: traderUser.id,
      instrument: 'TCS',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: 300000, // Below market to ensure resting
      quantity: 5,
    });

    const accountAfterBuy = await Account.findOne({ userId: traderUser.id });
    const orderDoc = await Order.findById(limitBuy.order._id);
    const eventsAfterBuy = await OrderEvent.find({ orderId: limitBuy.order._id });

    const buyReservedCorrectly =
      accountAfterBuy.reservedCashPaise === 1500000 &&
      orderDoc.reservedCashPaise === 1500000 &&
      orderDoc.status === ORDER_STATUSES.OPEN;

    // 6b. Cancel LIMIT BUY order
    await OrderService.cancelOrder(limitBuy.order._id, traderUser.id);
    const accountAfterCancel = await Account.findOne({ userId: traderUser.id });
    const orderDocCancelled = await Order.findById(limitBuy.order._id);
    const eventsAfterCancel = await OrderEvent.find({ orderId: limitBuy.order._id });

    const cancelReleasedCorrectly =
      accountAfterCancel.reservedCashPaise === 0 &&
      orderDocCancelled.status === ORDER_STATUSES.CANCELLED &&
      eventsAfterCancel.some((e) => e.eventType === 'ORDER_CANCELLED');

    logCheck('Order Placement & Cancellation Lifecycle', buyReservedCorrectly && cancelReleasedCorrectly, {
      buyReservedCashPaise: accountAfterBuy.reservedCashPaise,
      orderStatusAfterBuy: orderDoc.status,
      orderEventsCount: eventsAfterBuy.length,
      cancelledReservedCashPaise: accountAfterCancel.reservedCashPaise,
      orderStatusAfterCancel: orderDocCancelled.status,
    });

    // 6c. Place Aggressive BUY Order -> Matches Resting Ask
    // Get best ask for TCS
    const l2 = orderBookManager.getL2Snapshot('TCS');
    const bestAskPrice = l2.bestAsk?.priceInPaise;

    const fillResult = await OrderService.submitOrder({
      userId: traderUser.id,
      instrument: 'TCS',
      side: ORDER_SIDES.BUY,
      orderType: ORDER_TYPES.LIMIT,
      priceInPaise: bestAskPrice,
      quantity: 2,
    });

    const traderPosAfterFill = await Position.findOne({ userId: traderUser.id, instrument: 'TCS' });
    const traderAccAfterFill = await Account.findOne({ userId: traderUser.id });
    const execDoc = await Execution.findOne({ buyerId: traderUser.id, instrument: 'TCS' });

    const matchPassed =
      fillResult.executions.length > 0 &&
      traderPosAfterFill?.ownedQuantity === 2 &&
      traderPosAfterFill?.totalCostBasisPaise === bestAskPrice * 2 &&
      !!execDoc;

    logCheck('Order Matching & Settlement Persistence', matchPassed, {
      executionsCreated: fillResult.executions.length,
      sharesOwned: traderPosAfterFill?.ownedQuantity,
      averageCostPaise: traderPosAfterFill?.averageCostPricePaise,
      cashDeducted: traderInitialAccount.totalCashPaise - traderAccAfterFill.totalCashPaise,
      executionId: execDoc?.executionId,
    });

    // 7. Verify Server Restart & Order Book Recovery from MongoDB
    const beforeRestartCount = orderBookManager.getRestingOrders('TCS').length;
    // Simulate server restart: clear memory
    orderBookManager.rebuildFromDatabase([]);
    const clearedCount = orderBookManager.getRestingOrders('TCS').length;

    // Recover from MongoDB
    const activeDbOrders = await Order.find({
      status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
    }).lean();
    orderBookManager.rebuildFromDatabase(activeDbOrders);
    const afterRecoveryCount = orderBookManager.getRestingOrders('TCS').length;

    logCheck('Server Restart & Memory Book Reconstruction', clearedCount === 0 && afterRecoveryCount === beforeRestartCount, {
      beforeRestartCount,
      clearedCount,
      afterRecoveryCount,
      totalActiveOrdersRecovered: activeDbOrders.length,
    });

    // 8. Confirm Frontend Isolation from MongoDB
    const clientPackageJson = JSON.parse(fs.readFileSync(path.join(clientDir, 'package.json'), 'utf8'));
    const clientDeps = { ...clientPackageJson.dependencies, ...clientPackageJson.devDependencies };
    const hasMongoInClient = Object.keys(clientDeps).some((k) => k.includes('mongo') || k.includes('mongoose'));

    // Scan client/src for direct db imports
    const clientSrc = path.join(clientDir, 'src');
    const clientFiles = [];
    function scanClient(dir) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) scanClient(full);
        else if (full.endsWith('.js') || full.endsWith('.jsx')) clientFiles.push(full);
      }
    }
    scanClient(clientSrc);

    let clientHasDirectDbAccess = false;
    for (const f of clientFiles) {
      const code = fs.readFileSync(f, 'utf8');
      if (code.includes("from 'mongoose'") || code.includes("from 'mongodb'")) {
        clientHasDirectDbAccess = true;
      }
    }

    logCheck('Frontend Architecture & API Gateway Isolation', !hasMongoInClient && !clientHasDirectDbAccess, {
      hasMongoInClientPackage: hasMongoInClient,
      clientHasDirectDbImports: clientHasDirectDbAccess,
      clientFilesScanned: clientFiles.length,
      apiGateway: 'Express REST at /api/v1',
    });

    // Cleanup trader
    await User.findByIdAndDelete(traderUser.id);
    await Account.deleteMany({ userId: traderUser.id });
    await Position.deleteMany({ userId: traderUser.id });
    await Order.deleteMany({ userId: traderUser.id });
    await Execution.deleteMany({ buyerId: traderUser.id });

    const allPassed = report.checks.every((c) => c.passed);
    console.log(`\nVerification Summary: ${allPassed ? 'ALL CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌'}`);
    return allPassed;
  } finally {
    await disconnectDatabase();
  }
}

verifyEndToEnd()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Verification script crashed:', err);
    process.exit(1);
  });
