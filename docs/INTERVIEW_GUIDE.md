# TradeFlow Fintech Engineering Interview Guide

This guide prepares a 1–2 YOE software engineer for technical interviews at fintech companies (such as Paytm Money, Zerodha, Groww, AngelOne) based on the TradeFlow codebase.

---

## 1. Project Explanations

### Non-Technical Explanation (For a Recruiter or Family Member)
> "TradeFlow is a simulated stock exchange and trading platform. Just like when you buy a share of Reliance on an app, there needs to be an automated matching system that connects your buy request with someone else's sell request at the fair price. TradeFlow builds that matching engine and account ledger from scratch. It handles user balances, ensures users cannot spend money they don't have, matches orders based on who offered the best price first, and records permanent audit trails of every trade."

### 30-Second Elevator Pitch
> "I built TradeFlow, a full-stack simulated order execution platform featuring a deterministic order-matching engine and transactional reservation accounting. Built with Node.js, Express, MongoDB, and React, it enforces price-time priority (FIFO), resting price execution, self-trade prevention, and request idempotency. It eliminates floating-point errors by using integer paise representation and guarantees ledger consistency using MongoDB transactions with crash recovery."

### 2-Minute Technical Introduction
> "TradeFlow is an end-to-end stock order management and matching system designed to replicate the core mechanics of an electronic exchange. 
> 
> The core problem I tackled was ensuring financial consistency under concurrent trading. First, I decoupled the matching engine into a pure, deterministic domain module that enforces price-time priority without framework dependencies. When crossing orders match, execution occurs at the resting order's price, and price improvement differences are automatically refunded.
> 
> Second, I implemented a double-entry reservation accounting system. When a buyer submits a limit order, the maximum cash obligation is atomically reserved. When matched, only the actual executed notional is deducted, and inventory is credited using weighted average cost basis. 
> 
> Third, I addressed system reliability: order submissions support SHA-256 idempotency fingerprinting to prevent double execution on network retries. All state mutations run inside MongoDB replica-set transactions with conditional atomic preconditions. In-memory order books are reconstructed automatically from persistent state on server restart. 
> 
> The frontend is a dark fintech trading terminal with Level 2 order book depth visualization, quick presets, confirmation dialogs, and comprehensive order lifecycle auditing."

---

## 2. Walkthrough of One Complete Order Submission

Let's trace: **User A places a BUY Limit Order for 10 shares of RELIANCE @ ₹2,500.00**:

1. **Client Action**: User selects RELIANCE on the order ticket, enters Limit Price `2500.00`, Quantity `10`, and clicks Submit.
2. **Pre-Flight Validation**: React client checks available cash $\ge \text{₹}25,000.00$ and confirms price adheres to 5 paise tick size.
3. **HTTP Dispatch**: `POST /api/v1/orders` sent with `Idempotency-Key: ORD_REQ_...`.
4. **Middleware Pipeline**:
   - `cors` verifies origin allowlist.
   - `authLimiter` checks rate limit.
   - `authenticate` verifies JWT from HttpOnly cookie and binds `req.user`.
   - `validate(createOrderSchema)` parses body with Zod, converting ₹2,500.00 to `250000` integer paise.
5. **Idempotency Gate**: Server hashes payload with SHA-256. If a record matches for this user and key, cached response is returned immediately.
6. **Transaction Start**: `session.startTransaction()`.
7. **Reservation Hold**: `Account.findOneAndUpdate` atomically increments `reservedCashPaise` by 2,500,000 paise with precondition `availableCash >= 2,500,000`.
8. **Order Created**: Order saved with status `NEW`. Events `ORDER_ACCEPTED` and `RESERVATION_CREATED` appended to `OrderEvent`.
9. **Matching Engine**: In-memory resting asks for RELIANCE are sorted by price ascending, then creation time ascending.
   - Suppose Seller B has a resting ask of 10 shares @ ₹2,480.00.
   - Crossing condition met: $250000 \ge 248000$.
   - Execution price is resting price: **₹2,480.00** (248000 paise).
   - Quantity matched: $\min(10, 10) = 10\text{ shares}$.
10. **Ledger Updates**:
    - Buyer Account: `totalCashPaise` decreased by executed notional (₹24,800.00); `reservedCashPaise` decreased by reserved notional (₹25,000.00). Buyer automatically receives ₹200.00 price improvement refund in available cash.
    - Buyer Position: 10 shares credited with average cost ₹2,480.00.
    - Seller Account: `totalCashPaise` credited by ₹24,800.00.
    - Seller Position: 10 shares deducted from owned and reserved inventory; realized P&L recorded.
    - Execution Record: Saved with ID `EXEC_...`.
    - Resting Order: Status set to `FILLED`.
    - Incoming Order: Status set to `FILLED`, average execution price recorded as 248000 paise.
11. **Transaction Commit**: `session.commitTransaction()`.
12. **In-Memory Book Updated**: Resting ask removed from `orderBookManager`.
13. **Idempotency Record Saved**: Result cached for 24h.
14. **HTTP 201 Response**: Returned to client with filled order and execution matches.
15. **UI Refresh**: Client re-fetches account cash, positions, and live order book.

