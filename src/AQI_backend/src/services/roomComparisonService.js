/**
 * Room Comparison scoring engine.
 * Mirrors EXACTLY the formula implemented client-side in
 * AQII_front/js/compare.js -> calculateRoomScore()
 *
 * All recommendations below are generated dynamically from the
 * actual factors a room has (CO2, humidity, occupancy, window
 * status, temperature, month). Nothing here is a fixed/hardcoded
 * block of text — two rooms that end up with the same status
 * (Poor / Moderate / Good) will only share wording if they
 * actually share the same underlying problem or strength. If the
 * factors differ, the recommendations differ too.
 */

const { MONTHS, clamp } = require('./quickScanService');

function calculateRoomScore(inputs, fallbackIndex) {
  const co2 = Number(inputs.co2);
  const temperature = Number(inputs.temperature);
  const humidity = Number(inputs.humidity);
  const occupancy = Number(inputs.occupancy);
  const windowStatus = inputs.windowStatus;
  const month = inputs.month;

  let score = 26;
  score += Math.max(0, co2 - 650) * 0.032;
  score += Math.max(0, humidity - 45) * 1.05;
  score += Math.max(0, occupancy - 3) * 8;
  score += Math.max(0, Math.abs(temperature - 22)) * 2.1;
  if (windowStatus === 'Closed') score += 18;
  if (windowStatus === 'Closed' && co2 >= 1000) score += 16;
  if (humidity >= 60) score += 9;
  if (occupancy >= 6) score += 9;
  if (['January', 'February', 'December'].includes(month)) score += 5;
  if (['June', 'July', 'August'].includes(month)) score += 3;

  const aqi = clamp(Math.round(score), 20, 170);
  let status = 'Good';
  if (aqi >= 90) status = 'Poor';
  else if (aqi >= 50) status = 'Moderate';

  const input = { co2, temperature, humidity, occupancy, windowStatus, month };
  const recommendations = buildRoomRecommendations(input, status);

  const maxRecommendations = status === 'Poor' ? 5 : status === 'Moderate' ? 4 : 3;

  return {
    name: inputs.name || `Room ${fallbackIndex}`,
    co2,
    temperature,
    humidity,
    occupancy,
    windowStatus,
    month,
    aqi,
    status,
    recommendations: recommendations.slice(0, maxRecommendations)
  };
}

/**
 * Builds the list of recommendation sentences for ONE room, based only
 * on that room's own factors. Plain, everyday wording — no technical
 * terms. The wording also changes with how severe each factor is, so
 * a room with closed window + very high CO2 doesn't read the same as
 * a room with closed window + mildly high CO2.
 */
