"""
City configuration — single source of truth for all city-specific parameters.

The active city is selected via the CITY environment variable (default: "dubai").
To add a new city, define a CityConfig entry in CITIES and create the matching
data/<slug>/ directory with rent_zones.json, neighborhood_scores.json,
and noise_sources.json.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"


@dataclass(frozen=True)
class Destination:
    label: str
    lat: float
    lng: float
    icon: str


@dataclass(frozen=True)
class CityConfig:
    slug: str
    name: str
    country_code: str
    bounds: dict[str, float]
    center_lat: float
    center_lng: float
    timezone_offset_hours: int
    default_zoom: int
    default_destinations: tuple[Destination, ...] = field(default_factory=tuple)

    @property
    def data_dir(self) -> Path:
        return DATA_DIR / self.slug


CITIES: dict[str, CityConfig] = {
    "dubai": CityConfig(
        slug="dubai",
        name="Dubai",
        country_code="ae",
        bounds={
            "min_lat": 25.00,
            "max_lat": 25.30,
            "min_lng": 55.05,
            "max_lng": 55.45,
        },
        center_lat=25.2048,
        center_lng=55.2708,
        timezone_offset_hours=4,
        default_zoom=11,
        default_destinations=(
            Destination(label="", lat=25.2048, lng=55.2708, icon="briefcase"),
            Destination(label="DXB Airport", lat=25.2532, lng=55.3657, icon="plane"),
            Destination(label="", lat=25.2048, lng=55.2708, icon="map-pin"),
        ),
    ),
}


def get_active_city() -> CityConfig:
    slug = os.getenv("CITY", "dubai").lower()
    if slug not in CITIES:
        raise ValueError(
            f"Unknown city '{slug}'. Available: {', '.join(CITIES.keys())}"
        )
    return CITIES[slug]
