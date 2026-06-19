const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let speechRecognition = null;
let activeField = null;
let currentListeningButton = null;

const fields = {
  co2: document.getElementById('co2'),
  temperature: document.getElementById('temperature'),
  humidity: document.getElementById('humidity'),
  occupancy: document.getElementById('occupancy'),
};

const form = document.getElementById('airForm');
const predictBtn = document.getElementById('predictBtn');
const globalMic = document.getElementById('globalMic');
const voiceStatus = document.getElementById('voiceStatus');
const resultsPanel = document.getElementById('resultsPanel');
const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const resultsContent = document.getElementById('resultsContent');
const readRecommendationsBtn = document.getElementById('readRecommendationsBtn');
const micHelperText = document.getElementById('micHelperText');

const aqiValue = document.getElementById('aqiValue');
const aqiStatusPill = document.getElementById('aqiStatusPill');
const summaryHeading = document.getElementById('summaryHeading');
const summaryText = document.getElementById('summaryText');
const metaCo2 = document.getElementById('metaCo2');
const metaTemperature = document.getElementById('metaTemperature');
const metaHumidity = document.getElementById('metaHumidity');
const metaCo2Status = document.getElementById('metaCo2Status');
const metaTemperatureStatus = document.getElementById('metaTemperatureStatus');
const metaHumidityStatus = document.getElementById('metaHumidityStatus');
const recommendationsList = document.getElementById('recommendationsList');
const aqiRing = document.getElementById('aqiRing');

const monthSelect = document.getElementById('month');

const numberWords = {
  zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17,
  eighteen:18, nineteen:19, twenty:20, thirty:30, forty:40, fourty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90,
  hundred:100, thousand:1000,
};

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function extractNumber(text) {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g,' ');
  const wordMatches = normalized.split(/\s+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let foundNumber = false;

  for (const token of wordMatches) {
    if (numberWords[token] !== undefined) {
      const value = numberWords[token];
      if (value === 100) {
        current = current === 0 ? 100 : current * 100;
      } else if (value === 1000) {
        current = (current === 0 ? 1 : current) * 1000;
        total += current;
        current = 0;
      } else {
        current += value;
      }
      foundNumber = true;
    } else if (/\d+/.test(token)) {
      const numeric = Number(token);
      current += numeric;
      foundNumber = true;
    }
  }

  if (!foundNumber) return null;

  total += current;
  return total || null;
}

function setMicState(button, listening) {
  if (!button) return;
  button.classList.toggle('mic-listening', listening);
  if (button === globalMic) {
    micHelperText.textContent = listening ? 'Listening...' : 'Use the microphone for voice input';
    micHelperText.classList.toggle('listening', listening);
  } else if (button.dataset.target) {
    const field = fields[button.dataset.target];
    const label = field?.previousElementSibling ? field.previousElementSibling.textContent : 'field';
    micHelperText.textContent = listening ? `Listening for ${label}` : 'Use the microphone for voice input';
    micHelperText.classList.toggle('listening', listening);
  }
}

function initializeRecognition() {
  if (!recognition) {
    voiceStatus.textContent = 'Voice input unavailable';
    return;
  }

  speechRecognition = new recognition();
  speechRecognition.lang = 'en-US';
  speechRecognition.interimResults = false;
  speechRecognition.maxAlternatives = 1;

  speechRecognition.onstart = () => {
    voiceStatus.textContent = 'Listening...';
    setMicState(currentListeningButton, true);
  };

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    voiceStatus.textContent = `Heard: ${transcript}`;
    applyVoiceTranscript(transcript);
  };

  speechRecognition.onerror = (event) => {
    setMicState(currentListeningButton, false);
    voiceStatus.textContent = `Voice input issue: ${event.error}`;
  };

  speechRecognition.onend = () => {
    setMicState(currentListeningButton, false);
    currentListeningButton = null;
    activeField = null;
    voiceStatus.textContent = 'Voice input ready';
  };
}

