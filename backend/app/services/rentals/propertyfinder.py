"""
PropertyFinder UAE rental provider.

Consumes the happyendpoint.com PropertyFinder API distributed through RapidAPI.
The search endpoint is keyed by a PropertyFinder ``location_id``, not by
coordinates, so each search is a two-step flow:

1. ``/autocomplete-location?query=<area name>`` → extract top ``location_id``
2. ``/search-rent?location_id=<id>&...`` → listings for that area

The area name typically comes from the frontend (Mapbox reverse geocode on
the clicked hex). If missing, we fall back to Nominatim reverse geocoding.

Failures (missing key, upstream errors, unknown response shapes) all degrade
to ``[]`` so the UI remains responsive. Warning logs surface the first
unknown shape so the parser can be tweaked against real responses.

Env-var overrides (for iterating against the live API without editing code):
- ``PROPERTYFINDER_API_HOST`` (default: ``propertyfinder-uae-data.p.rapidapi.com``)
- ``PROPERTYFINDER_SEARCH_PATH`` (default: ``/search-rent``)
- ``PROPERTYFINDER_AUTOCOMPLETE_PATH`` (default: ``/autocomplete-location``)
"""
from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from cachetools import TTLCache

from app.services.rentals.base import RentalProvider
from app.services.rentals.types import RentalListing, RentalSearchQuery

logger = logging.getLogger(__name__)

_DEFAULT_HOST = "propertyfinder-uae-data.p.rapidapi.com"
_DEFAULT_SEARCH_PATH = "/search-rent"
_DEFAULT_AUTOCOMPLETE_PATH = "/autocomplete-location"
_NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
_HTTP_TIMEOUT = 30.0

# Listing cache: (city_slug, hex_id, area_name_or_none, limit) → listings.
# Cache key = (city_slug, hex_id, area_name, limit, *filters). The filters
# are part of the key so two searches at the same hex with different
# budgets/bedrooms return distinct results.
_search_cache: TTLCache[tuple, list[RentalListing]] = TTLCache(maxsize=256, ttl=3600)
# location_id cache: lowercased area query → location_id.
_autocomplete_cache: TTLCache[str, int | str | None] = TTLCache(maxsize=512, ttl=3600)
# reverse-geocode cache: rounded (lat, lng) → area name.
_reverse_geo_cache: TTLCache[tuple[float, float], str | None] = TTLCache(
    maxsize=512, ttl=3600
)


def _first(obj: dict[str, Any] | None, *keys: str) -> Any:
    if not obj:
        return None
    for k in keys:
        v = obj.get(k)
        if v is not None and v != "":
            return v
    return None


def _to_float(v: Any) -> float | None:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _find_first_list(payload: Any) -> list[Any]:
    """Recursively locate the first list of dicts inside a nested response."""
    if isinstance(payload, list):
        if all(isinstance(x, dict) for x in payload):
            return payload
        return []
    if not isinstance(payload, dict):
        return []
    for key in ("data", "results", "listings", "properties", "items", "hits", "suggestions"):
        val = payload.get(key)
        if isinstance(val, list) and val and isinstance(val[0], dict):
            return val
    # Depth-first fallback
    for val in payload.values():
        nested = _find_first_list(val)
        if nested:
            return nested
    return []


def _extract_location_id(payload: Any) -> int | str | None:
    """Extract the top autocomplete result's location_id."""
    items = _find_first_list(payload)
    if not items:
        return None
    top = items[0]
    return _first(top, "location_id", "id", "value", "code")