function buildRoomRecommendations(input, status) {
  const { co2, humidity, occupancy, temperature, windowStatus } = input;
  const tempGap = Math.abs(temperature - 22);
  const lines = [];

  // ── Problems, ordered roughly by how much they matter ──────────────
  if (windowStatus === 'Closed' && co2 >= 1000) {
    lines.push('The window is closed and the air feels heavy with people\'s breathing — open it now or turn on a fan to clear the air quickly.');
  } else if (windowStatus === 'Closed') {
    lines.push('The window is closed, which is cutting off fresh air — open it, or at least crack it open for a while.');
  } else if (co2 >= 1000) {
    lines.push('Even with the window open, the air feels stale — open it wider or add a fan to move more fresh air through.');
  } else if (co2 >= 800) {
    lines.push('The air is starting to feel a little stuffy — open the window a bit more or for longer stretches.');
  }

  if (occupancy >= 8) {
    lines.push('There are a lot of people packed into this room — split them into smaller groups or shifts if you can.');
  } else if (occupancy >= 6) {
    lines.push('The room has quite a few people in it — try to keep new people from crowding in further.');
  } else if (occupancy >= 5 && status !== 'Good') {
    lines.push('The number of people is on the higher side for this room — keep an eye on it before it grows more.');
  }

  if (humidity >= 65) {
    lines.push('It feels noticeably damp in here — run a dehumidifier or AC, and let more air circulate.');
  } else if (humidity >= 55) {
    lines.push('The air feels a bit damp — a short burst of ventilation or the AC on a dry setting should help.');
  } else if (humidity <= 25) {
    lines.push('The air is quite dry — a humidifier or a bowl of water in the room can take the edge off.');
  }

  if (tempGap >= 6) {
    lines.push(`It's far from a comfortable temperature in here (currently ${temperature}°C) — adjust the AC or heater so it settles closer to 20–24°C.`);
  } else if (tempGap >= 4) {
    lines.push(`The room is a bit warmer or cooler than comfortable (currently ${temperature}°C) — nudge the AC or heater toward 20–24°C.`);
  }

  if (status === 'Poor') {
    lines.push('Recheck this room again after airing it out for a while to see if conditions have improved.');
  }

  // ── Nothing problematic flagged but status still isn't "Good" ──────
  if (!lines.length && status === 'Moderate') {
    lines.push('Nothing here is seriously wrong, but the overall reading is only middling — a little more airflow would tip it into the "good" range.');
  }

  // ── Good room: tell them what to keep doing, tied to their actual setup ──
  if (status === 'Good') {
    const keepLines = [];
    if (windowStatus === 'Open') {
      keepLines.push('Keep the window open the way it is — that\'s a big part of why the air here is fresh.');
    }
    if (occupancy <= 3) {
      keepLines.push('The number of people in the room is comfortably low — try not to let it climb much further without adding airflow.');
    } else {
      keepLines.push('Even with this many people, things are balanced right now — if more join later, open the window wider or add a fan.');
    }
    if (co2 < 700) {
      keepLines.push('CO2 here is low, so whatever ventilation you\'re using is working — keep it going.');
    }
    if (tempGap < 2) {
      keepLines.push('The temperature is right in the comfortable zone — no changes needed there.');
    }
    keepLines.push('Check back on this room every so often, just to catch any change early.');
    return keepLines;
  }

  return lines;
}

function validateRoomInput(body) {
  const co2 = Number(body.co2);
  const temperature = Number(body.temperature);
  const humidity = Number(body.humidity);
  const occupancy = Number(body.occupancy);
  const windowStatus = body.windowStatus;
  const month = body.month;

  const errors = [];
  if (Number.isNaN(co2)) errors.push('co2 must be a number');
  if (Number.isNaN(temperature)) errors.push('temperature must be a number');
  if (Number.isNaN(humidity)) errors.push('humidity must be a number');
  if (Number.isNaN(occupancy)) errors.push('occupancy must be a number');
  if (!['Open', 'Closed'].includes(windowStatus)) errors.push('windowStatus must be "Open" or "Closed"');
  if (!MONTHS.includes(month)) errors.push(`month must be one of: ${MONTHS.join(', ')}`);

  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }

  return { co2, temperature, humidity, occupancy, windowStatus, month, name: body.name };
}

/**
 * Analyzes a single room (used by the "Add Room" form on compare.html).
 */
function analyzeRoom(rawInput, fallbackIndex = 1) {
  const input = validateRoomInput(rawInput);
  return calculateRoomScore(input, fallbackIndex);
}

/**
 * Builds a short, dynamic explanation of WHY the better room actually
 * beat the worse room, based on the real factor differences between
 * them (not a generic AQI-only sentence, and never a pre-written one).
 */
function buildComparisonReasons(betterRoom, worseRoom) {
  const reasons = [];

  if (betterRoom.windowStatus === 'Open' && worseRoom.windowStatus === 'Closed') {
    reasons.push("its window is open while the other room's window is closed");
  }
  if (betterRoom.occupancy < worseRoom.occupancy) {
    reasons.push('it has fewer people in it');
  }
  if (betterRoom.co2 < worseRoom.co2 - 50) {
    reasons.push('its air feels less stale (lower CO2)');
  }
  if (betterRoom.humidity < worseRoom.humidity - 5) {
    reasons.push('its humidity level is closer to normal');
  }
  if (Math.abs(betterRoom.temperature - 22) < Math.abs(worseRoom.temperature - 22) - 1) {
    reasons.push('its temperature is closer to the comfortable range');
  }

  return reasons;
}

