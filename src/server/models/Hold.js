const mongoose = require('mongoose');

// HELD -> PURCHASED on payment, HELD -> EXPIRED if time runs out
const holdSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['HELD', 'PURCHASED', 'EXPIRED'], default: 'HELD' },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  purchasedAt: { type: Date, default: null },
});

holdSchema.index({ userId: 1, status: 1 });
holdSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Hold', holdSchema);
