const express = require('express');
const { predict } = require('../controllers/quickScanController');

const router = express.Router();

// POST /api/quick-scan/predict
// Body: { co2, temperature, humidity, occupancy, windowStatus, month }
router.post('/predict', predict);

module.exports = router;
