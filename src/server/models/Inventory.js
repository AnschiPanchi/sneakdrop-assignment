const mongoose = require('mongoose');

// Single document — tracks available stock
// Use atomic $inc updates, never read-modify-write
const inventorySchema = new mongoose.Schema({
  total: { type: Number, default: 20 },
  available: { type: Number, default: 20 },
});

module.exports = mongoose.model('Inventory', inventorySchema);
