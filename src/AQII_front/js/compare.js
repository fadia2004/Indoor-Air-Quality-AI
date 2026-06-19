// ===== ELEMENTS =====
const roomForm        = document.getElementById('roomForm');
const savedRoomCount  = document.getElementById('savedRoomCount');
const bestRoomDisplay = document.getElementById('bestRoomDisplay');
const worstRoomDisplay = document.getElementById('worstRoomDisplay');
const roomStatusMini  = document.getElementById('roomStatusMini');
const resetFormBtn    = document.getElementById('resetFormBtn');
const compareBtn      = document.getElementById('compareBtn');

// Right panel elements
const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const resultsContent     = document.getElementById('resultsContent');
const aqiValue           = document.getElementById('aqiValue');
const aqiStatusPill      = document.getElementById('aqiStatusPill');
const summaryHeading     = document.getElementById('summaryHeading');
const summaryText        = document.getElementById('summaryText');
const roomChipsRow       = document.getElementById('roomChipsRow');
const savedRoomsStrip    = document.getElementById('savedRoomsStrip');
const recommendationsGrid = document.getElementById('recommendationsGrid');
const recommendationsEmpty = document.getElementById('recommendationsEmpty');
const recommendationsSection = document.getElementById('recommendationsSection');

// Modal elements
const modalOverlay       = document.getElementById('roomDetailModal');
const modalTitle         = document.getElementById('modalTitle');
const modalAqi           = document.getElementById('modalAqi');
const modalStatus        = document.getElementById('modalStatus');
const modalCo2           = document.getElementById('modalCo2');
const modalTemperature   = document.getElementById('modalTemperature');
const modalHumidity      = document.getElementById('modalHumidity');
const modalOccupancy     = document.getElementById('modalOccupancy');
const modalWindow        = document.getElementById('modalWindow');
const modalMonth         = document.getElementById('modalMonth');
const modalCloseBtn      = document.getElementById('modalCloseBtn');
const modalDismissBtn    = document.getElementById('modalDismissBtn');

const rooms = [];
let selectedRoomIndex = null;
const statusColors = { Good: '#10b981', Moderate: '#f59e0b', Poor: '#ef4444' };

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function calculateRoomScore(inputs) {
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
  if (['January','February','December'].includes(month)) score += 5;
  if (['June','July','August'].includes(month)) score += 3;

  const aqi = clamp(Math.round(score), 20, 170);
  let status = 'Good';
  if (aqi >= 90) status = 'Poor';
  else if (aqi >= 50) status = 'Moderate';

  const recommendations = [];
  if (co2 >= 900) recommendations.push('Increase fresh air exchange');
  if (humidity >= 60) recommendations.push('Reduce moisture');
  if (occupancy >= 6) recommendations.push('Lower crowding or rotate use');
  if (windowStatus === 'Closed') recommendations.push('Open windows or boost ventilation');
  if (aqi >= 90) recommendations.push('Use filtration or schedule airflow checks');
  if (!recommendations.length) {
    recommendations.push('Maintain steady ventilation');
    recommendations.push('Keep monitoring conditions');
  }

  return {
    name: inputs.name || `Room ${rooms.length + 1}`,
    co2,
    temperature,
    humidity,
    occupancy,
    windowStatus,
    month,
    aqi,
    status,
    recommendations: recommendations.slice(0, 3)
  };
}

// Session-only storage: no persistent localStorage usage.
function loadRooms() {
  // intentionally no-op: do not restore rooms from localStorage
}

function saveRooms() {
  // intentionally no-op: do not persist rooms to localStorage
}

function openRoomModal(index) {
  const room = rooms[index];
  if (!room || !modalOverlay) return;

  modalTitle.textContent = `${room.name} Analysis`;
  modalAqi.textContent = room.aqi;
  modalStatus.textContent = room.status.toUpperCase();
  modalCo2.textContent = `${room.co2} ppm`;
  modalTemperature.textContent = `${room.temperature}°C`;
  modalHumidity.textContent = `${room.humidity}%`;
  modalOccupancy.textContent = room.occupancy;
  modalWindow.textContent = room.windowStatus;
  modalMonth.textContent = room.month;
  // set small title if present
  const modalTitleSmall = document.getElementById('modalTitleSmall');
  if (modalTitleSmall) modalTitleSmall.textContent = room.name;

  modalOverlay.hidden = false;
  window.requestAnimationFrame(() => modalOverlay.classList.add('visible'));
}

function closeRoomModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('visible');
  setTimeout(() => { modalOverlay.hidden = true; }, 220);
}

