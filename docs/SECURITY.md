# TradeFlow Security & Reliability Architecture

This document describes the defensive measures, concurrency controls, validation barriers, and known architectural limitations of TradeFlow.

---

## 1. Authentication & Token Management

- **Password Hashing**: Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` with a cost factor of 10 rounds.
- **JWT Authentication**: Authenticated sessions utilize signed JSON Web Tokens (JWT) signed with a minimum 32-character secret (`JWT_SECRET`) expiring after 7 days.
- **Dual Transport (HttpOnly Cookie + Bearer Token)**:
  - Browser sessions store the JWT in an `HttpOnly`, `SameSite=Lax` cookie, neutralizing client-side Cross-Site Scripting (XSS) token theft.
  - API consumers and programmatic clients can pass the token via standard `Authorization: Bearer <token>` headers.
- **Ownership Verification**: Endpoints touching private accounts, portfolios, orders, or cancellations extract the identity exclusively from the validated JWT token (`req.user.id`), never trusting client-supplied user identifiers.

---

## 2. Input Validation & Fail-Fast Sanitation

- **Zod Schema Validation**: All incoming requests (bodies, query parameters, and routes) are validated by strict Zod schemas before reaching any controller or service.
- **Financial Value Sanitation**:
  - Quantities must be safe positive integers ($> 0$).
  - Prices must be positive integers conforming to the instrument's tick size (5 paise).
  - Floating point numbers are strictly rejected in the domain engine.

---

## 3. Rate Limiting & Denial of Service Protection

TradeFlow implements layered rate limiters using `express-rate-limit`:
1. **Authentication Limiter**: Max 30 attempts per 15-minute window on `/api/v1/auth/login` and `/register` to prevent credential brute-forcing.
2. **Trading Limiter**: Max 120 submissions and cancellations per minute on `/api/v1/orders` to prevent order spamming or resource exhaustion.
3. **General API Limiter**: Max 300 requests per minute across general queries.

---

## 4. Idempotency & Safe Request Retries

Network retries or double-clicks on the frontend order ticket are protected via the `Idempotency-Key` mechanism:
- Clients submit an optional `Idempotency-Key` header with order placement requests.
- The server generates a SHA-256 fingerprint of the request payload `{ instrument, side, orderType, priceInPaise, quantity }`.
- If an idempotency record exists for the `(userId, key)` pair:
  - **Identical Fingerprint**: Returns the previously recorded response without re-executing or creating duplicate reservations.
  - **Mismatched Fingerprint**: Rejects the request with `409 Conflict` (`IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`).
- Idempotency records are automatically pruned after 24 hours via MongoDB TTL indexes.

---

## 5. Database Transactions & Concurrency Safety

- **Atomic Multi-Document Transactions**:
  Order creation, reservation holds, position adjustments, execution recording, and account balance deductions run inside a single MongoDB transaction session.
- **Optimistic Concurrency & Pre-Condition Filters**:
  Cash and share reservations use atomic conditional update queries:
  ```javascript
  // Available cash check enforced at the database driver level
  Account.findOneAndUpdate({
    userId,
    $expr: { $gte: [{ $subtract: ['$totalCashPaise', '$reservedCashPaise'] }, requiredCashReservation] }
  }, {
    $inc: { reservedCashPaise: requiredCashReservation }
  });
  ```
  If two requests arrive simultaneously attempting to spend the same cash, exactly one succeeds and the other fails with `InsufficientFundsError`.
- **Cancellation Race Protection**:
  If an order fills at the exact moment a cancellation request arrives, the conditional update query `{ _id, status: { $in: ['OPEN', 'PARTIALLY_FILLED'] } }` returns null, preventing an already-filled order from being cancelled.

---

## 6. Information Leakage Prevention

- **Uniform Authentication Errors**: Login failures return a generic `"Invalid email or password"` message to prevent account enumeration.
- **Centralized Error Handling**: In production mode (`NODE_ENV=production`), internal stack traces and database errors are sanitized into structured error responses (`{ status: 'error', code, message }`).
- **Private Data Partitioning**: Order books aggregate depth by price level without exposing the user IDs or account identities of resting order makers.

---

## 7. Known Limitations

1. **Simulated Market Environment**:
   All trading is simulated. No connection exists to live clearing houses, exchanges (NSE/BSE), or real depositories (NSDL/CDSL).
2. **Single-Node Matching Engine**:
   The in-memory order book runs in a single Node.js process. Scaling horizontally across multiple nodes would require per-instrument partition routing (e.g. Kafka or Redis cluster) to ensure sequential order processing per stock symbol.
3. **MongoDB Replica Set Dependency for Transactions**:
   Multi-document transactions require a MongoDB deployment with replica set capability (such as MongoDB Atlas or local replica sets). A fallback execution path is provided for standalone development databases.
