from __future__ import annotations
from pydantic import BaseModel, Field


class LatLng(BaseModel):
    lat: float
    lng: float


class CommuteParams(BaseModel):
    destination: LatLng
    mode: str = Field(default="car", pattern="^(car|transit)$")
    time_of_day: str = Field(default="peak", pattern="^(peak|off_peak)$")


class AmenityParams(BaseModel):
    categories: list[str] = Field(default_factory=lambda: ["gym", "cafe", "beach"])


class BudgetParams(BaseModel):
    max_monthly_rent: float = 8000


class CriterionRequest(BaseModel):
    type: str
    weight: float = Field(ge=0, le=10)
    params: dict = Field(default_factory=dict)


class ScoreRequest(BaseModel):
    criteria: list[CriterionRequest]
    cell_size_m: int = Field(default=500, ge=200, le=1500)


class CellScore(BaseModel):
    cell_id: str
    lat: float
    lng: float
    final_score: float
    breakdown: dict[str, float] = Field(default_factory=dict)


class ScoreResponse(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict]


class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    display_name: str
