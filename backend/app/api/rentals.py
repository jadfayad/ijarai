"""
Rental search endpoint.

Given an H3 cell id, derive its geographic area (center + radius + bbox) and
delegate to the city's configured rental provider.
"""
from __future__ import annotations

import h3
from fastapi import APIRouter, HTTPException, Query

from app.city_config import get_city
from app.services.rentals import (
    RentalListing,
    RentalSearchQuery,
    RentalSearchResponse,
    get_rental_provider,
)

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


async def _expand_to_neighbours(
    hex_id: str,
    query: RentalSearchQuery,
    provider,
    initial: list[RentalListing],
) -> list[RentalListing]:
    """Search ring-1 neighbours and return listings confirmed inside hex_id."""
    combined: dict[str, RentalListing] = {l.id: l for l in initial}

    for nbr_hex in set(h3.grid_disk(hex_id, 1)) - {hex_id}:
        nbr_lat, nbr_lng, nbr_bbox, nbr_radius = _hex_geometry(nbr_hex)
        nbr_query = query.model_copy(update={
            "hex_id": nbr_hex,
            "center_lat": nbr_lat,
            "center_lng": nbr_lng,
            "bbox": nbr_bbox,
            "radius_m": nbr_radius,
            "area_name": None,  # let the provider reverse-geocode the neighbour's centre
        })
        try:
            for listing in await provider.search(nbr_query):
                combined.setdefault(listing.id, listing)
        except Exception:
            continue

        pool = list(combined.values())
        if pool and len(_listings_in_hex(pool, hex_id)) / len(pool) >= 0.5:
            break  # threshold met — stop early

    in_hex = _listings_in_hex(list(combined.values()), hex_id)
    if in_hex:
        return in_hex

    # Nothing landed in the original hex — return listings confirmed inside any neighbour.
    res = h3.get_resolution(hex_id)
    all_searched = set(h3.grid_disk(hex_id, 1))
    nearby = [l for l in combined.values() if h3.latlng_to_cell(l.lat, l.lng, res) in all_searched]
    return nearby if nearby else initial


@router.get("/rentals/search", response_model=RentalSearchResponse)
async def search_rentals(
    city: str = Query(...),
    hex_id: str = Query(...),
    area_name: str | None = Query(default=None),
    limit: int = Query(default=40, ge=1, le=200),
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
    city_config = get_city(city)
    provider = get_rental_provider(city_config)
    if provider is None:
        raise HTTPException(
            status_code=404,
            detail=f"No rental provider configured for {city_config.slug}",
        )

    try:
        center_lat, center_lng, bbox, radius_m = _hex_geometry(hex_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid hex_id: {e}") from e

    query = RentalSearchQuery(
        city_slug=city_config.slug,
        hex_id=hex_id,
        center_lat=center_lat,
        center_lng=center_lng,
        radius_m=radius_m,
        bbox=bbox,
        area_name=area_name,
        limit=limit,
        property_type=property_type,
        bedrooms_csv=bedrooms,
        bathrooms_csv=bathrooms,
        area_min_sqft=area_min_sqft,
        area_max_sqft=area_max_sqft,
        furnishing=furnishing,
        amenities_csv=amenities,
        price_max_monthly=price_max_monthly,
    )
    listings = await provider.search(query)

    # Expand to ring-1 neighbours when forced (user clicked "Expand Search") or
    # when less than half the results are geographically inside the clicked hex.
    in_hex = _listings_in_hex(listings, hex_id)
    if expand_neighbours or (listings and len(in_hex) / len(listings) < 0.5):
        listings = await _expand_to_neighbours(hex_id, query, provider, listings)

    return RentalSearchResponse(hex_id=hex_id, count=len(listings), listings=listings)