/**
 * Turns a room's own dynamic recommendation list into a short
 * "what to do" sentence, instead of relying on a fixed AQI-bucket
 * lookup. Falls back to a brief status-based line only when a room
 * has no specific recommendation text at all.
 */
function whatToDoFor(room) {
  if (room.recommendations && room.recommendations.length) {
    return room.recommendations[0];
  }
  if (room.status === 'Good') {
    return 'Conditions here are good — keep the current setup as is.';
  }
  if (room.status === 'Moderate') {
    return 'Conditions are middling — a bit more airflow and fewer people would help.';
  }
  return 'Conditions need attention — improve airflow and reduce crowding as soon as you can.';
}

function buildOverallRecommendation(rooms, bestRoom, worstRoom) {
  const ranking = [...rooms]
    .sort((a, b) => a.aqi - b.aqi)
    .map((room, idx) => ({ rank: idx + 1, name: room.name, aqi: room.aqi, status: room.status }));

  const bestRoomFull = rooms.find((r) => r.name === bestRoom.name) || rooms[0];
  const worstRoomFull = rooms.find((r) => r.name === worstRoom.name) || rooms[0];

  const singleRoom = rooms.length === 1;
  const statusWord = { Good: 'good', Moderate: 'moderate', Poor: 'poor' };
  let summary;
  let whyBetter = null;

  if (singleRoom) {
    summary = `${bestRoomFull.name} is the only room analyzed, with an air quality index of ${bestRoomFull.aqi} (${statusWord[bestRoomFull.status]}).`;
  } else {
    const reasons = buildComparisonReasons(bestRoomFull, worstRoomFull);
    whyBetter = reasons.length
      ? `${bestRoomFull.name} is better than ${worstRoomFull.name} because: ${reasons.join(', and ')}.`
      : `${bestRoomFull.name} is better than ${worstRoomFull.name} overall, even though the other readings are close between them.`;

    summary = `${bestRoomFull.name} is the best among the compared rooms (air quality index ${bestRoom.aqi}). ` +
      `${worstRoomFull.name} needs the most attention (air quality index ${worstRoom.aqi}). ${whyBetter}`;
  }

  return {
    summary,
    whyBetter,
    ranking,
    bestRoom: {
      name: bestRoomFull.name,
      aqi: bestRoomFull.aqi,
      status: bestRoomFull.status,
      whatToDo: whatToDoFor(bestRoomFull)
    },
    worstRoom: singleRoom ? null : {
      name: worstRoomFull.name,
      aqi: worstRoomFull.aqi,
      status: worstRoomFull.status,
      whatToDo: whatToDoFor(worstRoomFull),
      priorityActions: worstRoomFull.recommendations
    }
  };
}

/**
 * Analyzes a full batch of rooms at once and returns aggregate
 * best/worst room info + per-room recommendation cards, matching
 * what compare.js builds client-side from the `rooms` array.
 */
function analyzeRoomBatch(roomsInput) {
  if (!Array.isArray(roomsInput) || roomsInput.length === 0) {
    const err = new Error('rooms must be a non-empty array');
    err.status = 400;
    throw err;
  }

  const rooms = roomsInput.map((room, idx) => analyzeRoom(room, idx + 1));

  const bestRoom = rooms.reduce((best, current) => (current.aqi < best.aqi ? current : best), rooms[0]);
  const worstRoom = rooms.reduce((worst, current) => (current.aqi > worst.aqi ? current : worst), rooms[0]);

  const recommendationCards = rooms.map((room) => ({
    roomName: room.name,
    aqi: room.aqi,
    status: room.status,
    recommendation: room.recommendations && room.recommendations.length
      ? room.recommendations.slice(0, 3).join(' ')
      : whatToDoFor(room)
  }));

  return {
    rooms,
    savedRoomCount: rooms.length,
    bestRoom: { name: bestRoom.name, aqi: bestRoom.aqi },
    worstRoom: { name: worstRoom.name, aqi: worstRoom.aqi },
    recommendationCards,
    overallRecommendation: buildOverallRecommendation(rooms, bestRoom, worstRoom)
  };
}

module.exports = {
  calculateRoomScore,
  buildRoomRecommendations,
  validateRoomInput,
  analyzeRoom,
  analyzeRoomBatch
};
