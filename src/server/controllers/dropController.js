const mongoose = require('mongoose');
const User = require('../models/User');
const Hold = require('../models/Hold');
const inventoryService = require('../services/inventoryService');
const holdService = require('../services/holdService');
const queueService = require('../services/queueService');

let getIO;
const setGetIO = (fn) => { getIO = fn; };

const getDropStatus = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const inventory = await inventoryService.getInventory();

    const heldCount = await Hold.countDocuments({
      status: 'HELD',
      expiresAt: { $gt: new Date() },
    });
    const soldCount = await Hold.countDocuments({ status: 'PURCHASED' });
    const queueLength = await queueService.getQueueLength();

    const response = {
      total: inventory.total,
      available: inventory.available,
      sold: soldCount,
      held: heldCount,
      queueLength,
    };

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const activeHold = await holdService.getActiveHold(userId);
        const queueEntry = await queueService.getUserQueueEntry(userId);
        const queuePosition = queueEntry ? await queueService.getQueuePosition(userId) : null;

        response.userStatus = {
          purchasedCount: user.purchasedCount,
          activeHold: activeHold
            ? { holdId: activeHold._id, status: activeHold.status, expiresAt: activeHold.expiresAt }
            : null,
          queuePosition,
        };
      }
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
};

const buyDrop = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.body;

    if (!userId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'userId is required.' });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.purchasedCount >= 2) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Purchase limit reached. You can only buy 2 sneakers.' });
    }

    // Return existing hold if user already has one
    const existingHold = await holdService.getActiveHold(userId);
    if (existingHold) {
      await session.abortTransaction();
      return res.json({
        success: true,
        status: 'HELD',
        holdId: existingHold._id,
        expiresAt: existingHold.expiresAt,
        message: 'You already have an active hold.',
      });
    }

    // Atomic inventory decrement — returns null if nothing available
    const updatedInventory = await inventoryService.decrementAvailable(session);

    if (updatedInventory) {
      const hold = await holdService.createHold(userId, session);
      await session.commitTransaction();

      if (getIO) {
        getIO().emit('inventory:update');
        getIO().to(`user:${userId}`).emit('hold:update', {
          status: 'HELD',
          holdId: hold._id,
          expiresAt: hold.expiresAt,
        });
      }

      return res.status(201).json({ success: true, status: 'HELD', holdId: hold._id, expiresAt: hold.expiresAt });
    } else {
      await session.abortTransaction();

      const activeHoldsCount = await Hold.countDocuments({
        status: 'HELD',
        expiresAt: { $gt: new Date() }
      });

      if (activeHoldsCount === 0) {
        return res.status(400).json({ success: false, message: 'Drop is completely sold out!' });
      }

      const queueEntry = await queueService.enqueue(userId);
      const position = await queueService.getQueuePosition(userId);

      if (getIO) {
        getIO().emit('queue:update');
        getIO().to(`user:${userId}`).emit('queue:update', { position });
      }

      return res.json({ success: true, status: 'QUEUED', queuePosition: position });
    }
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

module.exports = { getDropStatus, buyDrop, setGetIO };
