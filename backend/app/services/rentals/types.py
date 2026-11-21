"""
Shared types for the rental listing provider pipeline.

A provider receives a RentalSearchQuery (derived from a clicked H3 cell) and
returns a list of RentalListing. The contract is intentionally narrow so
different providers (PropertyFinder UAE, future SF/Paris sources) can plug in.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, computed_field

# Months per billing period, for normalising prices to a monthly figure.
_MONTHS_PER_PERIOD = {"monthly": 1.0, "yearly": 12.0, "weekly": 12 / 52, "daily": 12 / 365}


class RentalProviderUnavailable(Exception):
    """A transient provider failure (network, upstream error, missing key).

    Distinct from "searched fine, found nothing" so the API can report it and
    callers don't cache it.
    """


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

    @computed_field  # type: ignore[prop-decorator]
    @property
    def price_monthly(self) -> float | None:
        """Price normalised to one month, so yearly and monthly listings compare."""
        months = _MONTHS_PER_PERIOD.get((self.price_period or "").lower())
        if months is None or self.price <= 0:
            return None
        return round(self.price / months, 2)


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
    page: int = Field(default=1, ge=1)

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


class ProviderPage(BaseModel):
    """One page of results from a provider."""
    listings: list[RentalListing] = Field(default_factory=list)
    # The area the provider actually searched (e.g. "Dubai Marina"), which can
    # be broader than the clicked cell.
    resolved_area: str | None = None
    # Total matches upstream, when the provider reports it.
    total: int | None = None
    has_more: bool = False


RentalSearchStatus = Literal["ok", "empty", "unavailable", "no_provider"]


class RentalSearchResponse(BaseModel):
    hex_id: str
    # ok: listings found · empty: searched, nothing matched · unavailable: the
    # provider failed (retryable) · no_provider: this city has no rental source.
    status: RentalSearchStatus = "ok"
    # True when results include ring-1 neighbour cells.
    expanded: bool = False
    resolved_area: str | None = None
    total: int | None = None
    page: int = 1
    has_more: bool = False
    count: int
    listings: list[RentalListing] = Field(default_factory=list)