def _parse_listing(raw: dict[str, Any]) -> RentalListing | None:
    """Parse a /search-rent listing per the PropertyFinder UAE OpenAPI schema.

    Shape (per docs/propertyfinder.json):
      { property_id, property_type, price: {value, currency, period},
        address: {full_name, coordinates: {lat, lon}},
        location: {id, full_name, coordinates: {lat, lon}},
        images: [string...],
        bedrooms: "1", bathrooms: "2",
        size: {value, unit}, floor_plan_area,
        title, property_url, share_url, ... }
    """
    addr = raw.get("address") if isinstance(raw.get("address"), dict) else {}
    loc = raw.get("location") if isinstance(raw.get("location"), dict) else {}
    coords = (addr.get("coordinates") if isinstance(addr.get("coordinates"), dict) else None) or (
        loc.get("coordinates") if isinstance(loc.get("coordinates"), dict) else None
    ) or {}
    lat = _to_float(coords.get("lat"))
    # PropertyFinder uses `lon`; keep `lng` as a fallback for safety.
    lng = _to_float(coords.get("lon") if coords.get("lon") is not None else coords.get("lng"))
    if lat is None or lng is None:
        return None

    price_obj = raw.get("price") if isinstance(raw.get("price"), dict) else {}
    price = _to_float(price_obj.get("value")) or 0.0
    currency = price_obj.get("currency") or "AED"
    period = price_obj.get("period") or "yearly"

    size_obj = raw.get("size") if isinstance(raw.get("size"), dict) else {}
    size_sqft = _to_float(size_obj.get("value")) if size_obj else _to_float(raw.get("floor_plan_area"))

    listing_id = str(
        raw.get("property_id") or raw.get("reference_number") or raw.get("id") or ""
    )
    if not listing_id:
        return None

    images = raw.get("images")
    thumb: str | None = None
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, str):
            thumb = first
        elif isinstance(first, dict):
            thumb = _first(first, "url", "full", "large", "small")

    return RentalListing(
        id=listing_id,
        title=str(raw.get("title") or ""),
        price=price,
        currency=str(currency),
        price_period=str(period),
        bedrooms=_to_float(raw.get("bedrooms")),
        bathrooms=_to_float(raw.get("bathrooms")),
        size_sqft=size_sqft,
        lat=lat,
        lng=lng,
        thumbnail_url=thumb,
        external_url=raw.get("property_url") or raw.get("share_url"),
        property_type=raw.get("property_type"),
        source="propertyfinder",
    )


