# AQII Backend — AirPredict API

باك إند لمشروع **AirPredict (AQII)**، تم بناؤه بالاعتماد الكامل على ملفات الفرونت إند الموجودة في `AQII_front/` (الصفحات `index.html`, `quick-scan.html`, `compare.html` وملفات `script.js`, `js/quick-scan.js`, `js/compare.js`).

> **مهم:** منطق حساب AQI والتوصيات في هذا الباك إند هو **نسخة طبق الأصل** من المعادلات الموجودة فعلياً داخل ملفات الفرونت (`computePrediction()` في `quick-scan.js` و `calculateRoomScore()` في `compare.js`). تم اختبارها وتطابق نفس المخرجات تماماً.

## التشغيل

```bash
cd AQII_backend
cp .env.example .env
npm install
npm run dev      # للتطوير مع nodemon
# أو
npm start        # للتشغيل العادي
```

الخادم يعمل افتراضياً على المنفذ `5000` (قابل للتغيير من `.env`).

## البنية

```
AQII_backend/
├── src/
│   ├── server.js                     # نقطة الدخول
│   ├── app.js                        # تهيئة Express + الميدلوير + الراوتس
│   ├── routes/
│   │   ├── quickScanRoutes.js        # /api/quick-scan/*
│   │   └── roomComparisonRoutes.js   # /api/rooms/*
│   ├── controllers/
│   │   ├── quickScanController.js
│   │   └── roomComparisonController.js
│   ├── services/
│   │   ├── quickScanService.js       # معادلة AQI لصفحة Quick Scan (مطابقة لـ js/quick-scan.js)
│   │   └── roomComparisonService.js  # معادلة AQI لصفحة Room Comparison (مطابقة لـ js/compare.js)
│   └── middleware/
│       └── errorHandler.js
├── package.json
└── .env.example
```

## نقاط النهاية (Endpoints)

### 1) Health Check
```
GET /api/health
```
استجابة:
```json
{ "success": true, "status": "ok", "service": "AirPredict (AQII) backend" }
```

---

### 2) Quick Scan — يطابق صفحة `quick-scan.html`

```
POST /api/quick-scan/predict
Content-Type: application/json
```

**Body** (نفس حقول الفورم في `quick-scan.html`):
```json
{
  "co2": 950,
  "temperature": 22,
  "humidity": 44,
  "occupancy": 3,
  "windowStatus": "Open",
  "month": "January"
}
```

- `windowStatus`: `"Open"` أو `"Closed"`
- `month`: أحد الأشهر الإنجليزية الكاملة (January..December) كما في `<select id="month">`

**استجابة ناجحة (200):**
```json
{
  "success": true,
  "data": {
    "aqi": 41,
    "status": "GOOD",
    "percentage": 24.11,
    "summary": { "heading": "Clean air", "text": "..." },
    "metrics": {
      "co2": { "value": 950, "unit": "ppm", "status": "Watch" },
      "temperature": { "value": 22, "unit": "°C", "status": "Stable" },
      "humidity": { "value": 44, "unit": "%", "status": "Balanced" }
    },
    "recommendations": [
      { "title": "Ventilate more often", "text": "...", "icon": "ti ti-wind" }
    ],
    "shouldSpeakAlert": false,
    "input": { "co2": 950, "temperature": 22, "humidity": 44, "occupancy": 3, "windowStatus": "Open", "month": "January" }
  }
}
```

`status` يكون أحد: `GOOD`, `MODERATE`, `BAD`, `DANGEROUS` — تماماً كما تعرضه `aqiStatusPill` في الواجهة.
`shouldSpeakAlert` تماماً مثل شرط `speakAlert('Dangerous air detected.')` في الفرونت — لتفعيل قراءة صوتية عند الخطر.

> **جديد:** أضيف شرط توصية مخصص لدرجة الحرارة (`Adjust temperature`) يظهر عندما تنحرف الحرارة عن المدى المثالي 20-24°م بـ4 درجات أو أكثر، حتى لو كانت كل العوامل الأخرى ضمن الطبيعي.

**أخطاء (400):** عند إدخال غير صالح:
```json
{ "success": false, "error": "co2 must be a number; windowStatus must be \"Open\" or \"Closed\"" }
```

---

### 3) Room Comparison — يطابق صفحة `compare.html`

#### أ) تحليل غرفة واحدة وحفظها في جلسة (مطابق لزر "Analyze & Save")
```
POST /api/rooms/analyze
Content-Type: application/json
```
**Body:**
```json
{
  "sessionId": "optional-browser-session-id",
  "name": "Bedroom",
  "co2": 840,
  "temperature": 22,
  "humidity": 44,
  "occupancy": 4,
  "windowStatus": "Open",
  "month": "January"
}
```
> `sessionId` اختياري: إن أرسلته الواجهة، يحفظ الباك إند الغرف في الذاكرة (مثل ما يفعل الفرونت بمصفوفة `rooms` بدون أي تخزين دائم). إن لم ترسله، يتم تحليل الغرفة فقط بدون حفظ.

