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
    
<truncated 2034 bytes>