function applyVoiceTranscript(transcript) {
  const normalized = transcript.toLowerCase();

  if (normalized.includes('window open')) {
    document.getElementById('windowStatus').value = 'Open';
    return;
  }
  if (normalized.includes('window closed')) {
    document.getElementById('windowStatus').value = 'Closed';
    return;
  }

  for (const month of months) {
    if (normalized.includes(month.toLowerCase())) {
      monthSelect.value = month;
      return;
    }
  }

  if (activeField) {
    const target = activeField.id;
    const value = extractNumber(normalized);
    if (value !== null) {
      activeField.value = value;
      activeField = null;
      return;
    }
  }

  if (normalized.includes('temperature') || normalized.includes('temp')) {
    const value = extractNumber(normalized);
    if (value !== null) fields.temperature.value = value;
    return;
  }

  if (normalized.includes('humidity')) {
    const value = extractNumber(normalized);
    if (value !== null) fields.humidity.value = value;
    return;
  }

  if (normalized.includes('co2') || normalized.includes('carbon dioxide')) {
    const value = extractNumber(normalized);
    if (value !== null) fields.co2.value = value;
    return;
  }

  if (normalized.includes('occupancy') || normalized.includes('people')) {
    const value = extractNumber(normalized);
    if (value !== null) fields.occupancy.value = value;
  }
}

function setActiveField(field) {
  activeField = field;
  const label = field.previousElementSibling ? field.previousElementSibling.textContent : 'field';
  voiceStatus.textContent = `Listening for ${label}`;
  if (speechRecognition) {
    speechRecognition.start();
  }
}

function updatePlaceholder() {
  resultsPlaceholder.style.display = 'none';
  resultsContent.classList.remove('active');
  readRecommendationsBtn.disabled = true;
}

function applyBadgeTone(element, tone) {
  const palette = {
    good: { background: 'rgba(18, 189, 193, 0.12)', color: '#0c8b91', borderColor: 'rgba(18, 189, 193, 0.24)' },
    moderate: { background: 'rgba(31, 196, 202, 0.16)', color: '#0f9ba8', borderColor: 'rgba(31, 196, 202, 0.26)' },
    bad: { background: 'rgba(255, 178, 64, 0.15)', color: '#ba8c08', borderColor: 'rgba(255, 178, 64, 0.26)' },
    dangerous: { background: 'rgba(255, 104, 104, 0.14)', color: '#dc5353', borderColor: 'rgba(255, 104, 104, 0.24)' }
  };

  const toneKey = palette[tone] ? tone : 'good';
  const styles = palette[toneKey];
  element.style.background = styles.background;
  element.style.color = styles.color;
  element.style.borderColor = styles.borderColor;
}

