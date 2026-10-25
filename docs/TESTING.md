# TradeFlow Automated Testing Suite

TradeFlow utilizes Vitest and Supertest to validate the matching engine, reservation accounting, request idempotency, and REST API endpoints.

---

## 1. Running the Automated Tests

From the root project directory:
```bash
# Run all backend and integration tests
npm test

# Run tests in watch mode
npm run test:watch --prefix server
```

For zero-configuration test execution, the test suite spins up an embedded in-memory MongoDB replica set (`mongodb-memory-server`) supporting full multi-document transactions out of the box.

---

## 2. Test Suites Overview

### 1. `server/tests/financial.test.js` (Pure Financial Arithmetic)
- `rupeesToPaise`: Verifies conversion of rupee numbers/strings to exact integer paise.
- `paiseToRupees`: Validates 2-decimal formatted rupee string outputs.
- `formatINR`: Tests Indian numbering system formatting (`₹1,23,456.75`).
- `calculateNotionalPaise`: Validates safe integer math and overflow checks.
- `validateTickSize`: Verifies 5-paise tick conformity.
- `calculatePriceImprovementRefund`: Tests price difference refunds on executed limit orders.

### 2. `server/tests/matchingEngine.test.js` (Pure Domain Matching Logic)
- **Zero Liquidity Orders**:
  - BUY limit order with no opposing liquidity becomes `OPEN`.
  - SELL limit order with no opposing liquidity becomes `OPEN`.
- **Order Crossing & Execution**:
  - Crossing limit order executes at resting order's price.
  - Market order matches top-of-book resting limit orders.
  - Full fills and partial fills.
- **Price-Time Priority**:
  - Price priority: Lowest sell price executed first for incoming buy; highest buy price executed first for incoming sell.
  - Time priority: For equal prices, earliest created resting order executes first (FIFO).
  - Non-crossing limit order rests on book without executing.
- **Time-in-Force Remainder Policy**:
  - Unfilled market order remainder cancelled under IOC policy.
- **Self-Trade Prevention (STP)**:
  - Orders belonging to the same user skip crossing to prevent wash trades, executing against third-party liquidity.

### 3. `server/tests/orderService.test.js` (Reservation Accounting & Durable Engine)
- Rejection of BUY orders when available cash is insufficient for reservation.
- Rejection of SELL orders when owned/available shares are insufficient.
- Tick-size violations rejected with validation error.
- Cash reservation on BUY limit order placement and complete release on cancellation.
- Share reservation on SELL limit order placement and release on cancellation.
- Idempotency replay: Repeating submission with identical key returns cached response without duplicate orders or executions.
- Idempotency key collision: Reusing same key with different payload rejected with `409 Conflict`.
- Prevention of cancellation on already filled orders.
- Crash recovery: Reconstructing in-memory order book from persistent MongoDB active orders.

### 4. `server/tests/apiIntegration.test.js` (End-to-End REST API)
- Health endpoints (`/api/health`, `/api/health/database`).
- User registration and login token issuance.
- Authenticated profile inspection (`/api/v1/auth/me`).
- Instrument catalogue retrieval (`/api/v1/instruments`).
- Submitting limit orders and verifying Level 2 book updates (`/api/v1/orderbook/:symbol`).
- Querying orders with pagination and filters (`/api/v1/orders`).
- Private data protection: Ensuring User B cannot cancel or access User A's private orders (`403 Forbidden`).
- Successful order cancellation via API and order book removal.
- Portfolio summary and accounting invariant reconciliation.

---

## 3. Test Results Summary

```
Test Files  4 passed (4)
     Tests  41 passed (41)
  Duration  4.67s
```
All 41 tests pass consistently with 100% assertions satisfied.
