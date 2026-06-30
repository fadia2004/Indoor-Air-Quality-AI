const express = require('express');
const {
  analyzeSingleRoom,
  analyzeBatch,
  getSession,
  clearSession
} = require('../controllers/roomComparisonController');

const router = express.Router();

// POST /api/rooms/analyze
// Body: { name, co2, temperature, humidity, occupancy, windowStatus, month, sessionId? }
router.post('/analyze', analyzeSingleRoom);

// POST /api/rooms/analyze-batch
// Body: { rooms: [{ name, co2, temperature, humidity, occupancy, windowStatus, month }, ...] }
router.post('/analyze-batch', analyzeBatch);

// GET /api/rooms/session/:sessionId
router.get('/session/:sessionId', getSession);

// DELETE /api/rooms/session/:sessionId
router.delete('/session/:sessionId', clearSession);

module.exports = router;
