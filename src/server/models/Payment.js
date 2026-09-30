const mongoose = require('mongoose');

// eventId must be unique — this is how we handle duplicate webhook events
const paymentSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  holdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hold', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
});

paymentSchema.index({ eventId: 1 }, { unique: true });
paymentSchema.index({ holdId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
