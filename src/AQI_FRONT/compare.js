// ── Config ────────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:8000";

// ── State ─────────────────────────────────────────────────────────────────────
let savedRooms = []; // { name, iaq, label, confidence, metrics, recommendations }

// ── DOM refs ──────────────────────────────────────────────────────────────────
const roomForm          = document.getElementById("roomForm");
const resultsContent    = document.getElementById("resultsContent");
const resultsPlaceholder = document.getElementById("resultsPlaceholder");
const roomStatusMini    = document.getElementById("roomStatusMini");
const compareBtn        = document.getElementById("compareBtn");
const resetFormBtn      = document.getElementById("resetFormBtn");

// Header chips
const savedRoomCount  = document.getElementById("savedRoomCount");
const bestRoomDisplay = document.getElementById("bestRoomDisplay");
const worstRoomDisplay = document.getElementById("worstRoomDisplay");

// Live result
const aqiValue      = document.getElementById("aqiValue");
const aqiRing       = document.getElementById("aqiRing");
const aqiStatusPill = document.getElementById("aqiStatusPill");
const summaryHeading = document.getElementById("summaryHeading");
const summaryText    = document.getElementById("summaryText");
const roomChipsRow   = document.getElementById("roomChipsRow");

// Recommendations section
const recommendationsGrid  = document.getElementById("recommendationsGrid");
const recommendationsEmpty = document.getElementById("recommendationsEmpty");
const recommendationsSection = document.getElementById("recommendationsSection");

// Modal
const modal          = document.getElementById("roomDetailModal");
const modalCloseBtn  = document.getElementById("modalCloseBtn");
const modalDismissBtn = document.getElementById("modalDismissBtn");

// ── Helpers ───────────────────────────────────────────────────────────────────
function labelClass(label) {
  return { Good: "good", Moderate: "moderate", Poor: "poor" }[label] || "";
}

function updateHeaderChips() {
  savedRoomCount.textContent = savedRooms.length;

  if (savedRooms.length === 0) {
    bestRoomDisplay.textContent  = "—";
    worstRoomDisplay.textContent = "—";
    return;
  }

  const sorted = [...savedRooms].sort((a, b) => a.iaq - b.iaq);
  bestRoomDisplay.textContent  = sorted[0].name;
  worstRoomDisplay.textContent = sorted[sorted.length - 1].name;
}

// ── Render live result panel ──────────────────────────────────────────────────
function renderLiveResult(room) {
  const cls = labelClass(room.label);

  aqiValue.textContent = room.iaq;
  aqiRing.className    = `aqi-ring ${cls}`;

  aqiStatusPill.textContent = room.label.toUpperCase();
  aqiStatusPill.className   = `status-pill status-${cls}`;

  const headings = {
    Good:     "Air quality is excellent!",
    Moderate: "Air quality is acceptable.",
    Poor:     "Air quality is poor — take action.",
  };
  summaryHeading.textContent = headings[room.label] || room.label;
  summaryText.textContent    = `"${room.name}" · Confidence: ${room.confidence}%`;

  // Show results panel
  if (resultsPlaceholder) resultsPlaceholder.style.display = "none";
  resultsContent.style.display = "";

  renderRoomChips();
}

// ── Room chips (saved rooms strip) ────────────────────────────────────────────
function renderRoomChips() {
  if (!roomChipsRow) return;
  roomChipsRow.innerHTML = savedRooms
    .map((r, i) => `
      <button type="button" class="room-chip ${labelClass(r.label)}" data-index="${i}">
        <span class="chip-name">${r.name}</span>
        <span class="chip-score">${r.iaq}</span>
      </button>`)
    .join("");

  roomChipsRow.querySelectorAll(".room-chip").forEach(chip => {
    chip.addEventListener("click", () => openModal(parseInt(chip.dataset.index)));
  });
}