function renderSavedRoomCards() {
  if (!roomChipsRow) return;
  if (!rooms.length) {
    roomChipsRow.innerHTML = '';
    return;
  }

  roomChipsRow.innerHTML = rooms.map((room, index) => `
    <button type="button" class="room-chip room-chip-${room.status.toLowerCase()}${index === selectedRoomIndex ? ' selected' : ''}" data-index="${index}" aria-pressed="${index === selectedRoomIndex}">
      <div class="chip-title">${room.name}</div>
      <div class="chip-aqi">AQI <strong>${room.aqi}</strong></div>
      <div class="status-badge status-${room.status.toLowerCase()}">${room.status.toUpperCase()}</div>
    </button>`).join('');

  roomChipsRow.querySelectorAll('.room-chip').forEach(button => {
    const idx = Number(button.dataset.index);
    button.addEventListener('click', () => {
      selectedRoomIndex = idx;
      renderSavedRoomCards();
      openRoomModal(idx);
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectedRoomIndex = idx;
        renderSavedRoomCards();
        openRoomModal(idx);
      }
    });
  });
}






function getRecommendationForAQI(aqi) {
  if (aqi < 50) {
    return {
      status: 'Good',
      recommendation: 'Maintain current ventilation and keep monitoring the room conditions.'
    };
  }

  if (aqi <= 100) {
    return {
      status: 'Moderate',
      recommendation: 'Increase airflow, monitor CO2 and humidity, and reduce crowding if possible.'
    };
  }

  return {
    status: 'Poor',
    recommendation: 'Improve ventilation immediately, reduce occupancy, and check filtration performance.'
  };
}

function renderRecommendations() {
  if (!recommendationsGrid || !recommendationsEmpty) return;
  if (!rooms.length) {
    recommendationsGrid.innerHTML = '';
    recommendationsEmpty.style.display = 'flex';
    return;
  }

  recommendationsEmpty.style.display = 'none';
  recommendationsGrid.innerHTML = rooms.map(room => {
    const rec = getRecommendationForAQI(room.aqi);
    return `
      <article class="recommendation-card recommendation-card-${rec.status.toLowerCase()}">
        <div class="recommendation-card-header">
          <div>
            <span class="eyebrow">${rec.status} air</span>
            <h3>${room.name}</h3>
          </div>
          <div class="recommendation-aqi">AQI ${room.aqi}</div>
        </div>
        <div class="recommendation-meta">
          <span class="status-badge status-${rec.status.toLowerCase()}">${rec.status}</span>
        </div>
        <p class="recommendation-copy">${rec.recommendation}</p>
      </article>`;
  }).join('');
}

function showPlaceholder() {
  if (resultsPlaceholder) resultsPlaceholder.style.display = 'flex';
  if (resultsContent) resultsContent.style.display = 'none';
  if (savedRoomsStrip) savedRoomsStrip.style.display = 'none';
  if (compareBtn) compareBtn.disabled = true;
}

function showLatestResult() {
  if (!rooms.length) {
    showPlaceholder();
    return;
  }

  const room = rooms[rooms.length - 1];
  const ring = document.getElementById('aqiRing');
  if (ring) {
    ring.className = 'aqi-ring';
    const colorMap = statusColors;
    ring.style.background = `conic-gradient(from 180deg, ${colorMap[room.status]}, ${colorMap[room.status]}88, ${colorMap[room.status]})`;
    ring.style.boxShadow = `0 22px 42px ${colorMap[room.status]}33`;
  }

  if (aqiValue) aqiValue.textContent = room.aqi;
  if (aqiStatusPill) {
    aqiStatusPill.textContent = room.status.toUpperCase();
    aqiStatusPill.style.cssText = '';
    const pillColors = {
      Good:     'color:#10b981;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3)',
      Moderate: 'color:#f59e0b;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3)',
      Poor:     'color:#ef4444;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3)'
    };
    aqiStatusPill.style.cssText = pillColors[room.status] || '';
  }

  const titles = { Good: 'Clean air', Moderate: 'Acceptable air', Poor: 'Poor air quality' };
  const descs = {
    Good:     'Air quality is excellent and suitable for long-term occupancy.',
    Moderate: 'Air quality is acceptable but sensitive occupants may prefer additional ventilation.',
    Poor:     'Air quality is unhealthy. Improve ventilation immediately.'
  };
  if (summaryHeading) summaryHeading.textContent = titles[room.status] || room.status;
  if (summaryText) summaryText.textContent = descs[room.status] || '';

  if (resultsPlaceholder) resultsPlaceholder.style.display = 'none';
  if (resultsContent) {
    resultsContent.style.display = 'flex';
    resultsContent.style.flexDirection = 'column';
    resultsContent.style.gap = '1rem';
    resultsContent.classList.add('active');
  }

  renderSavedRoomCards();
  renderRecommendations();
  if (savedRoomsStrip) savedRoomsStrip.style.display = 'block';
  if (compareBtn) compareBtn.disabled = rooms.length < 1;
}

