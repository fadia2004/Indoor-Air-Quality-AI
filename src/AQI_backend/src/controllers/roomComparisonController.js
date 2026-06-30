const { analyzeRoom, analyzeRoomBatch } = require('../services/roomComparisonService');

// In-memory session store keyed by a client-provided sessionId.
// This mirrors the frontend's "session-only, no persistence" behavior
// (compare.js explicitly avoids localStorage) while still allowing the
// backend to remember rooms added across multiple requests in the
// same browser session if the frontend chooses to send a sessionId.
const sessions = new Map();

function getSessionRooms(sessionId) {
  if (!sessionId) return null;
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  return sessions.get(sessionId);
}

function analyzeSingleRoom(req, res, next) {
  try {
    const { sessionId, ...roomInput } = req.body || {};
    const sessionRooms = getSessionRooms(sessionId);
    const fallbackIndex = sessionRooms ? sessionRooms.length + 1 : 1;

    const room = analyzeRoom(roomInput, fallbackIndex);

    if (sessionRooms) sessionRooms.push(room);

    res.status(200).json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
}

function analyzeBatch(req, res, next) {
  try {
    const { rooms } = req.body || {};
    const result = analyzeRoomBatch(rooms);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

function getSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const rooms = sessions.get(sessionId) || [];
    if (!rooms.length) {
      return res.status(200).json({ success: true, data: { rooms: [], savedRoomCount: 0, bestRoom: null, worstRoom: null, recommendationCards: [], overallRecommendation: null } });
    }
    const result = analyzeRoomBatch(rooms.map(({ name, co2, temperature, humidity, occupancy, windowStatus, month }) => ({ name, co2, temperature, humidity, occupancy, windowStatus, month })));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

function clearSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    sessions.delete(sessionId);
    res.status(200).json({ success: true, data: { cleared: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeSingleRoom, analyzeBatch, getSession, clearSession };
