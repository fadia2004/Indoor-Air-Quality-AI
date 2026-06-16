from pydantic import BaseModel, Field
from typing import Literal

MONTHS = Literal[
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
]

# ── Request bodies ────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    co2:         float = Field(..., ge=400,  le=3000, description="CO2 in ppm")
    temperature: float = Field(..., ge=5,    le=40,   description="Temperature in °C")
    humidity:    float = Field(..., ge=10,   le=90,   description="Relative humidity %")
    occupancy:   int   = Field(..., ge=1,    le=40,   description="Number of people")
    window:      Literal["Open", "Closed"]            = Field(..., description="Window status")
    month:       MONTHS                               = Field(..., description="Month name")


# ── Response bodies ───────────────────────────────────────────────────────────

class MetricDetail(BaseModel):
    value:  float
    status: str

class MetricsOut(BaseModel):
    co2:         MetricDetail
    temperature: MetricDetail
    humidity:    MetricDetail

class PredictResponse(BaseModel):
    iaq:             int
    label:           str
    confidence:      float
    recommendations: list[str]
    metrics:         MetricsOut
