# TradeFlow — Simulated Stock Order Management & Matching Platform

[![Node.js](https://img.shields.io/badge/Node.js-v22.17.1-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-v8.3.5-purple.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-v19.3.1-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Vitest-46%20Passed-brightgreen.svg)](https://vitest.dev/)

TradeFlow is a simulated stock-order management, execution, and matching platform built from the ground up for software engineers preparing for fintech engineering interviews (Paytm Money, Zerodha, Groww).

It features a real, deterministic **price-time priority (FIFO) matching engine**, **double-entry reservation accounting**, **integer paise financial calculations**, **multi-document ACID MongoDB transactions**, **request idempotency**, and an auditable order lifecycle.

---

## 1. Why TradeFlow Exists

In many portfolio projects, simulated trading is faked by simply changing the status of an order to `"FILLED"` in React state after a `setTimeout`.

TradeFlow does not fake orders:
- Orders enter a real double-sided order book.
- Incoming aggressive orders execute deterministically against resting liquidity.
- Trades occur at the **resting order's price**.
- Unspent reservations are refunded via **price improvement accounting**.
- Orders match against real counterparties or public liquidity providers while strictly preventing **self-trading (wash trades)**.
- If the server restarts, the entire order book is reconstructed from persistent MongoDB orders.

---

## 2. Core Features

### A. Real Order-Matching Engine
- **Price-Time Priority (FIFO)**: Highest bids and lowest asks match first; ties broken by arrival timestamp.
- **Order Types**: Limit orders (rest on book or execute at limit price or better) and Market orders (immediate execution with IOC remainder cancellation).
- **Execution Price Rule**: Execution occurs at the resting order's limit price.
- **Partial Fills & Sweeps**: One incoming order can match across multiple resting orders at varying price levels.
- **Self-Trade Prevention**: Prevents wash trading between orders owned by the same user.

### B. Double-Entry Reservation Accounting
- **No Floating-Point Math**: All prices, balances, and notionals use exact integer paise ($1\text{ INR} = 100\text{ paise}$).
- **Buy Orders**: Cash is atomically locked into `reservedCashPaise`. Upon execution, executed notional is deducted and difference refunded.
- **Sell Orders**: Available inventory is atomically locked into `reservedQuantity`.
- **Cancellations**: Unfilled reservations are released back to available balances immediately.

### C. Enterprise Reliability & Security
- **Idempotency Protection**: `Idempotency-Key` header with SHA-256 payload fingerprinting prevents duplicate orders on retries.
- **MongoDB ACID Transactions**: Atomic multi-document mutations ensure balances and orders cannot diverge.
- **Crash Recovery**: Order books are automatically rebuilt from persistent database orders on startup.
- **Rate Limiting**: Defenses against credential brute-forcing and runaway order submissions.
- **Dual Transport Auth**: HttpOnly cookies with CSRF/SameSite protection alongside Bearer tokens.

### D. Dark Fintech Trading Terminal
- **Trading Terminal**: Live stock picker, order ticket with presets, inline validation, and order preview confirmation modal.
- **Level 2 Order Book Depth**: Visual depth bars with volume visualization, live bid/ask spreads, and click-to-fill limit pricing.
- **Audit History**: Inspect full chronological event history (`OrderEvent`) and immutable execution matches for any order.
- **Portfolio & Valuations**: Realized and unrealized P&L, cost basis tracking, and visual asset allocation breakdown.

---

## 3. Technology Stack

- **Backend**: Node.js (v22+), Express, MongoDB, Mongoose, Zod, bcryptjs, jsonwebtoken, express-rate-limit.
- **Testing**: Vitest, Supertest, mongodb-memory-server (embedded replica set).
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Recharts.
- **Architecture**: ES Modules (`"type": "module"`), Clean Architecture with decoupled domain engine.

---

## 4. Port Configuration

To avoid port collisions with other development projects:
- **Backend Server**: Port `5002` (configurable via `PORT` in `server/.env`)
- **Frontend Client**: Port `5174` (configured in `client/vite.config.js`)

---

## 5. Prerequisites

- **Node.js**: `v22.17.1` (or Node.js v20+)
- **npm**: `10.9.2` (or npm 10+)
- **macOS** / Linux / Windows

---

## 6. Installation & Quick Start

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url> tradeflow
cd tradeflow

# Install root orchestration dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment Variables
Copy the example environment files:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

> **Zero-Config Database Support**: If `MONGODB_URI` is left blank in `server/.env`, TradeFlow **automatically spins up an embedded in-memory MongoDB replica set** (`mongodb-memory-server`) with full multi-document transaction support! You do not need a running MongoDB daemon to run or test TradeFlow locally.
>
> To connect to **MongoDB Atlas** or an external database, simply set:
> ```env
> MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tradeflow?retryWrites=true&w=majority
> ```

### 3. Seed Supported Stocks & Demo Liquidity
```bash
npm run seed
```
This idempotently seeds the 8 supported instruments (RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, TATAMOTORS, ZOMATO, PAYTM) and provisions two-sided resting liquidity.

### 4. Start the Development Servers
```bash
# Run both backend (port 5002) and frontend (port 5174) concurrently
npm run dev
```
Open your browser to **http://localhost:5174**.

---

## 7. How to Demonstrate a Trade

1. Open **http://localhost:5174/login**.
2. Click **"Launch One-Click Demo Account (₹1,00,000 Cash)"**.
3. You will be logged in with ₹1,00,000.00 available cash.
4. Navigate to the **Trading Terminal** (`/terminal`).
5. Select **RELIANCE**. Observe the real Level 2 order book showing bids (green) and asks (red).
6. **Execute a Fill Immediately**:
   - In the Order Book panel, click on the lowest Ask price (e.g. ₹2,500.10).
   - The Order Ticket will automatically populate with this Limit Price.
   - Enter Quantity `10`, and click **"Place BUY LIMIT Order"**.
   - Confirm the order in the modal dialog.
   - The order matches instantly against the resting ask: status transitions to **FILLED** with an execution match!
7. Check **Portfolio** (`/portfolio`) to view your 10 shares of RELIANCE with cost basis and marked P&L.
8. Check **My Orders** (`/orders`) and click the **Eye icon** on your order to inspect the append-only event audit trail (`ORDER_ACCEPTED` -> `RESERVATION_CREATED` -> `ORDER_FILLED`).

---

## 8. Running Automated Tests & Production Build

### Automated Test Suite
```bash
# Run all Vitest suites (matching engine, reservations, idempotency, REST API)
npm test
```
**Test Results**: 4 test files, 46 tests passing with 0 failures.

### Production Build & Linting
```bash
# Run linter across both client and server
npm run lint

# Compile production bundle for client
npm run build
```

---

## 9. Common Setup Issues & Solutions

- **Port in use (5002 or 5174)**:
  Check if an old process is running: `lsof -i :5002` or `lsof -i :5174`. Kill with `kill -9 <PID>` or modify `PORT` in `server/.env`.
- **Standalone MongoDB transaction error**:
  If using an external MongoDB server that is NOT configured as a replica set, multi-document transactions will fail. Leave `MONGODB_URI` blank to use the built-in replica set or configure your local mongod with `--replSet rs0`.

---

## 10. Technical Documentation Index

For in-depth explanations and interview preparation, consult the documentation directory:
- [docs/ARCHITECTURE.md](file:///Users/darsh/Projects/TradeFlow/docs/ARCHITECTURE.md) — System components, separation of concerns, and request lifecycle.
- [docs/API.md](file:///Users/darsh/Projects/TradeFlow/docs/API.md) — Complete REST API reference, request/response schemas, and status codes.
- [docs/DATA_MODEL.md](file:///Users/darsh/Projects/TradeFlow/docs/DATA_MODEL.md) — Mongoose schemas, relationships, indexes, and database invariants.
- [docs/ORDER_MATCHING.md](file:///Users/darsh/Projects/TradeFlow/docs/ORDER_MATCHING.md) — Deterministic matching rules, price-time priority, crossing conditions, and price improvement.
- [docs/SECURITY.md](file:///Users/darsh/Projects/TradeFlow/docs/SECURITY.md) — Authentication, idempotency, rate limiting, and concurrency safety.
- [docs/TESTING.md](file:///Users/darsh/Projects/TradeFlow/docs/TESTING.md) — Test suite breakdown, coverage scenarios, and execution commands.
- [docs/INTERVIEW_GUIDE.md](file:///Users/darsh/Projects/TradeFlow/docs/INTERVIEW_GUIDE.md) — 35 technical interview Q&As, debugging scenarios, and project pitches.