async def _reverse_geocode(lat: float, lng: float) -> str | None:
    """Return a neighborhood-level name for (lat, lng) via Nominatim, or None."""
    key = (round(lat, 4), round(lng, 4))
    if key in _reverse_geo_cache:
        return _reverse_geo_cache[key]
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(
                _NOMINATIM_URL,
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 14},
                headers={"User-Agent": "OptimHouse/1.0"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:  # noqa: BLE001
        logger.warning("Nominatim reverse geocode failed: %s", e)
        _reverse_geo_cache[key] = None
        return None

    address = data.get("address") or {}
    name = (
        address.get("suburb")
        or address.get("neighbourhood")
        or address.get("quarter")
        or address.get("city_district")
        or address.get("village")
        or address.get("town")
        or address.get("city")
    )
    _reverse_geo_cache[key] = name
    return name


class PropertyFinderProvider(RentalProvider):
    """RapidAPI-hosted PropertyFinder UAE source (two-step: autocomplete → search)."""

    def __init__(self) -> None:
        self._api_key = os.getenv("RAPIDAPI_KEY", "").strip().strip('"').strip("'")
        self._host = os.getenv("PROPERTYFINDER_API_HOST", _DEFAULT_HOST)
        self._search_path = os.getenv("PROPERTYFINDER_SEARCH_PATH", _DEFAULT_SEARCH_PATH)
        self._autocomplete_path = os.getenv(
            "PROPERTYFINDER_AUTOCOMPLETE_PATH", _DEFAULT_AUTOCOMPLETE_PATH
        )
        # WARNING level so it shows under uvicorn's default log config — this
        # is a one-time diagnostic fingerprint, not a real warning.
        if self._api_key:
            n = len(self._api_key)
            masked = f"{self._api_key[:4]}...{self._api_key[-4:]}" if n >= 8 else "(too short)"
            logger.warning(
                "PropertyFinder init: host=%s key_len=%d key=%s",
                self._host, n, masked,
            )
        else:
            logger.warning(
                "PropertyFinder init: host=%s -- RAPIDAPI_KEY is EMPTY (check .env)",
                self._host,
            )

    def _headers(self) -> dict[str, str]:
        return {
            "x-rapidapi-key": self._api_key,
            "x-rapidapi-host": self._host,
            "Content-Type": "application/json",
        }

    async def _autocomplete_location(
        self, client: httpx.AsyncClient, query: str
    ) -> int | str | None:
        key = query.strip().lower()
        if not key:
            return None
        if key in _autocomplete_cache:
            return _autocomplete_cache[key]

        url = f"https://{self._host}{self._autocomplete_path}"
        try:
            resp = await client.get(url, params={"query": query}, headers=self._headers())
            resp.raise_for_status()
            payload = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning(
                "PropertyFinder autocomplete %s for query=%r: %s",
                e.response.status_code, query, e.response.text[:400],
            )
            _autocomplete_cache[key] = None
            return None
        except Exception as e:  # noqa: BLE001
            logger.warning("PropertyFinder autocomplete failed: %s", e)
            _autocomplete_cache[key] = None
            return None

        location_id = _extract_location_id(payload)
        if location_id is None and isinstance(payload, dict):
            logger.warning(
                "PropertyFinder autocomplete: no location_id in response; top-level keys=%s",
                list(payload.keys())[:10],
            )
        else:
            logger.info(
                "PropertyFinder autocomplete: %r -> location_id=%s", query, location_id
            )
        _autocomplete_cache[key] = location_id
        return location_id

    async def _search_rent(
        self,
        client: httpx.AsyncClient,
        location_id: int | str,
        query: RentalSearchQuery,
    ) -> list[dict[str, Any]]:
        url = f"https://{self._host}{self._search_path}"
        params: dict[str, Any] = {
            "location_id": location_id,
            "sort": "newest",
            "page": 1,
        }
        if query.property_type:
            params["property_type"] = query.property_type
        if query.bedrooms_csv:
            params["bedrooms"] = query.bedrooms_csv
        if query.bathrooms_csv:
            params["bathrooms"] = query.bathrooms_csv
        if query.area_min_sqft is not None:
            params["area_min"] = int(query.area_min_sqft)
        if query.area_max_sqft is not None:
            params["area_max"] = int(query.area_max_sqft)
        if query.furnishing and query.furnishing != "any":
            params["furnishing"] = query.furnishing
        if query.amenities_csv:
            params["amenities"] = query.amenities_csv
        if query.price_max_monthly is not None and query.price_max_monthly > 0:
            # Our budget criterion is monthly AED; ask PropertyFinder to
            # match against monthly prices so the cap is applied 1:1.
            params["price_max"] = int(query.price_max_monthly)
            params["rent_frequency"] = "monthly"

        try:
            resp = await client.get(url, params=params, headers=self._headers())
            resp.raise_for_status()
            payload = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning(
                "PropertyFinder search-rent %s (params=%s): %s",
                e.response.status_code, params, e.response.text[:400],
            )
            return []
        except Exception as e:  # noqa: BLE001
            logger.warning("PropertyFinder search-rent failed: %s", e)
            return []

        items = _find_first_list(payload)
        if not items and isinstance(payload, dict):
            logger.warning(
                "PropertyFinder search-rent: no listings list found; top-level keys=%s",
                list(payload.keys())[:10],
            )
        return items[: query.limit]

    async def search(self, query: RentalSearchQuery) -> list[RentalListing]:
        if not self._api_key:
            logger.info("RAPIDAPI_KEY not set; returning empty rental results")
            return []

        # Filters change results, so they must be part of the cache key.
        cache_key = (
            query.city_slug, query.hex_id, query.area_name, query.limit,
            query.property_type, query.bedrooms_csv,
            query.area_min_sqft, query.area_max_sqft,
            query.furnishing, query.amenities_csv, query.price_max_monthly,
        )
        if cache_key in _search_cache:
            return _search_cache[cache_key]

        area_name = (query.area_name or "").strip()
        if not area_name:
            fallback = await _reverse_geocode(query.center_lat, query.center_lng)
            if not fallback:
                logger.info(
                    "No area_name and reverse geocode failed for hex %s", query.hex_id
                )
                _search_cache[cache_key] = []
                return []
            area_name = fallback

        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            location_id = await self._autocomplete_location(client, area_name)
            if location_id is None:
                logger.info("PropertyFinder: no location_id for '%s'", area_name)
                _search_cache[cache_key] = []
                return []

            raw_items = await self._search_rent(client, location_id, query)

        listings: list[RentalListing] = []
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            parsed = _parse_listing(raw)
            if parsed is not None:
                listings.append(parsed)

        logger.info(
            "PropertyFinder: '%s' (location_id=%s) → %d listings",
            area_name, location_id, len(listings),
        )
        _search_cache[cache_key] = listings
        return listings