---

## 3. What is Simulated vs. What is Genuinely Implemented

| Component | Genuine Implementation | Simulated Aspect |
|---|---|---|
| **Matching Engine** | Real deterministic price-time priority algorithm matching real counterparties. | Executions match simulated market participants instead of live NSE/BSE brokers. |
| **Financial Ledger** | True double-entry reservation accounting and atomic balance locks. | Balances represent simulated paper money, not fiat bank currency. |
| **Database Persistence** | Real MongoDB collections with multi-document ACID transactions and indexes. | Runs on local replica set or Atlas cluster. |
| **Idempotency** | Real SHA-256 fingerprinting and replay protection. | N/A (Fully production-grade implementation). |
| **Order Book** | Real aggregated Level 2 depth computed from active database orders. | Order book depth reflects TradeFlow platform orders only. |
| **Price Feeds** | Real persistent stock documents updated by execution matches. | Base reference prices seeded from realistic NSE market values. |

---

## 4. 35 Technical Interview Questions & Answers

### Financial Precision & Unit Representation
**Q1: Why did you avoid JavaScript floating-point numbers for prices and balances?**  
*Answer:* JavaScript numbers follow IEEE 754 double-precision floats, where binary fractions cannot accurately represent decimal fractions (e.g., `0.1 + 0.2 === 0.30000000000000004`). In financial systems, rounding errors compound into money leakage. TradeFlow represents all monetary values and prices as integer paise ($1\text{ INR} = 100\text{ paise}$). Integer arithmetic in JavaScript is exact up to `Number.MAX_SAFE_INTEGER` ($9 \times 10^{15}$ paise or ₹90,000 Crore), guaranteed by `Number.isSafeInteger()`.

**Q2: How do you format currency without losing precision?**  
*Answer:* Integer paise is divided by 100 via integer division (`Math.floor(absPaise / 100)`) for rupees and modulo (`absPaise % 100`) for the paise remainder. The remainder is padded to 2 digits (`padStart(2, '0')`), and the integer rupee string is formatted using Indian numbering system comma grouping (e.g., `₹1,23,456.75`).

**Q3: What is a tick size, and how is it validated?**  
*Answer:* A tick size is the minimum allowable price variation for an instrument. On Indian exchanges, this is typically ₹0.05 (5 paise). TradeFlow validates that `priceInPaise % tickSizePaise === 0`. If a user attempts to submit an order with a price like ₹2,500.02, it is rejected with a validation error before matching.

---

### Matching Engine Mechanics
**Q4: How does price-time priority work in your engine?**  
*Answer:* Bids are sorted by price descending (highest willing buyer first) and Asks are sorted by price ascending (lowest willing seller first). When multiple orders exist at the identical price level, they are ordered by creation timestamp ascending (FIFO). This guarantees fair queue priority.

**Q5: What is the deterministic execution price rule in TradeFlow?**  
*Answer:* Execution occurs at the **resting order's price** (the maker's price). If an aggressive buyer submits a limit order at ₹2,500.00 that crosses a resting ask at ₹2,450.00, the trade executes at ₹2,450.00. The buyer is rewarded for crossing liquidity, and the unspent ₹50.00 reservation is refunded.

**Q6: How are partial fills handled?**  
*Answer:* When an incoming order matches a resting order with smaller quantity, the match quantity is $\min(\text{incoming.remaining}, \text{resting.remaining})$. The resting order status transitions to `FILLED` (remaining = 0), while the incoming order transitions to `PARTIALLY_FILLED` (remaining > 0) and continues matching against subsequent orders in the queue.

**Q7: What happens to a market order if there is insufficient liquidity?**  
*Answer:* TradeFlow implements an Immediate-Or-Cancel (IOC) remainder policy. The market order executes against whatever depth exists; any unfilled quantity is cancelled immediately, and unspent cash or share reservations are refunded. A market order is never allowed to rest on the book.

**Q8: What is Self-Trade Prevention (STP) and why is it necessary?**  
*Answer:* Self-trading occurs when an entity matches against its own orders, creating artificial volume (wash trading) and distorting market prices. TradeFlow implements a `SKIP` policy: if an incoming order crosses an opposing order with `incoming.userId === resting.userId`, the engine skips that order and evaluates the next counterparty.

---

### Reservation Accounting & Invariants
**Q9: What is reservation accounting and why not deduct cash immediately upon order placement?**  
*Answer:* A limit order might rest on the book for minutes or days before executing, or it might be cancelled. Deducting cash into an investment position before an execution occurs would distort total portfolio value and cost basis. Instead, cash is moved from `availableCash` to `reservedCash`. When filled, actual executed notional is deducted from total cash, and remaining reservations are released upon cancellation.

**Q10: What accounting invariants does TradeFlow enforce?**  
*Answer:*
1. $\text{Available Cash} = \text{Total Cash} - \text{Reserved Cash} \ge 0$.
2. $\text{Available Shares} = \text{Owned Shares} - \text{Reserved Shares} \ge 0$.
3. $\text{Original Quantity} = \text{Filled Quantity} + \text{Remaining Quantity}$.
4. $\text{Total Portfolio Value} = \text{Total Cash} + \sum (\text{Owned Quantity} \times \text{Current Price})$.

