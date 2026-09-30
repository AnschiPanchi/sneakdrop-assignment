const mongoose = require('mongoose');
const holdService = require('../services/holdService');
const queueService = require('../services/queueService');
const inventoryService = require('../services/inventoryService');

let io;

const setIO = (socketIO) => {
  io = socketIO;
};

const processExpiredHold = async (expiredHold) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomic — if another worker already expired this, returns null and we skip
    const hold = await holdService.expireHold(expiredHold._id, session);
    if (!hold) {
      await session.abortTransaction();
      return;
    }

    const nextInQueue = await queueService.claimNextWaiting(session);

    if (nextInQueue) {
      const newHold = await holdService.createHold(nextInQueue.userId, session);
      await session.commitTransaction();

      console.log(`Hold expired. Promoted user ${nextInQueue.userId} → hold ${newHold._id}`);

      if (io) {
        io.to(`user:${nextInQueue.userId}`).emit('hold:update', {
          status: 'HELD',
          holdId: newHold._id,
          expiresAt: newHold.expiresAt,
        });
        io.emit('queue:update');
      }
    } else {
      await inventoryService.incrementAvailable(session);
      await session.commitTransaction();
      console.log(`Hold expired for user ${expiredHold.userId}. Inventory restored.`);

      if (io) io.emit('inventory:update');
    }
  } catch (err) {
    await session.abortTransaction();
    console.error(`Error processing expired hold ${expiredHold._id}:`, err.message);
  } finally {
    session.endSession();
  }
};

const runExpiryCheck = async () => {
  try {
    const expiredHolds = await holdService.findExpiredHolds();
    for (const hold of expiredHolds) {
      await processExpiredHold(hold);
    }
  } catch (err) {
    console.error('Expiry worker error:', err.message);
  }
};

const startExpiryWorker = () => {
  console.log('Expiry worker started.');
  setInterval(runExpiryCheck, 2000);
};

module.exports = { startExpiryWorker, setIO };