function updateDashboard() {
  if (savedRoomCount) savedRoomCount.textContent = rooms.length;
  if (!rooms.length) {
    if (bestRoomDisplay) bestRoomDisplay.textContent = '—';
    if (worstRoomDisplay) worstRoomDisplay.textContent = '—';
    if (compareBtn) compareBtn.disabled = true;
    return;
  }

  const bestRoom = rooms.reduce((best, current) => current.aqi < best.aqi ? current : best, rooms[0]);
  const worstRoom = rooms.reduce((worst, current) => current.aqi > worst.aqi ? current : worst, rooms[0]);

  if (bestRoomDisplay) bestRoomDisplay.textContent = `${bestRoom.name}, AQI ${bestRoom.aqi}`;
  if (worstRoomDisplay) worstRoomDisplay.textContent = `${worstRoom.name}, AQI ${worstRoom.aqi}`;
  if (compareBtn) compareBtn.disabled = false;
}

async function handleSubmit(e) {
  e.preventDefault();
  const fd = new FormData(roomForm);
  let name = String(fd.get('roomName') || '').trim();
  if (!name) name = `Room ${rooms.length + 1}`;

  const data = {
    name,
    co2:         Number(fd.get('roomCo2')),
    temperature: Number(fd.get('roomTemperature')),
    humidity:    Number(fd.get('roomHumidity')),
    occupancy:   Number(fd.get('roomOccupancy')),
    windowStatus:String(fd.get('roomWindowStatus')),
    month:       String(fd.get('roomMonth'))
  };

  if (isNaN(data.co2) || isNaN(data.temperature) || isNaN(data.humidity) || isNaN(data.occupancy)) {
    alert('Please enter all sensor values.');
    return;
  }

  const submitBtn = roomForm.querySelector('[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Analyzing...'; }

  let room = null;

  try {
    const res = await fetch('http://127.0.0.1:5000/api/rooms/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const json = await res.json();
      room = json.data.room;
    }
  } catch (err) {
    // الباك مش شغال — نحسب محلياً
  }

  if (!room) {
    room = calculateRoomScore(data);
  }

  rooms.push(room);
  showLatestResult();
  updateDashboard();
  resetForm();

  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Analyze & Save'; }
}

function resetForm() {
  roomForm.reset();
  document.getElementById('roomWindowStatus').value = 'Open';
  document.getElementById('roomMonth').value = 'January';
  if (roomStatusMini) roomStatusMini.textContent = 'Ready';
  document.getElementById('roomName').focus();
}

roomForm.addEventListener('submit', handleSubmit);
if (resetFormBtn) resetFormBtn.addEventListener('click', resetForm);
if (compareBtn) {
  compareBtn.addEventListener('click', async () => {
    if (!recommendationsSection) return;

    compareBtn.disabled = true;
    compareBtn.innerHTML = '<i class="ti ti-list-check"></i> Loading...';

    let usedApi = false;
    try {
      const res = await fetch('http://127.0.0.1:5000/api/rooms/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms })
      });

      if (res.ok) {
        const { data } = await res.json();
        if (bestRoomDisplay)  bestRoomDisplay.textContent  = `${data.bestRoom.name}, AQI ${data.bestRoom.aqi}`;
        if (worstRoomDisplay) worstRoomDisplay.textContent = `${data.worstRoom.name}, AQI ${data.worstRoom.aqi}`;

        if (recommendationsGrid && recommendationsEmpty) {
          recommendationsEmpty.style.display = 'none';
          recommendationsGrid.innerHTML = data.recommendationCards.map(card => `
            <article class="recommendation-card recommendation-card-${card.status.toLowerCase()}">
              <div class="recommendation-card-header">
                <div><span class="eyebrow">${card.status} air</span><h3>${card.roomName}</h3></div>
                <div class="recommendation-aqi">AQI ${card.aqi}</div>
              </div>
              <div class="recommendation-meta">
                <span class="status-badge status-${card.status.toLowerCase()}">${card.status}</span>
              </div>
              <p class="recommendation-copy">${card.recommendation}</p>
            </article>`).join('');
        }
        usedApi = true;
      }
    } catch (err) {
      // الباك مش شغال — نستخدم الحساب المحلي
    }

    if (!usedApi) {
      // حساب محلي من مصفوفة rooms
      if (rooms.length) {
        const bestRoom  = rooms.reduce((b, c) => c.aqi < b.aqi ? c : b, rooms[0]);
        const worstRoom = rooms.reduce((w, c) => c.aqi > w.aqi ? c : w, rooms[0]);
        if (bestRoomDisplay)  bestRoomDisplay.textContent  = `${bestRoom.name}, AQI ${bestRoom.aqi}`;
        if (worstRoomDisplay) worstRoomDisplay.textContent = `${worstRoom.name}, AQI ${worstRoom.aqi}`;
      }
      renderRecommendations();
      updateDashboard();
    }

    compareBtn.disabled = false;
    compareBtn.innerHTML = '<i class="ti ti-list-check"></i> Get Recommendations';
    recommendationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', event => {
    if (event.target === modalOverlay) closeRoomModal();
  });
}
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeRoomModal);
if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeRoomModal);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modalOverlay && !modalOverlay.hidden) closeRoomModal();
});

// Always start session empty (no persistent storage)
showPlaceholder();
updateDashboard();
