const Hold = require('../models/Hold');
const paymentService = require('../services/paymentService');

let getIO;
const setGetIO = (fn) => { getIO = fn; };

const initiatePay = async (req, res, next) => {
  try {
    const { holdId } = req.body;

    if (!holdId) return res.status(400).json({ success: false, message: 'holdId is required.' });

    const hold = await Hold.findById(holdId);
    if (!hold) return res.status(404).json({ success: false, message: 'Hold not found.' });
    if (hold.status !== 'HELD') return res.status(409).json({ success: false, message: `Hold is ${hold.status}.` });
    if (new Date() > hold.expiresAt) return res.status(409).json({ success: false, message: 'Hold has expired.' });

    const { eventId } = await paymentService.initiatePayment(holdId, hold.userId);

    // Simulate async payment — in production the payment provider calls the webhook
    const delay = Math.floor(Math.random() * 2000) + 500;
    setTimeout(async () => {
      try {
        await paymentService.processWebhook(eventId, holdId, 'SUCCESS', getIO);
      } catch (err) {
        console.error(`Webhook simulation error for ${eventId}:`, err.message);
      }
    }, delay);

    res.json({ success: true, message: 'Payment initiated.', eventId, holdId });
  } catch (err) {
    next(err);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const { eventId, holdId, status } = req.body;

    if (!eventId || !holdId || !status) {
      return res.status(400).json({ success: false, message: 'eventId, holdId, and status are required.' });
    }

    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const result = await paymentService.processWebhook(eventId, holdId, status, getIO);
    res.json({ success: true, alreadyProcessed: result.alreadyProcessed, payment: result.payment });
  } catch (err) {
   
<truncated 190 bytes>