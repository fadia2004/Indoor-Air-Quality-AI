// ── Config ────────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:8000";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form            = document.getElementById("airForm");
const predictBtn      = document.getElementById("predictBtn");
const resultsContent  = document.getElementById("resultsContent");
const resultsPlaceholder = document.getElementById("resultsPlaceholder");

const aqiValue        = document.getElementById("aqiValue");
const aqiRing         = document.getElementById("aqiRing");
const aqiStatusPill   = document.getElementById("aqiStatusPill");
const summaryHeading  = document.getElementById("summaryHeading");
const summaryText     = document.getElementById("summaryText");

const metaCo2         = document.getElementById("metaCo2");
const metaCo2Status   = document.getElementById("metaCo2Status");
const metaTemperature = document.getElementById("metaTemperature");
const metaTemperatureStatus = document.getElementById("metaTemperatureStatus");
const metaHumidity    = document.getElementById("metaHumidity");
const metaHumidityStatus    = document.getElementById("metaHumidityStatus");

const recommendationsList   = document.getElementById("recommendationsList");
const readRecommendationsBtn = document.getElementById("readRecommendationsBtn");

// ── Set current month automatically ──────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const monthInput = document.getElementById("month");
if (monthInput) monthInput.value = MONTHS[new Date().getMonth()];

// ── Label → color class ───────────────────────────────────────────────────────
function labelClass(label) {
  return { Good: "good", Moderate: "moderate", Poor: "poor" }[label] || "";
}

// ── Render result ─────────────────────────────────────────────────────────────
function renderResult(data) {
  const cls = labelClass(data.label);

  // AQI ring
  aqiValue.textContent = data.iaq;
  aqiRing.className    = `aqi-ring ${cls}`;

  // Status pill
  aqiStatusPill.textContent = data.label.toUpperCase();
  aqiStatusPill.className   = `status-pill status-${cls}`;

  // Heading + text
  const headings = {
    Good:     "Air quality is excellent!",
    Moderate: "Air quality is acceptable.",
    Poor:     "Air quality is poor — take action.",
  };
  summaryHeading.textContent = headings[data.label] || data.label;
  summaryText.textContent    =
    `Confidence: ${data.confidence}% · IAQ Score: ${data.iaq}`;

  // Metrics
  metaCo2.textContent               = data.metrics.co2.value;
  metaCo2Status.textContent         = data.metrics.co2.status;
  metaCo2Status.className           = `metric-status-pill ${labelClass(data.metrics.co2.status)}`;

  metaTemperature.textContent       = data.metrics.temperature.value;
  metaTemperatureStatus.textContent = data.metrics.temperature.status;
  metaTemperatureStatus.className   = `metric-status-pill ${labelClass(data.metrics.temperature.status)}`;

  metaHumidity.textContent          = data.metrics.humidity.value;
  metaHumidityStatus.textContent    = data.metrics.humidity.status;
  metaHumidityStatus.className      = `metric-status-pill ${labelClass(data.metrics.humidity.status)}`;

  // Recommendations
  recommendationsList.innerHTML = data.recommendations
    .map(r => `<div class="recommendation-item"><i class="ti ti-circle-check"></i><span>${r}</span></div>`)
    .join("");

  // Enable TTS button
  readRecommendationsBtn.disabled = false;

  // Show results, hide placeholder
  if (resultsPlaceholder) resultsPlaceholder.style.display = "none";
  resultsContent.style.display = "";
}

// ── Loading state ─────────────────────────────────────────────────────────────
function setLoading(on) {
  predictBtn.disabled     = on;
  predictBtn.textContent  = on ? "Analyzing…" : "Predict Air Quality";
}

// ── Form submit ───────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoading(true);

  const fd = new FormData(form);

  const payload = {
    co2:         parseFloat(fd.get("co2")),
    temperature: parseFloat(fd.get("temperature")),
    humidity:    parseFloat(fd.get("humidity")),
    occupancy:   parseInt(fd.get("occupancy")),
    window:      fd.get("windowStatus"),
    month:       fd.get("month"),
  };

  try {
    const res = await fetch(`${API_URL}/api/predict`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    renderResult(data);

  } catch (err) {
    alert(`❌ Prediction failed: ${err.message}\n\nMake sure the backend is running:\n  python run.py`);
    console.error(err);
  } finally {
    setLoading(false);
  }
});

