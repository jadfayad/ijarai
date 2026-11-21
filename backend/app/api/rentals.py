"""
Rental search endpoint.

Given an H3 cell id, derive its geographic area (center + radius + bbox) and
delegate to the city's configured rental provider.
"""
from __future__ import annotations

import asyncio
import logging

import h3
from fastapi import APIRouter, HTTPException, Query

from app.city_config import get_city
from app.services.rentals import (
    RentalListing,
    RentalProvider,
    RentalProviderUnavailable,
    RentalSearchQuery,
    RentalSearchResponse,
    get_rental_provider,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Any hex finer than ~500m would yield an empty search on most property APIs.
# Floor the radius so clicking a res-9 hex (~175m edge) still returns listings.
_MIN_RADIUS_M = 500.0


def _hex_geometry(hex_id: str) -> tuple[float, float, tuple[float, float, float, float], float]:
    center_lat, center_lng = h3.cell_to_latlng(hex_id)
    boundary = h3.cell_to_boundary(hex_id)  # list[(lat, lng)]
    lats = [pt[0] for pt in boundary]
    lngs = [pt[1] for pt in boundary]
    bbox = (min(lats), min(lngs), max(lats), max(lngs))
    res = h3.get_resolution(hex_id)
    edge_m = h3.average_hexagon_edge_length(res, unit="m")
    radius_m = max(edge_m, _MIN_RADIUS_M)
    return center_lat, center_lng, bbox, radius_m


def _listings_in_hex(listings: list[RentalListing], hex_id: str) -> list[RentalListing]:
    """Return only listings whose coordinates fall within the given H3 cell."""
    res = h3.get_resolution(hex_id)
    return [l for l in listings if h3.latlng_to_cell(l.lat, l.lng, res) == hex_id]


async def _search_neighbour(
    nbr_hex: str, query: RentalSearchQuery, provider: RentalProvider
) -> list[RentalListing]:
    nbr_lat, nbr_lng, nbr_bbox, nbr_radius = _hex_geometry(nbr_hex)
    nbr_query = query.model_copy(update={
        "hex_id": nbr_hex,
        "center_lat": nbr_lat,
        "center_lng": nbr_lng,
        "bbox": nbr_bbox,
        "radius_m": nbr_radius,
        "area_name": None,  # let the provider reverse-geocode the neighbour's centre
        "page": 1,
    })
    try:
        return (await provider.search(nbr_query)).listings
    except RentalProviderUnavailable:
        return []  # one failed neighbour shouldn't sink the expansion


async def _expand_to_neighbours(
    hex_id: str,
    query: RentalSearchQuery,
    provider: RentalProvider,
    initial: list[RentalListing],
) -> list[RentalListing]:
    """Search ring-1 neighbours in parallel; prefer listings inside hex_id."""
    neighbours = sorted(set(h3.grid_disk(hex_id, 1)) - {hex_id})
    results = await asyncio.gather(*(_search_neighbour(n, query, provider) for n in neighbours))

    combined: dict[str, RentalListing] = {l.id: l for l in initial}
    for listings in results:
        for listing in listings:
            combined.setdefault(listing.id, listing)

    in_hex = _listings_in_hex(list(combined.values()), hex_id)
    if in_hex:
        return in_hex

    # Nothing landed in the original hex — return listings inside any neighbour.
    res = h3.get_resolution(hex_id)
    searched = set(h3.grid_disk(hex_id, 1))
    nearby = [l for l in combined.values() if h3.latlng_to_cell(l.lat, l.lng, res) in searched]
    return nearby or initial


@router.get("/rentals/search", response_model=RentalSearchResponse)
async def search_rentals(
    city: str = Query(...),
    hex_id: str = Query(...),
    area_name: str | None = Query(default=None),
    limit: int = Query(default=40, ge=1, le=200),
    page: int = Query(default=1, ge=1, le=50),
    property_type: str | None = Query(default=None),
    bedrooms: str | None = Query(default=None),
    bathrooms: str | None = Query(default=None),
    area_min_sqft: float | None = Query(default=None, ge=0),
    area_max_sqft: float | None = Query(default=None, ge=0),
    furnishing: str | None = Query(default=None),
    amenities: str | None = Query(default=None),
    price_max_monthly: float | None = Query(default=None, ge=0),
    expand_neighbours: bool = Query(default=False),
):
    """Listings for one H3 cell.

    Page 1 may widen to ring-1 neighbour cells (forced by ``expand_neighbours``
    or automatically when most results fall outside the cell); expanded results
    are a single page. Later pages continue the provider's area search as-is.
    """
    city_config = get_city(city)

    try:
        center_lat, center_lng, bbox, radius_m = _hex_geometry(hex_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid hex_id: {e}") from e

    provider = get_rental_provider(city_config)
    if provider is None:
        return RentalSearchResponse(hex_id=hex_id, status="no_provider", page=page, count=0)

    query = RentalSearchQuery(
        city_slug=city_config.slug,
        hex_id=hex_id,
        center_lat=center_lat,
        center_lng=center_lng,
        radius_m=radius_m,
        bbox=bbox,
        area_name=area_name,
        limit=limit,
        page=page,
        property_type=property_type,
        bedrooms_csv=bedrooms,
        bathrooms_csv=bathrooms,
        area_min_sqft=area_min_sqft,
        area_max_sqft=area_max_sqft,
        furnishing=furnishing,
        amenities_csv=amenities,
        price_max_monthly=price_max_monthly,
    )
    try:
        result = await provider.search(query)
    except RentalProviderUnavailable as e:
        logger.info("Rental search unavailable for %s: %s", hex_id, e)
        return RentalSearchResponse(hex_id=hex_id, status="unavailable", page=page, count=0)

    listings = result.listings
    has_more = result.has_more
    expanded = False

    if page == 1:
        in_hex = _listings_in_hex(listings, hex_id)
        mostly_outside = bool(listings) and len(in_hex) / len(listings) < 0.5
        if expand_neighbours or mostly_outside:
            listings = await _expand_to_neighbours(hex_id, query, provider, listings)
            expanded = True
            has_more = False

    return RentalSearchResponse(
        hex_id=hex_id,
        status="ok" if listings else "empty",
        expanded=expanded,
        resolved_area=result.resolved_area,
        total=result.total,
        page=page,
        has_more=has_more,
        count=len(listings),
        listings=listings,
    )
