# TradeFlow Data Model & Database Design

TradeFlow utilizes MongoDB with Mongoose to provide durable, indexed, and transactionally consistent storage for orders, accounts, holdings, and immutable execution records.

---

## 1. Entity-Relationship Overview

```
               ┌──────────────┐
               │     User     │
               └──────┬───────┘
                      │ 1:1
                      ▼
               ┌──────────────┐
               │   Account    │ (Cash Ledger & Reservations)
               └──────────────┘
                      │
        ┌─────────────┼──────────────┐
        │ 1:N         │ 1:N          │ 1:N
        ▼             ▼              ▼
 ┌───────────┐ ┌───────────┐ ┌───────────────┐
 │ Position  │ │   Order   │ │ OrderEvent    │ (Append-Only Audit)
 └───────────┘ └─────┬─────┘ └───────────────┘
                     │ 1:N
                     ▼
              ┌──────────────┐
              │  Execution   │ (Immutable Trades)
              └──────────────┘
```

---

## 2. Models Specification

### 1. `User`
Manages trader identity, authentication credentials, and system roles.
- `name` (String, required): Full name of the trader.
- `email` (String, unique, indexed, lowercase): Normalized login email.
- `passwordHash` (String, required): Bcrypt-hashed password (salt factor 10).
- `role` (String, enum: `['user', 'system_liquidity', 'admin']`): User access role.
- **Indexes**: `{ email: 1 }` (unique).

### 2. `Account` (Cash Ledger)
Tracks user total cash balances and active order reservations.
- `userId` (ObjectId, ref `User`, unique, indexed): Associated account owner.
- `totalCashPaise` (Number, integer >= 0, default: 10,000,000 paise / ₹1,00,000): Total cash balance.
- `reservedCashPaise` (Number, integer >= 0, default: 0): Cash committed to active open buy orders.
- `currency` (String, default: `'INR'`).
- **Virtual**: `availableCashPaise` = `totalCashPaise - reservedCashPaise`.
- **Database Invariant**: `totalCashPaise >= reservedCashPaise >= 0`. Enforced via schema pre-validation hook.

### 3. `Instrument`
Catalogue of tradable stocks and simulated reference pricing.
- `symbol` (String, uppercase, unique, indexed, e.g. `'RELIANCE'`): Stock ticker.
- `displayName` (String, required): Official company name.
- `exchange` (String, default: `'NSE (Simulated)'`).
- `tickSizePaise` (Number, default: 5 / ₹0.05): Smallest allowed price increment in paise.
- `simulatedReferencePricePaise` (Number): Base reference price for simulation.
- `lastPricePaise` (Number): Price of the most recent execution match.
- `dayHighPaise`, `dayLowPaise` (Number): Session high and low prices.
- `tradable` (Boolean, default: true).

### 4. `Position`
Tracks user inventory in a specific stock, cost basis, and realized P&L.
- `userId` (ObjectId, ref `User`, indexed).
- `instrument` (String, uppercase, indexed).
- `ownedQuantity` (Number, integer >= 0): Total shares held.
- `reservedQuantity` (Number, integer >= 0): Shares committed to active open sell orders.
- `averageCostPricePaise` (Number): Weighted average purchase price.
- `totalCostBasisPaise` (Number): Cumulative cost of currently owned shares.
- `realizedPnlPaise` (Number): Cumulative realized profit or loss from closed trades.
- **Virtual**: `availableQuantity` = `ownedQuantity - reservedQuantity`.
- **Indexes**: Compound unique `{ userId: 1, instrument: 1 }`.
- **Database Invariant**: `ownedQuantity >= reservedQuantity >= 0`.

### 5. `Order`
Lifecycle record of a market or limit order.
- `orderId` (String, unique, indexed, e.g. `'ORD-20261025-ABCD'`): Human-readable reference.
- `userId` (ObjectId, ref `User`, indexed).
- `instrument` (String, uppercase, indexed).
- `side` (String, enum: `['BUY', 'SELL']`).
- `orderType` (String, enum: `['LIMIT', 'MARKET']`).
- `priceInPaise` (Number, integer >= 0): Limit price in paise (0 for MARKET).
- `quantity` (Number, integer > 0): Original order quantity.
- `filledQuantity` (Number, integer >= 0, default: 0): Executed quantity.
- `remainingQuantity` (Number, integer >= 0): Unfilled quantity.
- `reservedCashPaise` (Number, default: 0): Active cash reservation for buy order.
- `reservedQuantity` (Number, default: 0): Active share reservation for sell order.
- `averageExecutionPriceInPaise` (Number, default: 0): Weighted average execution price.
- `status` (String, enum: `['NEW', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED']`).
- `idempotencyKey` (String, indexed, sparse).
- **Indexes**: `{ userId: 1, createdAt: -1 }`, `{ instrument: 1, status: 1 }`.
- **Database Invariant**: `filledQuantity + remainingQuantity === quantity`.

### 6. `Execution`
Immutable record of a completed trade match between two counterparties.
- `executionId` (String, unique, indexed, e.g. `'EXEC_1729851234_abc1'`).
- `instrument` (String, uppercase, indexed).
- `buyOrderId` (ObjectId, ref `Order`, indexed).
- `sellOrderId` (ObjectId, ref `Order`, indexed).
- `buyerId` (ObjectId, ref `User`, indexed).
- `sellerId` (ObjectId, ref `User`, indexed).
- `priceInPaise` (Number, integer > 0): Execution price (determined by resting order).
- `quantity` (Number, integer > 0): Number of shares matched.
- `notionalPaise` (Number, integer > 0): `priceInPaise * quantity`.
- `takerSide` (String, enum: `['BUY', 'SELL']`): Which side was aggressive.
- `timestamp` (Date, default: Date.now, indexed).
- **Indexes**: `{ instrument: 1, timestamp: -1 }`, `{ buyerId: 1, timestamp: -1 }`, `{ sellerId: 1, timestamp: -1 }`.

### 7. `OrderEvent`
Append-only audit trail capturing every state transition and reservation change.
- `orderId` (ObjectId, ref `Order`, indexed).
- `userId` (ObjectId, ref `User`, indexed).
- `eventType` (String, enum: `['ORDER_ACCEPTED', 'ORDER_OPENED', 'ORDER_PARTIALLY_FILLED', 'ORDER_FILLED', 'ORDER_CANCELLED', 'ORDER_REJECTED', 'RESERVATION_CREATED', 'RESERVATION_RELEASED']`).
- `metadata` (Mixed): Contextual parameters (prices, quantities, cancellation reason).
- `timestamp` (Date, default: Date.now, indexed).
- **Guarantees**: Never modified or deleted by application code.

### 8. `IdempotencyRecord`
Prevents duplicate processing of repeated client requests.
- `key` (String, indexed).
- `userId` (ObjectId, ref `User`, indexed).
- `operation` (String, e.g. `'SUBMIT_ORDER'`).
- `requestFingerprint` (String): SHA-256 hash of payload.
- `responseBody` (Mixed): Cached response data.
- `statusCode` (Number): HTTP status code.
- **Indexes**: Compound unique `{ key: 1, userId: 1 }`, TTL index `{ createdAt: 1, expireAfterSeconds: 86400 }` (auto-cleans after 24h).
