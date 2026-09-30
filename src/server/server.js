require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const dropRoutes = require('./routes/dropRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const { setGetIO: setDropIO } = require('./controllers/dropController');
const { setGetIO: setPaymentIO } = require('./controllers/paymentController');
const { startExpiryWorker, setIO: setWorkerIO } = require('./workers/expiryWorker');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/drop', dropRoutes);
app.use('/api/payment', paymentRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Client joins their own room to receive targeted updates
  socket.on('join', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const getIO = () => io;
setDropIO(getIO);
setPaymentIO(getIO);
setWorkerIO(io);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  // Auto-seed inventory on first run
  const Inventory = require('./models/Inventory');
  const existing = await Inventory.findOne();
  if (!existing) {
    await new Inventory({ total: 20, available: 20 }).save();
    console.log('Inventory seeded: 20 sneakers.');
  }

  startExpiryWorker();

  
<truncated 201 bytes>