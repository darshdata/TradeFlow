# TradeFlow Architecture

TradeFlow is a simulated stock-order management and execution platform engineered for high financial correctness, deterministic price-time priority matching, and strict ledger consistency.

---

## 1. End-to-End Execution Flow

When a user submits an order in the frontend trading terminal, the system executes the following deterministic lifecycle:

```
┌──────────────────┐
│  Browser / React │
└────────┬─────────┘
         │ 1. POST /api/v1/orders (with Idempotency-Key)
         ▼
┌──────────────────┐
│   Express App    │ ── 2. CORS Allowlist, Body Parsing, Rate Limiting (120 req/min)
└────────┬─────────┘
         │ 3. Authenticate JWT (HttpOnly Cookie / Bearer Header)
         ▼
┌──────────────────┐
│  Zod Validator   │ ── 4. Validates instrument, side, orderType, positive qty, tick conformity
└────────┬─────────┘
         │ 5. Validated Request Object
         ▼
┌──────────────────┐
│ Order Controller │ ── 6. Extracts userId from token, forwards to OrderService
└────────┬─────────┘
         │ 7. Begins Transactional Pipeline
         ▼
┌──────────────────┐
│  Order Service   │
└────────┬─────────┘
         ├─► 8. Check Idempotency Record (SHA-256 fingerprint matching)
         ├─► 9. Reservation Accounting:
         │      • BUY: Atomically reserves cash in Account (limit notional or collar capped market notional)
         │      • SELL: Atomically reserves available shares in Position
         ├─► 10. Persist Order (Status: NEW) & Append-Only OrderEvents (ORDER_ACCEPTED, RESERVATION_CREATED)
         ├─► 11. Run Pure Matching Engine:
         │       • Match incoming aggressive order against in-memory resting book
         │       • Apply price-time priority (Bids: DESC, Asks: ASC; FIFO for equal prices)
         │       • Apply Self-Trade Prevention (prevent wash trades against own orders)
         │       • Price determination: Execution occurs at resting order's price
         ├─► 12. Transactional Persistence:
         │       • Write immutable Execution records
         │       • Update Buyer cash and share holdings (weighted avg cost basis)
         │       • Update Seller cash credit and share deductions (compute realized P&L)
         │       • Update resting orders in MongoDB & in-memory OrderBook
         │       • Append fill events (ORDER_PARTIALLY_FILLED, ORDER_FILLED)
         ├─► 13. Finalize Aggressive Order:
         │       • If Limit: rest unfilled portion on OrderBook & MongoDB (status: OPEN or PARTIALLY_FILLED)
         │       • If Market: execute IOC policy; cancel unfilled remainder and refund unspent reservation
         └─► 14. Save Idempotency Record & Commit MongoDB Transaction
         │
         ▼
┌──────────────────┐
│ Refreshed State  │ ── 15. Return 201 Created with Order & Executions
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Frontend Client │ ── 16. Refresh Account Balances, Positions, Orders, and Live Order Book
└──────────────────┘
```

---

## 2. Separation of Concerns & Module Ownership

The codebase enforces strict separation of concerns to ensure testability, auditable accounting, and architectural cleanlines:

| Module | Location | Responsibilities | Why Divided This Way |
|---|---|---|---|
| **Matching Engine** | `server/src/engine/matchingEngine.js` | Pure matching algorithm, price-time sorting, crossing condition, fill quantity calculation, resting price rule, self-trade prevention. | Zero dependencies on Express, HTTP, or MongoDB. 100% deterministic, unit-testable in milliseconds. |
| **Financial Utilities** | `server/src/engine/financial.js` | Integer paise conversion, safe integer bounds, tick-size rules, price-improvement refund calculation. | Eliminates JavaScript floating-point errors (`0.1 + 0.2 !== 0.3`). Guarantees financial math correctness across the entire backend. |
| **Working Order Book** | `server/src/engine/orderBook.js` | In-memory Level 2 order book manager, L2 snapshot aggregation (spread, best bid, best ask, volume), crash recovery from MongoDB. | Fast O(1) resting order lookup while treating MongoDB as the durable source of truth. |
| **Order Service** | `server/src/services/orderService.js` | Orchestrates order placement, reservation accounting, idempotency replay, transactions, cancellation, and audit trail events. | Keeps business rules out of Express controllers. Encapsulates all transactional invariants in one testable service. |
| **Portfolio Service** | `server/src/services/portfolioService.js` | Computes account totals, marked asset valuations, cost basis, unrealized/realized P&L, and invariant reconciliation checks. | Prevents business calculations in React. Authoritative source of portfolio values. |
| **Controllers** | `server/src/controllers/` | HTTP request/response handling, status codes, query extraction, invoking services. | Kept thin (10–30 lines per handler). Do not contain financial or matching logic. |
| **Validators** | `server/src/validators/` | Zod schema validation for input sanitization, body parsing, and tick size constraints. | Fails fast before hitting services or databases. |
| **Middleware** | `server/src/middleware/` | JWT authentication, rate limiting, error normalization, security sanitization. | Centralized cross-cutting concerns. |
| **Database Models** | `server/src/models/` | Mongoose schemas with compound indexes, pre-validation invariant checks, and timestamps. | Guarantees database-level schema constraints and query performance. |

---

## 3. Concurrency and Atomicity Strategy

1. **MongoDB Multi-Document Transactions**:
   All state changes triggered by an order submission or cancellation (Order, Account, Position, Execution, OrderEvent) execute inside a MongoDB transaction (`withTransaction`).
2. **Conditional Atomic Updates**:
   To prevent double-spending or overselling under concurrent requests, reservations utilize atomic updates with precondition queries:
   ```javascript
   Account.findOneAndUpdate({
     userId,
     $expr: { $gte: [{ $subtract: ['$totalCashPaise', '$reservedCashPaise'] }, requiredReservation] }
   }, {
     $inc: { reservedCashPaise: requiredReservation }
   });
   ```
3. **Idempotency Protection**:
   Order submissions accept an optional `Idempotency-Key`. Identical retries with matching SHA-256 payload fingerprints return the recorded response without executing duplicate trades or creating duplicate reservations.
4. **Crash Recovery**:
   On server initialization, `orderBookManager.rebuildFromDatabase()` loads all active persistent orders (`OPEN` and `PARTIALLY_FILLED`) and reconstructs the in-memory order books.
