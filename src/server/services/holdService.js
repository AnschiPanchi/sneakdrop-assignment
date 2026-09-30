const Hold = require('../models/Hold');

const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const getActiveHold = async (userId) => {
  return await Hold.findOne({
    userId,
    status: 'HELD',
    expiresAt: { $gt: new Date() },
  });
};

const createHold = async (userId, session) => {
  const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);
  const hold = new Hold({ userId, status: 'HELD', expiresAt });
  await hold.save({ session });
  return hold;
};

// Only transitions if still HELD — prevents double-purchasing
const purchaseHold = async (holdId, session) => {
  return await Hold.findOneAndUpdate(
    { _id: holdId, status: 'HELD' },
    { status: 'PURCHASED', purchasedAt: new Date() },
    { new: true, session }
  );
};

// Only transitions if still HELD — idempotent expiry
const expireHold = async (holdId, session) => {
  return await Hold.findOneAndUpdate(
    { _id: holdId, status: 'HELD' },
    { status: 'EXPIRED' },
    { new: true, session }
  );
};

const findExpiredHolds = async () => {
  return await Hold.find({ status: 'HELD', expiresAt: { $lte: new Date() } });
};

module.exports = {
  HOLD_DURATION_MS,
  getActiveHold,
  createHold,
  purchaseHold,
  expireHold,
  findExpiredHolds,
};
