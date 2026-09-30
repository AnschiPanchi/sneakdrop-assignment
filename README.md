# SneakDrop

A limited-stock sneaker purchasing system built with the MERN stack. Exactly 20 sneakers are available. Thousands of users may try to purchase simultaneously. The system guarantees correctness under concurrency through atomic MongoDB operations and transactions.

---

## Project Overview

SneakDrop solves the classic e-commerce "flash sale overselling" problem:

- A sneaker brand has **exactly 20 pairs** to sell
- Thousands of users hit **BUY** at the same moment
- The system must **never sell more than 20 pairs**, even under extreme concurrent load

---

## Architecture

```
Client (React + Vite)
    │
    ├── Axios HTTP calls → Express REST API
    └── Socket.IO → Real-time updates

Server (Node.js + Express)
    │
    ├── controllers/ — HTTP request/response handling
    ├── services/    — Core business logic
    ├── models/      — Mongoose schemas
    ├── routes/      — Route definitions
    ├── workers/     — Background expiry polling
    └── middleware/  — Error handling

Database (MongoDB)
    ├── users        — User accounts
    ├── inventories  — Single document tracking stock
    ├── holds        — Active/purchased/expired holds
    ├── queues       — FIFO waiting list
    └── payments     — Payment event records (idempotent)
```

---

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React 18, Vite, Socket.IO-client, Axios |
| Backend   | Node.js, Express.js                     |
| Database  | MongoDB, Mongoose                       |
| Real-time | Socket.IO                               |
| Utilities | dotenv, cors, uuid                      |

---

## Folder Structure

```
src/
├── server/
│   ├── config/db.js                 MongoDB connection
│   ├── controllers/
│   │   ├── userController.js        User CRUD
│   │   ├── dropController.js        Buy logic + inventory status
│   │   └── paymentController.js     Fake payment + webhook
│   ├── middleware/
│   │   └── errorHandler.js          Centralized error handling
│   ├── models/
│   │   ├── User.js                  User schema
│   │   ├── Inventory.js             Single inventory record
│   │   ├── Hold.js                  Hold lifecycle
│   │   ├── Queue.js                 FIFO queue entries
│   │   └── Payment.js              Idempotent payment events
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── dropRoutes.js
│   │   └── paymentRoutes.js
│   ├── services/
│   │   ├── inventoryService.js      Atomic inventory operations
│   │   ├── holdService.js           Hold CRUD + status transitions
│   │   ├── queueService.js          FIFO queue management
│   │   └── paymentService.js       Idempotent payment processing
│   ├── workers/
│   │   └── expiryWorker.js         Polls for expired holds every 2s
│   ├── utils/
│   │   ├── seed.js                  Seeds inventory
│   └── server.js                   Entry point
│
└── client/
    └── src/
        ├── components/
        │   ├── Header.jsx            Nav + connection indicator
        │   ├── InventoryStats.jsx    Live stats grid
        │   ├── UserStatus.jsx        Hold timer / queue pos / purchases
        │   └── UserSelector.jsx      Create/select test users
        ├── hooks/
        │   ├── useDropStatus.js      Fetches + subscribes to status
        │   └── useCountdown.js       Display-only countdown timer
        ├── pages/
        │   └── Dashboard.jsx         Main page
        ├── services/
        │   ├── api.js               Axios instance
        │   └── socket.js            Socket.IO client singleton
        ├── App.jsx
        └── main.jsx
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB running locally (default: `mongodb://localhost:27017`)
- npm

### 1. Clone and navigate

```bash
git clone <your-fork-url>
cd sneakdrop-assignment/sneakdrop
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env if needed (default values work for local MongoDB)
```

### 4. Install frontend dependencies

```bash
cd ../client
npm install
```

---

## Environment Variables

| Variable   | Default               | Description         |
| ---------- | --------------------- | ------------------- |
| PORT       | 5000                  | Backend server port |
| MONGO_URI  | Your_URI              | MongoDB connection  |
| CLIENT_URL | http://localhost:5173 | Vite dev server URL |

