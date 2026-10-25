# TradeFlow REST API Specification

Version: `v1`  
Base URL: `http://localhost:5002/api/v1`

---

## 1. Authentication & Headers

TradeFlow supports dual-mode authentication:
1. **HttpOnly Cookie**: Automatically set as `token` upon registration or login.
2. **Bearer Token**: Provided via header: `Authorization: Bearer <JWT_TOKEN>`.

### Common Headers
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (optional if cookie is present)
- `Idempotency-Key: <unique-uuid-or-string>` (optional for order submissions)

### Error Response Format
All error responses adhere to a consistent JSON structure:
```json
{
  "status": "error",
  "code": "INSUFFICIENT_FUNDS",
  "message": "Insufficient available cash to reserve 2500000 paise",
  "details": null
}
```

---

## 2. Authentication Endpoints

### `POST /api/v1/auth/register`
Creates a new trader account and auto-grants ₹1,00,000 initial simulated cash balance.

**Request Body:**
```json
{
  "name": "Rohan Sharma",
  "email": "rohan@example.com",
  "password": "Password123!"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "671b56a31234567890abcdef",
      "name": "Rohan Sharma",
      "email": "rohan@example.com",
      "role": "user"
    },
    "account": {
      "totalCashPaise": 10000000,
      "reservedCashPaise": 0,
      "availableCashPaise": 10000000,
      "currency": "INR"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### `POST /api/v1/auth/login`
Authenticates existing credentials.

**Request Body:**
```json
{
  "email": "rohan@example.com",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "user": { "id": "...", "name": "Rohan Sharma", "email": "rohan@example.com" },
    "account": { "totalCashPaise": 10000000, "availableCashPaise": 10000000 },
    "token": "eyJhbGci..."
  }
}
```

---

### `POST /api/v1/auth/logout`
Clears authentication cookie and session.

---

### `GET /api/v1/auth/me`
Returns profile and live cash balance of currently authenticated user.

---

## 3. Instruments Endpoints

### `GET /api/v1/instruments`
Returns the catalogue of tradable simulated stocks.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "instruments": [
      {
        "symbol": "RELIANCE",
        "displayName": "Reliance Industries Ltd.",
        "exchange": "NSE (Simulated)",
        "tickSizePaise": 5,
        "simulatedReferencePricePaise": 250000,
        "lastPricePaise": 250000,
        "dayHighPaise": 252500,
        "dayLowPaise": 248000,
        "tradable": true
      }
    ]
  }
}
```

---

## 4. Trading & Order Endpoints

### `POST /api/v1/orders`
Submits an aggressive market or limit order. Runs through transactional reservation accounting and deterministic matching.

**Headers:**
- `Idempotency-Key: ORD_REQ_1729851234_abc` (optional, recommended)

**Request Body (Limit Order):**
```json
{
  "instrument": "RELIANCE",
  "side": "BUY",
  "orderType": "LIMIT",
  "priceInPaise": 249500,
  "quantity": 10
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "order": {
      "orderId": "ORD-20261025-A1B2C3",
      "instrument": "RELIANCE",
      "side": "BUY",
      "orderType": "LIMIT",
      "priceInPaise": 249500,
      "quantity": 10,
      "filledQuantity": 10,
      "remainingQuantity": 0,
      "averageExecutionPriceInPaise": 249000,
      "status": "FILLED",
      "createdAt": "2026-10-25T14:30:00.000Z"
    },
    "executions": [
      {
        "executionId": "EXEC_1729851234_4f3a",
        "instrument": "RELIANCE",
        "priceInPaise": 249000,
        "quantity": 10,
        "notionalPaise": 2490000,
        "takerSide": "BUY",
        "timestamp": "2026-10-25T14:30:00.000Z"
      }
    ]
  }
}
```

---

### `GET /api/v1/orders`
Queries user's orders with pagination and filters.

**Query Parameters:**
- `status`: `OPEN` | `PARTIALLY_FILLED` | `FILLED` | `CANCELLED` | `REJECTED`
- `instrument`: `RELIANCE`
- `side`: `BUY` | `SELL`
- `page`: `1` (default 1)
- `limit`: `20` (max 100)

---

### `POST /api/v1/orders/:id/cancel`
Cancels an eligible resting order (`NEW`, `OPEN`, `PARTIALLY_FILLED`) and releases remaining cash or share reservations.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "orderId": "ORD-20261025-A1B2C3",
      "status": "CANCELLED",
      "remainingQuantity": 5
    }
  }
}
```

---

### `GET /api/v1/orders/:id/events`
Returns append-only audit trail events and execution records for the order.

---

## 5. Order Book Endpoints

### `GET /api/v1/orderbook/:symbol`
Returns real-time Level 2 depth aggregated by price level from backend resting orders.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "symbol": "RELIANCE",
    "bids": [
      { "priceInPaise": 249990, "rupeePrice": "2499.90", "totalQuantity": 50, "orderCount": 1 }
    ],
    "asks": [
      { "priceInPaise": 250010, "rupeePrice": "2500.10", "totalQuantity": 50, "orderCount": 1 }
    ],
    "bestBid": { "priceInPaise": 249990, "totalQuantity": 50 },
    "bestAsk": { "priceInPaise": 250010, "totalQuantity": 50 },
    "spreadInPaise": 20,
    "spreadRupees": "0.20",
    "totalBidQuantity": 300,
    "totalAskQuantity": 300,
    "timestamp": "2026-10-25T14:30:00.000Z"
  }
}
```

---

## 6. Portfolio & Position Endpoints

### `GET /api/v1/portfolio/summary`
Returns account balances, marked stock valuations, realized/unrealized P&L, and invariant audit checks.

---

### `GET /api/v1/portfolio/positions`
Returns active stock holdings with cost basis and current prices.

---

## 7. System Health Endpoints

- `GET /api/health` -> Service uptime and status.
- `GET /api/health/database` -> MongoDB connection state and active replica set indicator.
