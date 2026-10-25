# TradeFlow Order-Matching Engine Specification

The TradeFlow order-matching engine is a pure, deterministic domain service supporting continuous double-auction mechanics with strict price-time priority.

---

## 1. Core Principles & Order Types

### Limit Orders
- A **Limit BUY** order specifies the maximum price the buyer is willing to pay.
- A **Limit SELL** order specifies the minimum price the seller is willing to accept.
- If no immediate crossing liquidity exists, the limit order rests on the order book.

### Market Orders
- An aggressive order that demands immediate liquidity against existing opposing resting limit orders.
- **Time-in-Force Remainder Policy**: Immediate-Or-Cancel (IOC). If opposing liquidity is insufficient to fulfill the entire requested quantity, available depth is executed, and the unfilled remainder is immediately cancelled and its reservation released. A market order never rests on the book.

---

## 2. Price-Time Priority Rule

Orders are prioritized strictly by price first, and then by arrival time (FIFO):

### Bids (Buy Side)
1. **Price Priority**: Higher limit prices take precedence over lower limit prices. A bid at ₹2,500.50 executes before a bid at ₹2,500.00.
2. **Time Priority**: When multiple bids share the exact same price, the order created earliest (`createdAt` timestamp) executes first.

### Asks (Sell Side)
1. **Price Priority**: Lower limit prices take precedence over higher limit prices. An ask at ₹2,490.00 executes before an ask at ₹2,495.00.
2. **Time Priority**: When multiple asks share the exact same price, the order created earliest executes first.

---

## 3. Crossing Condition and Execution Price Determination

### Crossing Conditions
- An incoming **BUY** crosses resting asks if:
  $$\text{Incoming Buy Limit Price} \ge \text{Resting Ask Limit Price}$$
- An incoming **SELL** crosses resting bids if:
  $$\text{Incoming Sell Limit Price} \le \text{Resting Bid Limit Price}$$

### Deterministic Execution Price Rule
> **Rule:** Execution occurs at the **resting order's price** (the maker's price).

#### Scenario A: Incoming Limit Buy Crosses Lower Resting Ask
- Resting Ask on Book: 10 shares @ **₹2,450.00**
- Incoming Buy Limit: 10 shares @ **₹2,500.00**
- **Match Outcome:**
  - Crossing Condition: $₹2,500.00 \ge ₹2,450.00$ (Valid)
  - Executed Quantity: $\min(10, 10) = 10\text{ shares}$
  - **Execution Price:** **₹2,450.00** (Resting order price!)
  - The buyer reserved ₹2,500.00 per share. Because execution occurred at ₹2,450.00, the buyer receives a **price improvement refund** of ₹50.00 per share (₹500.00 total) credited back to available cash.

#### Scenario B: Incoming Limit Sell Crosses Higher Resting Bid
- Resting Bid on Book: 10 shares @ **₹2,500.00**
- Incoming Sell Limit: 10 shares @ **₹2,480.00**
- **Match Outcome:**
  - Crossing Condition: $₹2,480.00 \le ₹2,500.00$ (Valid)
  - Executed Quantity: 10 shares
  - **Execution Price:** **₹2,500.00** (Resting order price!)
  - The seller receives ₹2,500.00 per share, capturing immediate price improvement.

---

## 4. Multi-Level Fills & Partial Executions

When an incoming aggressive order exceeds the top-of-book quantity, the engine sweeps through multiple resting price levels in sequence:

### Example: Incoming Buy of 25 Shares @ ₹2,500.00
Current Resting Asks:
1. `Ask 1`: 5 shares @ ₹2,480.00 (Created 10:00:00)
2. `Ask 2`: 10 shares @ ₹2,490.00 (Created 10:00:01)
3. `Ask 3`: 15 shares @ ₹2,500.00 (Created 10:00:02)

**Execution Walkthrough:**
- **Match 1**: Fills 5 shares against `Ask 1` @ ₹2,480.00. `Ask 1` becomes `FILLED`. (20 shares remaining on incoming order).
- **Match 2**: Fills 10 shares against `Ask 2` @ ₹2,490.00. `Ask 2` becomes `FILLED`. (10 shares remaining on incoming order).
- **Match 3**: Fills 10 shares against `Ask 3` @ ₹2,500.00. `Ask 3` becomes `PARTIALLY_FILLED` (5 shares remaining on book).
- Incoming Buy: Fully `FILLED` (25 shares).
  $$\text{Weighted Average Execution Price} = \frac{(5 \times 2480) + (10 \times 2490) + (10 \times 2500)}{25} = \text{₹}2,492.00$$
- Three distinct immutable `Execution` records are committed atomically.

---

## 5. Self-Trade Prevention (STP) Policy

To prevent wash trading and artificial volume generation:
- An order can never match against itself (`orderId === counterpartyOrderId`).
- **Policy: Prevent Self-Trade (SKIP)**: If the opposing resting order was placed by the **same user** (`incoming.userId === resting.userId`), the engine skips that resting order and inspects the next eligible counterparty in the queue.
- If only self-owned orders exist on the opposing side, no execution occurs and the incoming limit order rests or market order cancels.

---

## 6. Cash and Share Reservation Accounting

TradeFlow enforces strict double-entry invariants to guarantee accounts cannot go negative or overspend under race conditions:

| Action | Buy Side Accounting | Sell Side Accounting |
|---|---|---|
| **Order Placement** | Atomically reserve: `priceInPaise * quantity`. Cash deducted from `availableCash` into `reservedCash`. | Atomically reserve `quantity` shares. Deducted from `availableQuantity` into `reservedQuantity`. |
| **Execution Match** | Deduct executed notional from `totalCash`. Reduce `reservedCash` by the reserved unit price $\times$ executed quantity. Refund any price improvement. Credit shares to inventory. | Deduct executed shares from owned and reserved shares. Credit executed notional to `totalCash`. Record realized P&L. |
| **Order Cancellation** | Release remaining reservation: deduct `priceInPaise * remainingQty` from `reservedCash`. | Release remaining reservation: deduct `remainingQty` from `reservedQuantity`. |

---

## 7. Crash Recovery & Book Reconstruction

The in-memory working order book is a high-performance representation of durable MongoDB state:
1. When the server process starts (or restarts following an unplanned crash), `orderBookManager.rebuildFromDatabase()` is invoked before accepting incoming HTTP requests.
2. The system queries MongoDB for all orders with status `IN ['OPEN', 'PARTIALLY_FILLED']` and `remainingQuantity > 0`.
3. The in-memory map is completely reconstructed with full price-time queues, ensuring zero order loss across restarts.