**Q11: How do you prevent a market BUY order from exceeding available cash?**  
*Answer:* A market order has no fixed limit price. If matched against deep asks during volatility, it could exhaust the user's funds. TradeFlow calculates a price collar (top-of-book best ask $+ 5\%$ buffer) to determine a maximum reservation ceiling. If the user does not have enough cash for this ceiling, the order is rejected.

---

### Concurrency & Database Transactions
**Q12: How do you prevent double-spending if two orders are submitted simultaneously?**  
*Answer:* We combine two layers of defense:
1. All mutations execute inside a multi-document MongoDB transaction.
2. The reservation query uses an atomic conditional filter:
   `{ userId, $expr: { $gte: [{ $subtract: ['$totalCashPaise', '$reservedCashPaise'] }, required] } }`.
   If another thread modified the balance concurrently, the atomic query matches zero documents, immediately throwing `InsufficientFundsError`.

**Q13: How do you handle race conditions where an order is cancelled at the exact moment it fills?**  
*Answer:* Cancellation queries conditionally update: `{ _id, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } }`. If the matching engine fills the order first and commits status `FILLED`, the cancellation query updates zero documents and fails gracefully with `409 Conflict ('Order status changed')`.

**Q14: Why do you need a MongoDB replica set for local development?**  
*Answer:* Standalone MongoDB instances do not support multi-document ACID transactions. In TradeFlow, we use `mongodb-memory-server` configured with `MongoMemoryReplSet` for local development and testing, ensuring developers can run genuine transactions without setting up external clusters.

---

### Request Idempotency
**Q15: How does TradeFlow implement idempotency?**  
*Answer:* Clients supply an `Idempotency-Key` header. The server creates a SHA-256 hash of the order payload `{ instrument, side, orderType, priceInPaise, quantity }`. It looks up `IdempotencyRecord` scoped to `(userId, key)`. If the hash matches, it replays the recorded JSON response. If the key was reused with a different payload, it returns `409 Conflict`.

**Q16: Why scope the idempotency key to the user ID?**  
*Answer:* If keys were globally scoped, User A could accidentally or maliciously submit a UUID generated by User B, blocking User B's order or leaking information. Scoping to `(key, userId)` ensures complete tenant isolation.

---

### Failure Recovery & Architecture
**Q17: If the Node.js server crashes, how is the order book recovered?**  
*Answer:* The in-memory order book is a transient working cache; MongoDB is the durable source of truth. On startup, `orderBookManager.rebuildFromDatabase()` queries all orders with status `IN ['OPEN', 'PARTIALLY_FILLED']` and rebuilds the price-time book before accepting API requests.

**Q18: Why is the append-only `OrderEvent` model important?**  
*Answer:* Financial systems require non-repudiation and complete auditability. If an order transitions `NEW -> OPEN -> PARTIALLY_FILLED -> FILLED`, mutating the order document overwrites prior states. `OrderEvent` records immutable, timestamped snapshots (`ORDER_ACCEPTED`, `RESERVATION_CREATED`, `ORDER_FILLED`) so auditors can reconstruct the exact timeline.

**Q19: How would you scale TradeFlow horizontally?**  
*Answer:* Because order matching for a single stock must be strictly sequential (to enforce price-time priority without race conditions), we would partition order traffic by instrument symbol using a distributed message broker like Kafka. Each symbol's partition is consumed by a designated matching engine worker.

---

## 5. Three Realistic Debugging Scenarios

### Scenario 1: A user reports available cash is lower than expected after cancelling an order
- **Investigation**: Check `Account` document: verify `totalCashPaise` and `reservedCashPaise`. Query `OrderEvent` collection for the order ID.
- **Root Cause**: Check if the order was partially filled before cancellation. A partial fill consumes part of the reserved cash into owned shares; only the remaining quantity's reservation is released upon cancellation.
- **Verification**: Run `PortfolioService.getSummary()` which includes `audit.sumActiveBuyReservations` to confirm active open orders match recorded reservations.

### Scenario 2: Two concurrent buy orders cause a race condition
- **Investigation**: Inspect server logs for `INSUFFICIENT_FUNDS` errors and MongoDB transaction rollback warnings.
- **Root Cause**: Two requests were received within 5ms for an account with ₹10,000 available cash. Order 1 required ₹8,000; Order 2 required ₹8,000.
- **Expected System Behavior**: The atomic conditional update ensures exactly one order reserves funds and commits; the second order receives a clean rejection, maintaining the invariant that available cash never drops below zero.

### Scenario 3: Memory book divergence from database after rapid restarts
- **Investigation**: Check Level 2 order book snapshot against `Order.find({ status: 'OPEN' })`.
- **Root Cause**: If the process crashed before transaction commit, uncommitted orders should not be in the database.
- **Resolution**: `rebuildFromDatabase()` re-queries only committed database records on restart, discarding any uncommitted in-memory states.
