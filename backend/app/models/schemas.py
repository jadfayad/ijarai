from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LatLng(BaseModel):
    lat: float
    lng: float


class CriterionRequest(BaseModel):
    type: Literal["commute", "amenities", "budget", "neighborhood", "noise"]
    weight: float = Field(ge=0, le=10)
    params: dict = Field(default_factory=dict)


class ScoreRequest(BaseModel):
    criteria: list[CriterionRequest]
    cell_size_m: int = Field(default=1000, ge=200, le=2500)


class ScoreResponse(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict]


class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    lat: float
    lng: float
    display_name: str


class DestinationConfig(BaseModel):
    label: str
    lat: float
    lng: float
    icon: str


class CityConfigResponse(BaseModel):
    slug: str
    name: str
    country_code: str
    bounds: dict[str, float]
    center_lat: float
    center_lng: float
    timezone_offset_hours: int
    default_zoom: int
    default_destinations: list[DestinationConfig]
