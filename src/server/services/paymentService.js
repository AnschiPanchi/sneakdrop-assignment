const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Hold = require('../models/Hold');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// Status priority — we never downgrade (SUCCESS can't go back to PENDING)
const STATUS_PRIORITY = { PENDING: 1, FAILED: 2, SUCCESS: 3 };

const initiatePayment = async (holdId, userId) => {
  const eventId = `pay_${uuidv4()}`;
  const payment = new Payment({ eventId, holdId, userId, status: 'PENDING' });
  await payment.save();
  return { eventId, holdId, userId };
};

const processWebhook = async (eventId, holdId, status, getIO) => {
  let payment = await Payment.findOne({ eventId });

  if (payment) {
    const currentPriority = STATUS_PRIORITY[payment.status] || 0;
    const newPriority = STATUS_PRIORITY[status] || 0;

    // Ignore duplicate or out-of-order lower-priority events
    if (newPriority <= currentPriority) {
      return { alreadyProcessed: true, payment };
    }

    payment.status = status;
    if (status !== 'PENDING') payment.processedAt = new Date();
    await payment.save();
  } else {
    const hold = await Hold.findById(holdId);
    if (!hold) throw new Error('Hold not found for payment webhook');

    payment = new Payment({
      eventId,
      holdId,
      userId: hold.userId,
      status,
      processedAt: status !== 'PENDING' ? new Date() : null,
    });
    await payment.save();
  }

  if (status === 'SUCCESS') {
    await completePurchase(holdId, payment.userId, getIO);
  }

  return { alreadyProcessed: false, payment };
};

const completePurchase = async (holdId, userId, getIO) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomic transition — returns null if already purchased (duplicate event)
    const hold = await Hold.findOneAndUpdate(
      { _id: holdId, status: 'HELD' },
      { status: 'PURCHASED', purchasedAt: new Date() },
      { new: true, session 
<truncated 806 bytes>