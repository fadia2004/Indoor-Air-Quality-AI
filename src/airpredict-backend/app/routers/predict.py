from fastapi import APIRouter, HTTPException
from app.schemas import PredictRequest, PredictResponse
from app.ml.predictor import predict

router = APIRouter(prefix="/api", tags=["Prediction"])


@router.post("/predict", response_model=PredictResponse, summary="Predict air quality")
def predict_air_quality(body: PredictRequest):
    """
    Accepts room sensor data and returns an IAQ score, quality label,
    confidence percentage, per-metric statuses, and recommendations.
    """
    try:
        result = predict(
            co2=body.co2,
            temperature=body.temperature,
            humidity=body.humidity,
            occupancy=body.occupancy,
            window=body.window,
            month=body.month,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
