const express = require('express');
const router = express.Router();
const { initiatePay, handleWebhook } = require('../controllers/paymentController');

router.post('/pay', initiatePay);
router.post('/webhook', handleWebhook);

module.exports = router;