---

## How to Run

### Backend

```bash
cd server
npm run dev        # Development with nodemon
# OR
npm start          # Production
```

The server auto-seeds the inventory (20 sneakers) on first run if no inventory record exists.

### Frontend

```bash
cd client
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

### Users

| Method | Endpoint       | Description            |
| ------ | -------------- | ---------------------- |
| GET    | /api/users     | List all users         |
| POST   | /api/users     | Create user `{ name }` |
| GET    | /api/users/:id | Get user by ID         |

### Drop

| Method | Endpoint      | Description                                         |
| ------ | ------------- | --------------------------------------------------- |
| GET    | /api/drop     | Get inventory status (+ ?userId=... for user state) |
| POST   | /api/drop/buy | Buy a sneaker `{ userId }`                          |

**GET /api/drop response:**

```json
{
  "total": 20,
  "available": 15,
  "sold": 3,
  "held": 2,
  "queueLength": 10,
  "userStatus": {
    "purchasedCount": 0,
    "activeHold": { "holdId": "...", "status": "HELD", "expiresAt": "..." },
    "queuePosition": null
  }
}
```

**POST /api/drop/buy responses:**

```json
// Got a hold:
{ "success": true, "status": "HELD", "holdId": "...", "expiresAt": "..." }

// Added to queue:
{ "success": true, "status": "QUEUED", "queuePosition": 12 }
```

### Payment

| Method | Endpoint             | Description                        |
| ------ | -------------------- | ---------------------------------- |
| POST   | /api/payment/pay     | Initiate fake payment `{ holdId }` |
| POST   | /api/payment/webhook | Receive payment event (idempotent) |

**Webhook body:**

```json
{ "eventId": "pay_abc123", "holdId": "...", "status": "SUCCESS" }
```

---

## Database Models

### User

```js
{ name: String, purchasedCount: Number (0–2), createdAt: Date }
```

### Inventory (single document)

```js
{ total: 20, available: Number }
```

### Hold

```js
{
  userId: ObjectId, status: 'HELD'|'PURCHASED'|'EXPIRED',
  expiresAt: Date, createdAt: Date, purchasedAt: Date
}
```

Indexes: `{ userId, status }`, `{ status, expiresAt }`

### Queue

```js
{ userId: ObjectId, status: 'WAITING'|'PROMOTED'|'REMOVED', joinedAt: Date }
```

Indexes: `{ status, joinedAt }` (FIFO ordering), `{ userId, status }`

### Payment

```js
{
  eventId: String (unique), holdId: ObjectId, userId: ObjectId,
  status: 'PENDING'|'SUCCESS'|'FAILED', createdAt: Date, processedAt: Date
}
```

Index: `{ eventId }` unique (database-level idempotency)

---

## Concurrency Strategy

### How does the system prevent overselling?

The inventory decrement uses a **single atomic MongoDB operation**:

```js
Inventory.findOneAndUpdate(
  { available: { $gt: 0 } }, // Only if stock exists
  { $inc: { available: -1 } }, // Atomic decrement
  { new: true, session }, // Inside a transaction
);
```

MongoDB guarantees this is atomic. If 1000 requests arrive simultaneously and `available = 1`, only ONE will match the filter. The other 999 receive `null` and are routed to the queue.

This is wrapped in a MongoDB **multi-document transaction** that also creates the hold record — both happen atomically or neither does.

---

## Payment Idempotency Strategy

Every payment event has a unique `eventId`. The `Payment` collection has a **unique index on `eventId`**.

When a webhook arrives:

1. Look up the existing payment by `eventId`
2. If it exists AND the new status priority is not higher → skip (return existing)
3. If it exists AND the new status is higher priority → upgrade status
4. If it doesn't exist → create new record

**Status priority**: `SUCCESS (3) > FAILED (2) > PENDING (1)`

A `SUCCESS` payment can never be downgraded to `PENDING` by a late-arriving event.

The purchase completion (`HELD → PURCHASED` + `purchasedCount++`) uses a transaction with a conditional update: only transitions if the hold is STILL in `HELD` state. A duplicate `SUCCESS` event finds the hold already `PURCHASED` and aborts harmlessly.

---

## Hold Expiration Strategy

The `expiryWorker.js` polls MongoDB every **2 seconds**:

```
Find all holds where: status='HELD' AND expiresAt <= now
For each expired hold:
  1. Atomically flip status: HELD → EXPIRED (conditional on status='HELD')
  2. If someone is waiting → claim them atomically from Queue → create new hold
  3. If nobody waiting → increment inventory
