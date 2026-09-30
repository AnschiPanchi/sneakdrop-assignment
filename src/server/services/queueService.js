const Queue = require('../models/Queue');

const getUserQueueEntry = async (userId) => {
  return await Queue.findOne({ userId, status: 'WAITING' });
};

const enqueue = async (userId) => {
  const existing = await getUserQueueEntry(userId);
  if (existing) return existing;

  const entry = new Queue({ userId, status: 'WAITING', joinedAt: new Date() });
  await entry.save();
  return entry;
};

const getQueuePosition = async (userId) => {
  const entry = await getUserQueueEntry(userId);
  if (!entry) return null;

  const ahead = await Queue.countDocuments({
    status: 'WAITING',
    joinedAt: { $lt: entry.joinedAt },
  });
  return ahead + 1;
};

const getQueueLength = async () => {
  return await Queue.countDocuments({ status: 'WAITING' });
};

// Atomically grabs the next WAITING user in FIFO order
const claimNextWaiting = async (session) => {
  return await Queue.findOneAndUpdate(
    { status: 'WAITING' },
    { status: 'PROMOTED' },
    { sort: { joinedAt: 1 }, new: true, session }
  );
};

const removeFromQueue = async (userId) => {
  return await Queue.findOneAndUpdate(
    { userId, status: 'WAITING' },
    { status: 'REMOVED' },
    { new: true }
  );
};

module.exports = {
  getUserQueueEntry,
  enqueue,
  getQueuePosition,
  getQueueLength,
  claimNextWaiting,
  removeFromQueue,
};
