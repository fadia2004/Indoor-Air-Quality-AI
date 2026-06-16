# AirPredict — Backend API

FastAPI backend serving the Random Forest air quality model.

---

## Setup

```bash
# 1. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the server
python run.py
```

Server starts at: **http://localhost:8000**
Interactive docs: **http://localhost:8000/docs**

---

## Endpoint

### `POST /api/predict`

**Request body (JSON):**
```json
{
  "co2": 950,
  "temperature": 22,
  "humidity": 44,
  "occupancy": 3,
  "window": "Open",
  "month": "January"
}
```

**Response:**
```json
{
  "iaq": 87,
  "label": "Good",
  "confidence": 91.3,
  "recommendations": [
    "Air quality is excellent. No action needed.",
    "Keep windows in their current state to maintain good circulation."
  ],
  "metrics": {
    "co2":         { "value": 950,  "status": "Moderate" },
    "temperature": { "value": 22,   "status": "Good" },
    "humidity":    { "value": 44,   "status": "Good" }
  }
}
```

---

## How to connect the Frontend (JS)

In your `js/quick-scan.js`, replace any mock logic with:

```javascript
const API_URL = "http://localhost:8000";

async function predictAirQuality(formData) {
  const response = await fetch(`${API_URL}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      co2:         parseFloat(formData.get("co2")),
      temperature: parseFloat(formData.get("temperature")),
      humidity:    parseFloat(formData.get("humidity")),
      occupancy:   parseInt(formData.get("occupancy")),
      window:      formData.get("windowStatus"),
      month:       formData.get("month"),
    }),
  });

  if (!response.ok) throw new Error("Prediction failed");
  return await response.json();
}
```

---

## Project Structure

```
airpredict-backend/
├── app/
│   ├── main.py          ← FastAPI app + CORS
│   ├── schemas.py       ← Request/Response models
│   ├── routers/
│   │   └── predict.py   ← POST /api/predict
│   └── ml/
│       ├── predictor.py ← Feature engineering + model inference
│       └── rf_model.pkl ← Trained Random Forest model
├── run.py               ← Start server
├── requirements.txt
└── README.md
```