function buildRecommendations(co2, humidity, occupancy, temperature, windowStatus, aqi, status) {
  const recommendations = [];
  const softMaintenance = [
    {
      title: 'Light airflow check',
      text: 'Keep gentle circulation running to preserve steady indoor freshness and avoid stagnant air.',
      icon: 'ti ti-refresh-dot'
    },
    {
      title: 'Temperature balance',
      text: 'Maintain comfortable thermal levels and keep vents unobstructed for stable room conditions.',
      icon: 'ti ti-temperature'
    }
  ];

  if (co2 >= 900) {
    recommendations.push({
      title: 'Ventilate more often',
      text: `CO2 is elevated at ${co2} ppm. Open windows or increase fresh-air exchange to dilute buildup.`,
      icon: 'ti ti-wind'
    });
  }

  if (windowStatus === 'Closed' && (co2 >= 900 || aqi >= 60)) {
    recommendations.push({
      title: 'Airflow reset',
      text: `Fresh air is restricted while the room is under stress. Open windows or activate ventilation to recover indoor quality.`,
      icon: 'ti ti-window-open'
    });
  }

  if (humidity >= 55) {
    recommendations.push({
      title: 'Reduce moisture',
      text: `Humidity is ${humidity}%. Use airflow, dehumidification, or moisture control to bring conditions back down.`,
      icon: 'ti ti-droplet-half'
    });
  }

  if (occupancy >= 5) {
    recommendations.push({
      title: 'Lower crowding',
      text: `Occupancy is ${occupancy}. Reduce density or rotate people so heat and CO2 don’t build up as quickly.`,
      icon: 'ti ti-users'
    });
  }

  if (aqi >= 70) {
    recommendations.push({
      title: 'Use filtration',
      text: `AQI is elevated at ${aqi}. Run a purifier or boost ventilation until readings recover.`,
      icon: 'ti ti-filter'
    });
  }

  if (status === 'GOOD') {
    softMaintenance.forEach(item => recommendations.push(item));
  } else if (status === 'MODERATE') {
    recommendations.push({
      title: 'Monitor room trends',
      text: 'Keep checking airflow and occupancy patterns so the room stays comfortable through the day.',
      icon: 'ti ti-chart-arcs'
    });
    recommendations.push({
      title: 'Check moisture levels',
      text: 'Humidity is affecting comfort; adjust ventilation or damp control to stabilize the space.',
      icon: 'ti ti-droplet'
    });
  } else if (status === 'BAD' || status === 'DANGEROUS') {
    recommendations.push({
      title: 'Act now',
      text: 'The room needs immediate fresh-air correction to bring readings back toward safe levels.',
      icon: 'ti ti-alert-triangle'
    });
    recommendations.push({
      title: 'Limit crowding',
      text: 'Reduce occupant load and keep doors or vents open to quickly release trapped air.',
      icon: 'ti ti-user-x'
    });
  }

  const prioritized = [];
  const seen = new Set();
  recommendations.forEach(item => {
    const signature = item.title;
    if (!seen.has(signature)) {
      seen.add(signature);
      prioritized.push(item);
    }
  });

  if (status === 'GOOD') {
    return prioritized.slice(0, 2);
  }

  if (status === 'MODERATE') {
    return prioritized.slice(0, 3);
  }

  return prioritized.slice(0, 4);
}

function getStatusTone(status) {
  if (status === 'GOOD') return 'good';
  if (status === 'MODERATE') return 'moderate';
  if (status === 'BAD') return 'bad';
  return 'dangerous';
}

function buildRingGradient(status, percentage) {
  const colors = {
    GOOD: ['rgba(16,185,129,0.96)', 'rgba(20,184,166,0.82)'],
    MODERATE: ['rgba(26,199,206,0.96)', 'rgba(57,166,255,0.82)'],
    BAD: ['rgba(251,191,36,0.96)', 'rgba(245,158,11,0.82)'],
    DANGEROUS: ['rgba(248,113,113,0.96)', 'rgba(239,68,68,0.84)']
  };

  const [leadColor, accentColor] = colors[status];
  return `conic-gradient(from 180deg, ${leadColor}, ${accentColor} ${percentage}%, rgba(220,229,236,0.95) ${percentage}% 100%)`;
}

