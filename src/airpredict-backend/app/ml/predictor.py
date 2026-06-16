import joblib
import numpy as np
from pathlib import Path

# ── Load model once at startup ──────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "rf_model.pkl"
model = joblib.load(MODEL_PATH)

# ── Constants ────────────────────────────────────────────────────────────────
MONTH_MAP = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}

CLASS_LABELS = {0: "Good", 1: "Moderate", 2: "Poor"}

RECOMMENDATIONS = {
    "Good": [
        "Air quality is excellent. No action needed.",
        "Keep windows in their current state to maintain good circulation.",
        "Ideal conditions — great for work, sleep, or exercise.",
    ],
    "Moderate": [
        "Consider opening a window to improve ventilation.",
        "Reduce occupancy if possible to lower CO2 levels.",
        "Take short breaks outside to refresh.",
        "Monitor CO2 levels — aim to keep them below 1000 ppm.",
    ],
    "Poor": [
        "Open all windows immediately to ventilate the room.",
        "Reduce occupancy as soon as possible.",
        "Avoid prolonged exposure — CO2 levels are too high.",
        "Consider using an air purifier or ventilation system.",
        "Check HVAC or ventilation equipment for faults.",
    ],
}

IAQ_SCORE_MAP = {
    "Good":     (50,  75),   # range: 0–100
    "Moderate": (101, 175),  # range: 101–200
    "Poor":     (201, 300),  # range: 201+
}


def build_features(
    co2: float,
    temperature: float,
    humidity: float,
    occupancy: int,
    window: str,      # "Open" | "Closed"
    month: str,       # "January" … "December"
) -> np.ndarray:
    """Convert raw inputs into the 10-feature vector the model expects."""
    window_bin  = 1 if window == "Open" else 0
    month_num   = MONTH_MAP.get(month, 1)

    co2_x_occ  = co2 * occupancy
    co2_x_win  = co2 * window_bin
    win_x_occ  = window_bin * occupancy
    temp_x_rh  = temperature * humidity

    # Order must match training: OCCUPANCY, WINDOW, CO2, RH, Tin,
    #   MONTH_NUM, CO2_x_OCCUPANCY, CO2_x_WINDOW, WINDOW_x_OCCUPANCY, Temp_x_RH
    return np.array([[
        occupancy, window_bin, co2, humidity, temperature,
        month_num, co2_x_occ, co2_x_win, win_x_occ, temp_x_rh,
    ]])


def predict(
    co2: float,
    temperature: float,
    humidity: float,
    occupancy: int,
    window: str,
    month: str,
) -> dict:
    features = build_features(co2, temperature, humidity, occupancy, window, month)

    pred_class  = int(model.predict(features)[0])
    proba       = model.predict_proba(features)[0]
    label       = CLASS_LABELS[pred_class]
    confidence  = round(float(proba[pred_class]) * 100, 1)

    # Synthetic IAQ score derived from class probabilities for UI display
    lo, hi      = IAQ_SCORE_MAP[label]
    # Map confidence (50-100%) → position within the class range
    norm        = (confidence - 50) / 50          # 0.0 … 1.0
    iaq_score   = round(lo + norm * (hi - lo))

    return {
        "iaq":            iaq_score,
        "label":          label,
        "confidence":     confidence,
        "recommendations": RECOMMENDATIONS[label],
        "metrics": {
            "co2":         {"value": co2,         "status": _co2_status(co2)},
            "temperature": {"value": temperature, "status": _temp_status(temperature)},
            "humidity":    {"value": humidity,    "status": _humidity_status(humidity)},
        },
    }


# ── Individual metric status helpers ─────────────────────────────────────────
def _co2_status(ppm: float) -> str:
    if ppm <= 800:   return "Good"
    if ppm <= 1200:  return "Moderate"
    return "Poor"

def _temp_status(temp: float) -> str:
    if 18 <= temp <= 26: return "Good"
    if 15 <= temp <= 30: return "Moderate"
    return "Poor"

def _humidity_status(rh: float) -> str:
    if 30 <= rh <= 60: return "Good"
    if 20 <= rh <= 70: return "Moderate"
    return "Poor"