```

Key points:

- `expiresAt` is **stored in MongoDB** — not in memory. Server restarts don't lose expiry data.
- The atomic conditional update prevents two worker instances from double-processing the same hold.
- The entire operation is wrapped in a MongoDB transaction.

---

## Queue Strategy (FIFO)

The `Queue` collection is the authoritative queue — no in-memory arrays.

**Enqueue**: Insert a new `Queue` document with `status='WAITING'` and `joinedAt=now`.

**FIFO ordering**: Entries are sorted by `joinedAt` ascending — the earliest `joinedAt` is promoted first.

**Atomic promotion** (used by the expiry worker):

```js
Queue.findOneAndUpdate(
  { status: "WAITING" }, // Match any waiting entry
  { status: "PROMOTED" }, // Mark as taken
  { sort: { joinedAt: 1 } }, // FIFO: earliest first
);
```

This atomic operation prevents two concurrent workers from promoting the same user.

---

## How to Test Concurrent Purchases

Start the server, then in another terminal:

```bash
cd server
npm run test:concurrent
```

This runs 8 tests automatically:

1. Basic purchase
2. Duplicate BUY (same user, concurrent requests)
3. 20 simultaneous buyers → exactly 20 holds, 0 oversell
4. 100 simultaneous buyers → 20 holds, 80 queued, never 21 holds
5. Hold expiration logic verification
6. Duplicate payment event (idempotency)
7. Out-of-order payment events
8. Maximum purchase limit (3rd buy rejected)

---

## What Happens if the Server Restarts?

- **Inventory**: Persisted in MongoDB. Server reads current state on startup.
- **Holds**: All `expiresAt` values are in MongoDB. The expiry worker picks up any holds that expired during downtime on its next poll (within 2 seconds of startup).
- **Queue**: Fully in MongoDB. FIFO order is preserved.
- **In-flight payments**: The `eventId` unique index prevents any duplicate processing if a webhook arrives after restart.
- **Socket.IO rooms**: Clients automatically reconnect and re-join their rooms.

---

## Known Limitations

1. **Single-process worker**: The expiry worker runs in the same Node process as the API. In production, this should be a separate process. The atomic MongoDB operations ensure correctness even if multiple instances run simultaneously.

2. **No authentication**: Users are identified only by MongoDB ObjectId. In production, add JWT or session-based auth.

3. **In-process payment simulation**: The fake payment processor fires a setTimeout in the same process. In production, a real payment provider would call your webhook URL from an external server.

4. **No rate limiting**: Not implemented to keep the code simple and interviewable.

5. **MongoDB replica set required for transactions**: Multi-document transactions require MongoDB to run as a replica set. If you see transaction errors, start MongoDB as a replica set or use `mongod --replSet rs0`.

---

## Starting MongoDB as a Replica Set (Required for Transactions)

If you see errors like "Transaction numbers are only allowed on a replica set member", run:

```bash
# Stop your current mongod, then:
mongod --replSet rs0 --dbpath /your/data/path

# In mongo shell (first time only):
rs.initiate()
```

---

## Future Improvements

- Separate expiry worker process
- JWT authentication
- Rate limiting (express-rate-limit)
- Admin dashboard to reset inventory for testing
- Webhook signature verification
- Automated integration tests with a test database
- Email notifications when queue position is promoted
