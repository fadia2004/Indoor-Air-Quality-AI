/**
 * Quick Scan scoring engine.
 * This mirrors EXACTLY the formula implemented client-side in
 * AQII_front/js/quick-scan.js -> computePrediction()
 * so that backend predictions stay consistent with what the
 * frontend previously computed locally.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function computeAqi({ co2, temperature, humidity, occupancy, windowStatus, month }) {
  let score = 26;
  score += Math.max(0, co2 - 650) * 0.032;
  score += Math.max(0, humidity - 45) * 1.1;
  score += Math.max(0, occupancy - 3) * 8;
  score += Math.max(0, Math.abs(temperature - 22)) * 2.2;

  if (windowStatus === 'Closed') score += 18;
  if (windowStatus === 'Closed' && co2 >= 1000) score += 16;
  if (humidity >= 60) score += 9;
  if (occupancy >= 6) score += 9;
  if (['January', 'February', 'December'].includes(month)) score += 5;
  if (['June', 'July', 'August'].includes(month)) score += 3;

  return clamp(Math.round(score), 20, 170);
}

function statusFromAqi(aqi) {
  if (aqi < 50) return 'GOOD';
  if (aqi < 80) return 'MODERATE';
  if (aqi < 110) return 'BAD';
  return 'DANGEROUS';
}

const STATUS_TEXT = {
  GOOD: 'Clean indoor air is holding steady with balanced ventilation.',
  MODERATE: 'Air quality is acceptable, but ventilation and monitoring are recommended.',
  BAD: 'Air quality is elevated and needs attention to keep conditions comfortable.',
  DANGEROUS: 'Air quality is unsafe. Immediate ventilation or evacuation is recommended.'
};

const SUMMARY_HEADING = {
  GOOD: 'Clean air',
  MODERATE: 'Stable with watch',
  BAD: 'Attention needed',
  DANGEROUS: 'Immediate action'
};

/**
 * Fixed, simple-language recommendation texts.
 * Same condition always produces the exact same wording (no randomness),
 * and titles/text avoid technical jargon so a regular user understands
 * the action immediately.
 */
function buildRecommendations({ co2, humidity, occupancy, temperature, windowStatus, status }) {
  if (status === 'GOOD') {
    return [
      {
        title: 'Keep up the ventilation',
        text: 'Keep opening the windows and maintain the current ventilation.',
        icon: 'ti ti-refresh-dot'
      },
      {
        title: 'Maintain the current setup',
        text: 'Keep the same number of people and activity level, the room is in good condition.',
        icon: 'ti ti-check'
      }
    ];
  }

  const recommendations = [];

  if (co2 >= 900) {
    recommendations.push({
      title: 'Ventilate the air',
      text: 'Open the windows or turn on the ventilation system to bring in fresh air and reduce CO2.',
      icon: 'ti ti-wind'
    });
  }

  if (humidity >= 55) {
    recommendations.push({
      title: 'Reduce humidity',
      text: 'Lower the humidity through ventilation or by using an AC or dehumidifier.',
      icon: 'ti ti-droplet-half'
    });
  }

  if (occupancy >= 5) {
    recommendations.push({
      title: 'Reduce the number of people',
      text: 'Reduce the number of people in the room if possible, or rotate them in shifts.',
      icon: 'ti ti-users'
    });
  }

  if (windowStatus === 'Closed') {
    recommendations.push({
      title: 'Open the window',
      text: 'Open the window or turn on fans to improve air circulation.',
      icon: 'ti ti-window-open'
    });
  }

  if (Math.abs(temperature - 22) >= 4) {
    recommendations.push({
      title: 'Adjust the temperature',
      text: 'Adjust the AC or heater to keep the temperature between 20 and 24 degrees.',
      icon: 'ti ti-temperature'
    });
  }

  if (status === 'BAD' || status === 'DANGEROUS') {
    recommendations.push({
      title: 'Check the ventilation system',
      text: 'Check that the ventilation system is working properly.',
      icon: 'ti ti-settings'
    });
  }

  if (status === 'DANGEROUS') {
    recommendations.unshift({
      title: 'Act immediately',
      text: 'Act immediately: open the windows, reduce the number of people, and check the ventilation quickly.',
      icon: 'ti ti-alert-triangle'
    });
  }

  const prioritized = [];
  const seen = new Set();
  recommendations.forEach((item) => {
    if (!seen.has(item.title)) {
      seen.add(item.title);
      prioritized.push(item);
    }
  });

  const cap = status === 'MODERATE' ? 3 : status === 'BAD' ? 4 : 5;
  return prioritized.slice(0, cap);
}

function metaStatus({ co2, temperature, humidity }) {
  return {
    co2Status: co2 < 900 ? 'Fresh' : co2 < 1200 ? 'Watch' : 'High',
    temperatureStatus: temperature < 20 ? 'Cool' : temperature < 26 ? 'Stable' : 'Warm',
    humidityStatus: humidity < 35 ? 'Dry' : humidity < 60 ? 'Balanced' : 'Humid'
  };
}

/**
 * Validates and normalizes raw input coming from the Quick Scan form.
 * Throws an Error with .status = 400 on invalid input.
 */
function validateInput(body) {
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

  return { co2, temperature, humidity, occupancy, windowStatus, month };
}

/**
 * Runs a full Quick Scan prediction matching the frontend's
 * computePrediction() output shape (aqi, status, summary, metrics, recommendations).
 */
function predictQuickScan(rawInput) {
  const input = validateInput(rawInput);
  const aqi = computeAqi(input);
  const status = statusFromAqi(aqi);
  const percentage = (aqi / 170) * 100;
  const recommendations = buildRecommendations({ ...input, aqi, status });
  const meta = metaStatus(input);

  return {
    aqi,
    status,
    percentage,
    summary: {
      heading: SUMMARY_HEADING[status],
      text: STATUS_TEXT[status]
    },
    metrics: {
      co2: { value: input.co2, unit: 'ppm', status: meta.co2Status },
      temperature: { value: input.temperature, unit: '°C', status: meta.temperatureStatus },
      humidity: { value: input.humidity, unit: '%', status: meta.humidityStatus }
    },
    recommendations,
    shouldSpeakAlert: status === 'DANGEROUS',
    input
  };
}

module.exports = {
  MONTHS,
  clamp,
  computeAqi,
  statusFromAqi,
  buildRecommendations,
  validateInput,
  predictQuickScan
};
