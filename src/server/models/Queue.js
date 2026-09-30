const mongoose = require('mongoose');

// FIFO ordering via joinedAt
const queueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['WAITING', 'PROMOTED', 'REMOVED'], default: 'WAITING' },
  joinedAt: { type: Date, default: Date.now },
});

queueSchema.index({ status: 1, joinedAt: 1 });
queueSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Queue', queueSchema);
