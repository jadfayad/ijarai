"""
Shared types for the rental listing provider pipeline.

A provider receives a RentalSearchQuery (derived from a clicked H3 cell) and
returns a list of RentalListing. The contract is intentionally narrow so
different providers (PropertyFinder UAE, future SF/Paris sources) can plug in.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class RentalListing(BaseModel):
    """A single rental unit surfaced to the frontend."""
    id: str
    title: str
    price: float
    currency: str = ""
    price_period: str = "yearly"  # "yearly" | "monthly" | ""
    bedrooms: float | None = None
    bathrooms: float | None = None
    size_sqft: float | None = None
    lat: float
    lng: float
    thumbnail_url: str | None = None
    external_url: str | None = None
    property_type: str | None = None
    source: str = "propertyfinder"


class RentalSearchQuery(BaseModel):
    """Search parameters for a rental provider — derived from an H3 cell."""
    city_slug: str
    hex_id: str
    center_lat: float
    center_lng: float
    # Radius (meters) around the hex center. Always populated (min 500m) so
    # providers that only support point+radius (most RapidAPI endpoints) work.
    radius_m: float
    # Axis-aligned bbox of the hex: (min_lat, min_lng, max_lat, max_lng).
    # Providers that accept a bounding box can use this for a tighter search.
    bbox: tuple[float, float, float, float]
    # Human-readable area name (from a reverse-geocode upstream). Used by
    # providers whose search is keyed by a location/area id instead of coords.
    area_name: str | None = None
    limit: int = Field(default=40, ge=1, le=200)

    # ── Filter derivatives of the user's criteria ──────────────────────
    # Populated by the API route from the apartment-profile + budget
    # criteria so the upstream search mirrors what the user configured.
    property_type: str | None = None
    bedrooms_csv: str | None = None  # e.g. "0,1,2" (studio + 1BR + 2BR)
    bathrooms_csv: str | None = None  # e.g. "1,2,3"
    area_min_sqft: float | None = None
    area_max_sqft: float | None = None
    furnishing: str | None = None  # "furnished" | "unfurnished" | "partly"
    amenities_csv: str | None = None  # PropertyFinder amenity slugs
    price_max_monthly: float | None = None  # AED/month


class RentalSearchResponse(BaseModel):
    hex_id: str
    count: int
    listings: list[RentalListing] = Field(default_factory=list)
