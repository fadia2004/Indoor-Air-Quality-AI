from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import predict

app = FastAPI(
    title="AirPredict API",
    description="Indoor Air Quality prediction powered by Random Forest.",
    version="1.0.0",
)

# ── CORS — allow the frontend (any origin during development) ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production to your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(predict.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "AirPredict API is running 🌿"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