// ── Recommendations grid ──────────────────────────────────────────────────────
function renderRecommendationsGrid() {
  if (savedRooms.length === 0) {
    if (recommendationsEmpty) recommendationsEmpty.style.display = "";
    return;
  }
  if (recommendationsEmpty) recommendationsEmpty.style.display = "none";

  recommendationsGrid.innerHTML = savedRooms
    .map(r => `
      <div class="rec-card ${labelClass(r.label)}">
        <div class="rec-card-header">
          <strong>${r.name}</strong>
          <span class="status-pill status-${labelClass(r.label)}">${r.label}</span>
        </div>
        <div class="rec-card-score">IAQ ${r.iaq} · ${r.confidence}% confidence</div>
        <ul class="rec-list">
          ${r.recommendations.map(rec => `<li><i class="ti ti-circle-check"></i>${rec}</li>`).join("")}
        </ul>
      </div>`)
    .join("");
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(index) {
  const r = savedRooms[index];
  if (!r) return;

  document.getElementById("modalTitle").textContent      = `${r.name} Analysis`;
  document.getElementById("modalTitleSmall").textContent = r.name;
  document.getElementById("modalAqi").textContent        = `IAQ ${r.iaq}`;
  document.getElementById("modalStatus").textContent     = r.label;
  document.getElementById("modalStatus").className       = `status-${labelClass(r.label)}`;
  document.getElementById("modalCo2").textContent        = `${r.metrics.co2.value} ppm`;
  document.getElementById("modalTemperature").textContent = `${r.metrics.temperature.value}°C`;
  document.getElementById("modalHumidity").textContent   = `${r.metrics.humidity.value}%`;
  document.getElementById("modalOccupancy").textContent  = r.occupancy;
  document.getElementById("modalWindow").textContent     = r.window;
  document.getElementById("modalMonth").textContent      = r.month;

  modal.hidden = false;
}

function closeModal() { modal.hidden = true; }

if (modalCloseBtn)  modalCloseBtn.addEventListener("click",  closeModal);
if (modalDismissBtn) modalDismissBtn.addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

// ── API call ──────────────────────────────────────────────────────────────────
async function analyzeRoom(payload) {
  const res = await fetch(`${API_URL}/api/predict`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

// ── Form submit ───────────────────────────────────────────────────────────────
roomForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd       = new FormData(roomForm);
  const roomName = (fd.get("roomName") || "").trim() || `Room ${savedRooms.length + 1}`;

  const payload = {
    co2:         parseFloat(fd.get("roomCo2")),
    temperature: parseFloat(fd.get("roomTemperature")),
    humidity:    parseFloat(fd.get("roomHumidity")),
    occupancy:   parseInt(fd.get("roomOccupancy")),
    window:      fd.get("roomWindowStatus"),
    month:       fd.get("roomMonth"),
  };

  // Basic validation
  if (Object.values(payload).some(v => isNaN(v) || v === null || v === undefined)) {
    alert("Please fill in all fields before analyzing.");
    return;
  }

  // UI: loading
  const submitBtn = roomForm.querySelector("[type=submit]");
  submitBtn.disabled    = true;
  submitBtn.textContent = "Analyzing…";
  if (roomStatusMini) { roomStatusMini.textContent = "Analyzing…"; roomStatusMini.className = "compare-live-pill loading"; }

  try {
    const data = await analyzeRoom(payload);

    const room = {
      name:            roomName,
      iaq:             data.iaq,
      label:           data.label,
      confidence:      data.confidence,
      recommendations: data.recommendations,
      metrics:         data.metrics,
      occupancy:       payload.occupancy,
      window:          payload.window,
      month:           payload.month,
    };

    savedRooms.push(room);

    renderLiveResult(room);
    updateHeaderChips();

    // Enable compare button after 1st room
    compareBtn.disabled = savedRooms.length < 1;

    if (roomStatusMini) { roomStatusMini.textContent = "Saved ✓"; roomStatusMini.className = "compare-live-pill success"; }
    setTimeout(() => {
      if (roomStatusMini) { roomStatusMini.textContent = "Ready"; roomStatusMini.className = "compare-live-pill"; }
    }, 2000);

  } catch (err) {
    alert(`❌ Analysis failed: ${err.message}\n\nMake sure the backend is running:\n  python run.py`);
    if (roomStatusMini) { roomStatusMini.textContent = "Error"; roomStatusMini.className = "compare-live-pill error"; }
    console.error(err);
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Analyze & Save";
  }
});

// ── Compare / Get Recommendations ─────────────────────────────────────────────
compareBtn.addEventListener("click", () => {
  renderRecommendationsGrid();
  recommendationsSection.scrollIntoView({ behavior: "smooth" });
});

// ── Reset form ────────────────────────────────────────────────────────────────
if (resetFormBtn) {
  resetFormBtn.addEventListener("click", () => {
    roomForm.reset();
    if (roomStatusMini) { roomStatusMini.textContent = "Ready"; roomStatusMini.className = "compare-live-pill"; }
  });
}

// ── Navbar scroll ─────────────────────────────────────────────────────────────
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 50);
}, { passive: true });
