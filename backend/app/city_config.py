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
    # Closed polygons (tuple of (lat, lng) vertices, CW or CCW) for reclaimed land.
    # Cells whose centre falls inside any polygon also pass the land filter.
    land_override_polygons: tuple[tuple[tuple[float, float], ...], ...] = field(default_factory=tuple)
    # Optional land-boundary polygons. When non-empty, a cell is kept ONLY if its
    # centre falls inside one of them — used where global_land_mask fails on inland
    # water (e.g. rivers around an island city) and a bounding box alone would place
    # cells on the water. Leave empty to rely on the land mask.
    include_polygons: tuple[tuple[tuple[float, float], ...], ...] = field(default_factory=tuple)

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
        # Polygon covers the trunk + fronds fan only — intentionally excludes
        # the open lagoon behind the crescent to avoid spurious water cells.
        land_override_polygons=(
            (
                (25.082, 55.127),  # SW trunk at mainland (south)
                (25.082, 55.143),  # SE trunk at mainland (south)
                (25.108, 55.144),  # NE trunk top
                (25.115, 55.158),  # E inner fronds
                (25.123, 55.170),  # E outer frond tips
                (25.131, 55.168),  # NE frond tips
                (25.140, 55.160),  # NNE fronds
                (25.146, 55.147),  # NNE arc
                (25.148, 55.133),  # N tip (northernmost frond)
                (25.146, 55.120),  # NNW arc
                (25.140, 55.107),  # NNW fronds
                (25.131, 55.099),  # NW frond tips
                (25.123, 55.097),  # W outer frond tips
                (25.115, 55.108),  # W inner fronds
                (25.108, 55.122),  # NW trunk top
                (25.082, 55.127),  # back to start
            ),
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
    "montreal": CityConfig(
        slug="montreal",
        name="Montreal",
        country_code="ca",
        # Island of Montreal + immediate approaches. Real land in global_land_mask,
        # so no land_override_* needed.
        bounds={
            "min_lat": 45.40,
            "max_lat": 45.70,
            "min_lng": -73.98,
            "max_lng": -73.47,
        },
        center_lat=45.5019,
        center_lng=-73.5674,
        timezone_offset_hours=-5,  # EST (fixed-offset convention, like SF/Paris)
        default_zoom=12,
        currency_code="CAD",
        currency_symbol="$",
        rent_min=600,
        rent_max=4000,
        rent_step=100,
        rent_default=1500,
        default_destinations=(
            Destination(label="", lat=45.5019, lng=-73.5674, icon="briefcase"),
            Destination(label="YUL Airport", lat=45.4706, lng=-73.7408, icon="plane"),
            Destination(label="", lat=45.5019, lng=-73.5674, icon="map-pin"),
        ),
        # rental_provider intentionally unset — no live rentals yet (parity with SF/Paris).
        # global_land_mask treats the St. Lawrence / Rivière des Prairies as land,
        # so restrict cells to the Island of Montreal outline (clockwise (lat, lng)).
        # Scopes the city to the island proper — excludes Laval and the South Shore.
        include_polygons=(
            (
                (45.408, -73.955),  # W tip — Sainte-Anne-de-Bellevue
                (45.428, -73.850),  # SW — Baie-D'Urfé / Beaconsfield (Lac Saint-Louis)
                (45.432, -73.760),  # Dorval / Pointe-Claire
                (45.420, -73.690),  # Lachine
                (45.408, -73.650),  # LaSalle (south, along the rapids)
                (45.452, -73.575),  # Verdun waterfront
                (45.458, -73.552),  # Nuns' Island (Île des Sœurs)
                (45.505, -73.545),  # Old Port / Cité-du-Havre
                (45.545, -73.518),  # Hochelaga-Maisonneuve
                (45.590, -73.500),  # Mercier-Est
                (45.635, -73.485),  # Pointe-aux-Trembles
                (45.700, -73.478),  # E tip — Bout-de-l'Île
                (45.690, -73.520),  # NE — Rivière-des-Prairies (north shore)
                (45.640, -73.585),  # Montréal-Nord
                (45.590, -73.660),  # Ahuntsic
                (45.560, -73.730),  # Cartierville
                (45.540, -73.800),  # Pierrefonds-East (Rivière des Prairies)
                (45.518, -73.880),  # Pierrefonds-West / Île-Bizard side
                (45.470, -73.940),  # Senneville (NW)
                (45.408, -73.955),  # back to W tip
            ),
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