**استجابة (200):**
```json
{
  "success": true,
  "data": {
    "room": {
      "name": "Bedroom", "co2": 840, "temperature": 22, "humidity": 44,
      "occupancy": 4, "windowStatus": "Open", "month": "January",
      "aqi": 45, "status": "Good",
      "recommendations": ["Maintain steady ventilation", "Keep monitoring conditions"]
    }
  }
}
```
`status` هنا: `Good`, `Moderate`, أو `Poor` — تماماً كأسماء كلاسات `status-good/moderate/poor` في `compare.css`.

#### ب) تحليل مجموعة غرف دفعة واحدة (مطابق لزر "Get Recommendations" + أفضل/أسوأ غرفة)
```
POST /api/rooms/analyze-batch
Content-Type: application/json
```
**Body:**
```json
{
  "rooms": [
    { "name": "Bedroom", "co2": 840, "temperature": 22, "humidity": 44, "occupancy": 4, "windowStatus": "Open", "month": "January" },
    { "name": "Kitchen", "co2": 1300, "temperature": 26, "humidity": 65, "occupancy": 6, "windowStatus": "Closed", "month": "July" }
  ]
}
```
**استجابة (200):**
```json
{
  "success": true,
  "data": {
    "rooms": [ /* كل غرفة محسوبة بالتفصيل */ ],
    "savedRoomCount": 2,
    "bestRoom": { "name": "Bedroom", "aqi": 45 },
    "worstRoom": { "name": "Kitchen", "aqi": 155 },
    "recommendationCards": [
      { "roomName": "Bedroom", "aqi": 45, "status": "Good", "recommendation": "Maintain current ventilation..." },
      { "roomName": "Kitchen", "aqi": 155, "status": "Poor", "recommendation": "Improve ventilation immediately..." }
    ],
    "overallRecommendation": {
      "summary": "Bedroom has the best air quality of the rooms compared (AQI 45, Good). Kitchen needs the most attention (AQI 155, Poor).",
      "ranking": [
        { "rank": 1, "name": "Bedroom", "aqi": 45, "status": "Good" },
        { "rank": 2, "name": "Kitchen", "aqi": 155, "status": "Poor" }
      ],
      "bestRoom": { "name": "Bedroom", "aqi": 45, "status": "Good", "whatToDo": "Maintain current ventilation and keep monitoring the room conditions." },
      "worstRoom": {
        "name": "Kitchen", "aqi": 155, "status": "Poor",
        "whatToDo": "Improve ventilation immediately, reduce occupancy, and check filtration performance.",
        "priorityActions": ["Increase fresh air exchange", "Reduce moisture", "Lower crowding or rotate use", "Open windows or boost ventilation"]
      }
    }
  }
}
```
هذا يطابق تماماً `savedRoomCount`, `bestRoomDisplay`, `worstRoomDisplay`, و كروت `recommendationsGrid` في `compare.html`.

> **جديد:** `overallRecommendation` يعطي إجابة مباشرة وجاهزة للعرض على "مين الأفضل وشو لازم يعمل": ترتيب كل الغرف من الأنظف للأسوأ (`ranking`)، أفضل غرفة وشو المطلوب للمحافظة عليها (`bestRoom.whatToDo`)، وأسوأ غرفة مع أولويات الإجراءات المطلوبة (`worstRoom.priorityActions`). عند تحليل غرفة واحدة فقط، تكون `worstRoom` بقيمة `null` لأنه لا يوجد مقارنة حقيقية.

#### ج) جلب كل غرف جلسة معينة
```
GET /api/rooms/session/:sessionId
```

#### د) مسح جلسة (مثل ريفريش الصفحة في الفرونت الذي يبدأ من جديد بدون localStorage)
```
DELETE /api/rooms/session/:sessionId
```

---

## ملاحظات هامة

1. **لم يتم تعديل أي ملف من الفرونت إند.** الفرونت حالياً يحسب كل شيء محلياً بالجافاسكربت بدون أي نداء API. هذا الباك إند جاهز لاستبدال تلك الحسابات المحلية بنداءات `fetch()` لو احتجت ذلك لاحقاً (مثلاً استبدال دالة `computePrediction()` في `quick-scan.js` بنداء `fetch('/api/quick-scan/predict', {...})`).
2. **CORS** مفعّل ويُضبط من خلال متغير `CORS_ORIGIN` في `.env` — ضع فيه عنوان الفرونت إند عند رفعه (مثلاً `http://localhost:5500` أو رابط الاستضافة).
3. **لا قاعدة بيانات.** التخزين الحالي هو ذاكرة مؤقتة (in-memory) للجلسات فقط في صفحة Room Comparison، تماشياً مع سلوك الفرونت الذي يتجنب أي تخزين دائم (`localStorage`) عن قصد. إذا احتجت تخزين دائم (قاعدة بيانات)، أخبرني وأضيفها.
4. جميع معادلات AQI والتوصيات والحالات (`GOOD/MODERATE/BAD/DANGEROUS` لصفحة Quick Scan، و `Good/Moderate/Poor` لصفحة Room Comparison) **مطابقة حرفياً** للأكواد الأصلية في `js/quick-scan.js` و `js/compare.js`، وتم اختبارها مباشرة بنفس المدخلات وتعطي نفس النتائج.
