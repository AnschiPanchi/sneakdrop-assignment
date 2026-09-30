const express = require('express');
const router = express.Router();
const { getDropStatus, buyDrop } = require('../controllers/dropController');

router.get('/', getDropStatus);
router.post('/buy', buyDrop);

module.exports = router;
