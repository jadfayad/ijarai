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
    currency_code: str = "USD"
    currency_symbol: str = "$"
    rent_min: int = 1000
    rent_max: int = 10000
    rent_step: int = 250
    rent_default: int = 3000
    default_destinations: tuple[Destination, ...] = field(default_factory=tuple)
    data_dir_name: str | None = None
    rental_provider: str | None = None
    # Bounding boxes for reclaimed/man-made land not present in global_land_mask.
    # Cells whose centre falls inside any of these boxes pass the land filter.
    land_override_bounds: tuple[dict[str, float], ...] = field(default_factory=tuple)

    @property
    def data_dir(self) -> Path:
        return DATA_DIR / (self.data_dir_name or self.slug)


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
        currency_code="AED",
        currency_symbol="AED",
        rent_min=2000,
        rent_max=20000,
        rent_step=500,
        rent_default=7000,
        default_destinations=(
            Destination(label="", lat=25.2048, lng=55.2708, icon="briefcase"),
            Destination(label="DXB Airport", lat=25.2532, lng=55.3657, icon="plane"),
            Destination(label="", lat=25.2048, lng=55.2708, icon="map-pin"),
        ),
        rental_provider="propertyfinder",
        # Palm Jumeirah is a man-made island absent from global_land_mask.
        land_override_bounds=(
            {"min_lat": 25.085, "max_lat": 25.160, "min_lng": 55.090, "max_lng": 55.200},
        ),
    ),
    "san-francisco": CityConfig(
        slug="san-francisco",
        name="San Francisco",
        country_code="us",
        bounds={
            "min_lat": 37.70,
            "max_lat": 37.82,
            "min_lng": -122.52,
            "max_lng": -122.35,
        },
        center_lat=37.7749,
        center_lng=-122.4194,
        timezone_offset_hours=-8,
        default_zoom=12,
        currency_code="USD",
        currency_symbol="$",
        rent_min=1000,
        rent_max=8000,
        rent_step=250,
        rent_default=3000,
        default_destinations=(
            Destination(label="", lat=37.7749, lng=-122.4194, icon="briefcase"),
            Destination(label="SFO Airport", lat=37.6213, lng=-122.3790, icon="plane"),
            Destination(label="", lat=37.7749, lng=-122.4194, icon="map-pin"),
        ),
        data_dir_name="san_francisco",
    ),
    "paris": CityConfig(
        slug="paris",
        name="Paris",
        country_code="fr",
        bounds={
            "min_lat": 48.815,
            "max_lat": 48.905,
            "min_lng": 2.22,
            "max_lng": 2.46,
        },
        center_lat=48.8566,
        center_lng=2.3522,
        timezone_offset_hours=1,
        default_zoom=12,
        currency_code="EUR",
        currency_symbol="€",
        rent_min=500,
        rent_max=4000,
        rent_step=100,
        rent_default=1500,
        default_destinations=(
            Destination(label="", lat=48.8566, lng=2.3522, icon="briefcase"),
            Destination(label="CDG Airport", lat=49.0097, lng=2.5479, icon="plane"),
            Destination(label="", lat=48.8566, lng=2.3522, icon="map-pin"),
        ),
    ),
}


def _normalize_slug(slug: str) -> str:
    return slug.lower().replace("_", "-")


def get_city(slug: str) -> CityConfig:
    normalized = _normalize_slug(slug)
    if normalized not in CITIES:
        raise ValueError(
            f"Unknown city '{slug}'. Available: {', '.join(CITIES.keys())}"
        )
    return CITIES[normalized]


def get_active_city() -> CityConfig:
    return get_city(os.getenv("CITY", "dubai"))