function computePrediction() {
  const co2 = Number(document.getElementById('co2').value || 0);
  const temperature = Number(document.getElementById('temperature').value || 0);
  const humidity = Number(document.getElementById('humidity').value || 0);
  const occupancy = Number(document.getElementById('occupancy').value || 0);
  const windowStatus = document.getElementById('windowStatus').value;
  const month = monthSelect.value;

  let score = 26;
  score += Math.max(0, (co2 - 650)) * 0.032;
  score += Math.max(0, (humidity - 45)) * 1.1;
  score += Math.max(0, (occupancy - 3)) * 8;
  score += Math.max(0, Math.abs(temperature - 22)) * 2.2;

  if (windowStatus === 'Closed') score += 18;
  if (windowStatus === 'Closed' && co2 >= 1000) score += 16;
  if (humidity >= 60) score += 9;
  if (occupancy >= 6) score += 9;
  if (['January','February','December'].includes(month)) score += 5;
  if (['June','July','August'].includes(month)) score += 3;

  const aqi = clamp(Math.round(score), 20, 170);
  const status = aqi < 50 ? 'GOOD' : aqi < 80 ? 'MODERATE' : aqi < 110 ? 'BAD' : 'DANGEROUS';

  const statusText = {
    GOOD: 'Clean indoor air is holding steady with balanced ventilation.',
    MODERATE: 'Air quality is acceptable, but ventilation and monitoring are recommended.',
    BAD: 'Air quality is elevated and needs attention to keep conditions comfortable.',
    DANGEROUS: 'Air quality is unsafe. Immediate ventilation or evacuation is recommended.'
  }[status];

  const recommendations = buildRecommendations(co2, humidity, occupancy, temperature, windowStatus, aqi, status);
  const percentage = (aqi / 170) * 100;

  aqiValue.textContent = aqi;
  aqiStatusPill.textContent = status;
  aqiStatusPill.dataset.status = status.toLowerCase();
  applyBadgeTone(aqiStatusPill, getStatusTone(status));
  summaryHeading.textContent = status === 'GOOD' ? 'Clean air' : status === 'MODERATE' ? 'Stable with watch' : status === 'BAD' ? 'Attention needed' : 'Immediate action';
  summaryText.textContent = statusText;
  metaCo2.textContent = `${co2} ppm`;
  metaTemperature.textContent = `${temperature}°C`;
  metaHumidity.textContent = `${humidity}%`;

  metaCo2Status.textContent = co2 < 900 ? 'Fresh' : co2 < 1200 ? 'Watch' : 'High';
  metaTemperatureStatus.textContent = temperature < 20 ? 'Cool' : temperature < 26 ? 'Stable' : 'Warm';
  metaHumidityStatus.textContent = humidity < 35 ? 'Dry' : humidity < 60 ? 'Balanced' : 'Humid';

  applyBadgeTone(metaCo2Status, co2 < 900 ? 'good' : co2 < 1200 ? 'moderate' : 'dangerous');
  applyBadgeTone(metaTemperatureStatus, temperature < 20 ? 'good' : temperature < 26 ? 'moderate' : 'bad');
  applyBadgeTone(metaHumidityStatus, humidity < 35 ? 'moderate' : humidity < 60 ? 'good' : 'bad');

  aqiRing.dataset.status = status;
  aqiRing.classList.remove('status-good', 'status-moderate', 'status-bad', 'status-dangerous');
  aqiRing.classList.add(status === 'GOOD' ? 'status-good' : status === 'MODERATE' ? 'status-moderate' : status === 'BAD' ? 'status-bad' : 'status-dangerous');
  aqiRing.style.background = buildRingGradient(status, percentage);
  aqiRing.style.transform = 'scale(1.04)';
  requestAnimationFrame(() => {
    aqiRing.style.transform = 'scale(1)';
  });

  recommendationsList.innerHTML = recommendations.map(item => `
    <article class="recommendation-card">
      <div class="rec-icon"><i class="${item.icon}"></i></div>
      <div>
        <strong>${item.title}</strong>
        <p>${item.text}</p>
      </div>
    </article>
  `).join('');

  const recommendationCards = recommendationsList.querySelectorAll('.recommendation-card');
  recommendationCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 110}ms`;
    card.classList.remove('reveal');
    void card.offsetWidth;
    card.classList.add('reveal');
  });

  resultsPlaceholder.style.display = 'none';
  resultsContent.classList.remove('active');
  void resultsContent.offsetWidth;
  resultsContent.classList.add('active');
  readRecommendationsBtn.disabled = false;

  if (status === 'DANGEROUS') {
    speakAlert('Dangerous air detected.');
  }
}

function speakAlert(alertMessage) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(alertMessage);
    utterance.rate = 0.96;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  }
}

function speakRecommendations() {
  if (!('speechSynthesis' in window)) return;
  const recommendations = Array.from(document.querySelectorAll('.recommendation-card p')).map(item => item.textContent);
  if (!recommendations.length) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`Recommendations: ${recommendations.join(' ')}`);
  utterance.rate = 0.96;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function startRecognition(targetField) {
  if (!speechRecognition) {
    initializeRecognition();
  }
  if (!speechRecognition) return;

  activeField = targetField;
  currentListeningButton = targetField ? document.querySelector(`[data-target="${targetField.id}"]`) : globalMic;
  setMicState(currentListeningButton, true);

  try {
    speechRecognition.start();
  } catch (error) {
    setMicState(currentListeningButton, false);
    currentListeningButton = null;
    voiceStatus.textContent = 'Voice input issue: start failed';
  }
}

Array.from(document.querySelectorAll('.mini-mic')).forEach(button => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;
    const field = document.getElementById(target);
    startRecognition(field);
  });
});

globalMic.addEventListener('click', () => {
  startRecognition(null);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  predictBtn.disabled = true;
  predictBtn.textContent = 'Analyzing...';

  const co2 = Number(document.getElementById('co2').value || 0);
  const temperature = Number(document.getElementById('temperature').value || 0);
  const humidity = Number(document.getElementById('humidity').value || 0);
  const occupancy = Number(document.getElementById('occupancy').value || 0);
  const windowStatus = document.getElementById('windowStatus').value;
  const month = monthSelect.value;

  let usedApi = false;

  try {
    const res = await fetch('http://127.0.0.1:5000/api/quick-scan/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ co2, temperature, humidity, occupancy, windowStatus, month })
    });

    if (res.ok) {
      const { data } = await res.json();
      const { aqi, status, percentage, summary, metrics, recommendations, shouldSpeakAlert } = data;

      aqiValue.textContent = aqi;
      aqiStatusPill.textContent = status;
      aqiStatusPill.dataset.status = status.toLowerCase();
      applyBadgeTone(aqiStatusPill, getStatusTone(status));
      summaryHeading.textContent = summary.heading;
      summaryText.textContent = summary.text;

      metaCo2.textContent = `${metrics.co2.value} ppm`;
      metaTemperature.textContent = `${metrics.temperature.value}°C`;
      metaHumidity.textContent = `${metrics.humidity.value}%`;
      metaCo2Status.textContent = metrics.co2.status;
      metaTemperatureStatus.textContent = metrics.temperature.status;
      metaHumidityStatus.textContent = metrics.humidity.status;

      applyBadgeTone(metaCo2Status, metrics.co2.status === 'Fresh' ? 'good' : metrics.co2.status === 'Watch' ? 'moderate' : 'dangerous');
      applyBadgeTone(metaTemperatureStatus, metrics.temperature.status === 'Cool' ? 'good' : metrics.temperature.status === 'Stable' ? 'moderate' : 'bad');
      applyBadgeTone(metaHumidityStatus, metrics.humidity.status === 'Dry' ? 'moderate' : metrics.humidity.status === 'Balanced' ? 'good' : 'bad');

      aqiRing.dataset.status = status;
      aqiRing.classList.remove('status-good', 'status-moderate', 'status-bad', 'status-dangerous');
      aqiRing.classList.add(status === 'GOOD' ? 'status-good' : status === 'MODERATE' ? 'status-moderate' : status === 'BAD' ? 'status-bad' : 'status-dangerous');
      aqiRing.style.background = buildRingGradient(status, percentage);
      aqiRing.style.transform = 'scale(1.04)';
      requestAnimationFrame(() => { aqiRing.style.transform = 'scale(1)'; });

      recommendationsList.innerHTML = recommendations.map(item => `
        <article class="recommendation-card">
          <div class="rec-icon"><i class="${item.icon}"></i></div>
          <div><strong>${item.title}</strong><p>${item.text}</p></div>
        </article>`).join('');

      recommendationsList.querySelectorAll('.recommendation-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 110}ms`;
        card.classList.remove('reveal');
        void card.offsetWidth;
        card.classList.add('reveal');
      });

      resultsPlaceholder.style.display = 'none';
      resultsContent.classList.remove('active');
      void resultsContent.offsetWidth;
      resultsContent.classList.add('active');
      readRecommendationsBtn.disabled = false;

      if (shouldSpeakAlert) speakAlert('Dangerous air detected.');
      usedApi = true;
    }
  } catch (err) {
    // الباك مش شغال — رح نستخدم الحساب المحلي
  }

  if (!usedApi) {
    computePrediction();
  }

  predictBtn.disabled = false;
  predictBtn.textContent = 'Predict Air Quality';
});

readRecommendationsBtn.addEventListener('click', speakRecommendations);

initializeRecognition();
updatePlaceholder();
