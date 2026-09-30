const Inventory = require('../models/Inventory');

const getInventory = async () => {
  return await Inventory.findOne();
};

// Atomic decrement — only succeeds if available > 0
// Prevents overselling under concurrent requests
const decrementAvailable = async (session) => {
  return await Inventory.findOneAndUpdate(
    { available: { $gt: 0 } },
    { $inc: { available: -1 } },
    { new: true, session }
  );
};

// Called when a hold expires and nobody is in queue
const incrementAvailable = async (session) => {
  return await Inventory.findOneAndUpdate(
    {},
    { $inc: { available: 1 } },
    { new: true, session }
  );
};

module.exports = { getInventory, decrementAvailable, incrementAvailable };
