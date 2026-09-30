# Notes

## How to Run

### Prerequisites

- Node.js 18+
- A MongoDB URI (MongoDB Atlas works out of the box)

### Step 1: Set up environment variables

Create `src/server/.env`:

```
PORT=5000
MONGO_URI=<your MongoDB URI here>
CLIENT_URL=http://localhost:5173
```

### Step 2: Install and run the backend

```bash
cd src/server
npm install
node server.js
# Server starts at http://localhost:5000
```

### Step 3: Install and run the frontend

```bash
cd src/client
npm install
npm run dev
# App opens at http://localhost:5173
```

## Architecture Summary

- **Anti-oversell**: MongoDB atomic `findOneAndUpdate` with `{ available: { $gt: 0 } }` inside a transaction — only one request can decrement stock at a time.
- **Idempotent payments**: Unique index on `eventId` prevents duplicate processing. Status priority (`SUCCESS > FAILED > PENDING`) prevents out-of-order downgrades.
- **Hold expiration**: Worker polls MongoDB every 2s. `expiresAt` is stored in the DB, so expiry survives server restarts.
- **FIFO queue**: Atomic `findOneAndUpdate` sorted by `joinedAt` — earliest user is always promoted first.
- **Real-time updates**: Socket.IO emits `inventory:update`, `hold:update`, `queue:update`, `payment:update` to keep the UI in sync.