// ── Read Recommendations (TTS) ────────────────────────────────────────────────
readRecommendationsBtn.addEventListener("click", () => {
  const items = [...recommendationsList.querySelectorAll(".recommendation-item span")]
    .map(el => el.textContent)
    .join(". ");
  if (!items) return;

  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(items);
  utt.lang  = "en-US";
  utt.rate  = 0.95;
  window.speechSynthesis.speak(utt);
});

// ── Voice input (Web Speech API) ─────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const voiceStatus = document.getElementById("voiceStatus");

function setVoiceStatus(msg, cls = "") {
  if (!voiceStatus) return;
  voiceStatus.textContent = msg;
  voiceStatus.className   = `status-pill ${cls}`;
  voiceStatus.setAttribute("aria-hidden", msg ? "false" : "true");
}

// Mini mic buttons (per field)
document.querySelectorAll(".mini-mic").forEach(btn => {
  if (!SpeechRecognition) { btn.style.display = "none"; return; }

  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const input    = document.getElementById(targetId);
    if (!input) return;

    const rec = new SpeechRecognition();
    rec.lang  = "en-US";
    rec.start();
    setVoiceStatus("Listening…", "listening");
    btn.classList.add("active");

    rec.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript.trim();
      // Extract numbers from spoken text
      const num = parseFloat(transcript.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) input.value = num;
      else input.value = transcript; // fallback for non-numeric fields
      setVoiceStatus(`✓ "${transcript}"`, "success");
    };

    rec.onerror = (ev) => {
      setVoiceStatus(`Error: ${ev.error}`, "error");
    };

    rec.onend = () => {
      btn.classList.remove("active");
      setTimeout(() => setVoiceStatus(""), 2500);
    };
  });
});

// Global mic (fills all fields from one utterance)
const globalMic    = document.getElementById("globalMic");
const micHelperText = document.getElementById("micHelperText");

if (globalMic && SpeechRecognition) {
  globalMic.addEventListener("click", () => {
    const rec = new SpeechRecognition();
    rec.lang  = "en-US";
    rec.start();
    globalMic.classList.add("active");
    if (micHelperText) micHelperText.textContent = "Listening… say e.g. 'CO2 950 temperature 22 humidity 44 occupancy 3'";

    rec.onresult = (ev) => {
      const t = ev.results[0][0].transcript.toLowerCase();

      const extract = (key, aliases = []) => {
        const words = [key, ...aliases];
        for (const w of words) {
          const m = t.match(new RegExp(`${w}[\\s:]*([\\d.]+)`, "i"));
          if (m) return parseFloat(m[1]);
        }
        return null;
      };

      const co2v  = extract("co2", ["carbon dioxide", "co 2"]);
      const tempv = extract("temperature", ["temp"]);
      const humv  = extract("humidity", ["humid"]);
      const occv  = extract("occupancy", ["people", "occupants"]);

      if (co2v  !== null) document.getElementById("co2").value         = co2v;
      if (tempv !== null) document.getElementById("temperature").value  = tempv;
      if (humv  !== null) document.getElementById("humidity").value     = humv;
      if (occv  !== null) document.getElementById("occupancy").value    = Math.round(occv);

      setVoiceStatus("✓ Fields updated from voice", "success");
      if (micHelperText) micHelperText.textContent = "Use the microphone for voice input";
    };

    rec.onerror = (ev) => setVoiceStatus(`Error: ${ev.error}`, "error");
    rec.onend   = () => {
      globalMic.classList.remove("active");
      setTimeout(() => setVoiceStatus(""), 3000);
    };
  });
} else if (globalMic) {
  globalMic.style.display = "none";
}

// ── Navbar scroll ─────────────────────────────────────────────────────────────
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 50);
}, { passive: true });
