"""
Cell evidence endpoint – returns nearby OSM POIs for a clicked hex cell.

Reuses the same TTL-cached Overpass data as the scoring engine, so no
extra network requests are needed when scoring has already run for the city.
Only criteria types with actual geo-point data (amenities, transit,
healthcare) are handled; commute and AI are covered elsewhere in the UI.
"""
from __future__ import annotations

import asyncio

from fastapi import APIRouter
from pydantic import BaseModel

from app.city_config import get_city
from app.services.amenities import _fetch_pois, CATEGORY_TO_OSM
from app.services.transit import _fetch_stops, MODE_TO_OSM, PROXIMITY_RADIUS_M as TRANSIT_RADIUS_M
from app.services.healthcare import (
    _fetch_facilities,
    FACILITY_TO_OSM,
    DENSITY_RADIUS_M as HEALTHCARE_RADIUS_M,
)
from app.grid_config import amenity_search_radius_m
from app.utils.geo import to_meters

router = APIRouter()

# Matches FACILITY_WEIGHT in healthcare.py: hospital=2.0, clinic=1.0, pharmacy=0.5
_WEIGHT_TO_FACILITY_TYPE: dict[float, str] = {
    2.0: "hospital",
    1.0: "clinic",
    0.5: "pharmacy",
}


class EvidenceCriterion(BaseModel):
    type: str
    params: dict = {}


class CellEvidenceRequest(BaseModel):
    city: str
    lat: float
    lng: float
    cell_size_m: int = 1000
    criteria: list[EvidenceCriterion] = []


@router.post("/cell-evidence")
async def get_cell_evidence(req: CellEvidenceRequest):
    city = get_city(req.city)
    bounds = city.bounds
    mid_lat = (bounds["min_lat"] + bounds["max_lat"]) / 2
    cx, cy = to_meters(req.lat, req.lng, mid_lat)

    amenity_r2 = float(amenity_search_radius_m(req.cell_size_m)) ** 2
    transit_r2 = TRANSIT_RADIUS_M ** 2
    healthcare_r2 = HEALTHCARE_RADIUS_M ** 2

    amenities: list[dict] = []
    transit: list[dict] = []
    healthcare: list[dict] = []

    # Dedup sets prevent re-fetching when the same category appears across
    # multiple criteria of the same type.
    seen_amenity: set[str] = set()
    seen_transit: set[str] = set()
    seen_healthcare: set[str] = set()

    async def _gather_amenities(cats: list[str]) -> None:
        new = [c for c in cats if c in CATEGORY_TO_OSM and c not in seen_amenity]
        if not new:
            return
        seen_amenity.update(new)
        results = await asyncio.gather(*[_fetch_pois(city, c) for c in new])
        for cat, pois in zip(new, results):
            for poi in pois:
                px, py = to_meters(poi["lat"], poi["lng"], mid_lat)
                if (cx - px) ** 2 + (cy - py) ** 2 <= amenity_r2:
                    amenities.append({"lat": poi["lat"], "lng": poi["lng"], "category": cat})

    async def _gather_transit(modes: list[str]) -> None:
        new = [m for m in modes if m in MODE_TO_OSM and m not in seen_transit]
        if not new:
            return
        seen_transit.update(new)
        results = await asyncio.gather(*[_fetch_stops(city, (m,)) for m in new])
        for mode, stops in zip(new, results):
            for slat, slng in stops:
                sx, sy = to_meters(slat, slng, mid_lat)
                if (cx - sx) ** 2 + (cy - sy) ** 2 <= transit_r2:
                    transit.append({"lat": slat, "lng": slng, "mode": mode})

    async def _gather_healthcare(ftypes: list[str]) -> None:
        new = [f for f in ftypes if f in FACILITY_TO_OSM and f not in seen_healthcare]
        if not new:
            return
        seen_healthcare.update(new)
        facilities = await _fetch_facilities(city, tuple(sorted(new)))
        for flat, flng, fweight in facilities:
            fx, fy = to_meters(flat, flng, mid_lat)
            if (cx - fx) ** 2 + (cy - fy) ** 2 <= healthcare_r2:
                ftype = _WEIGHT_TO_FACILITY_TYPE.get(fweight, "clinic")
                if ftype in new:
                    healthcare.append({"lat": flat, "lng": flng, "facility_type": ftype})

    tasks = []
    for crit in req.criteria:
        if crit.type == "amenities":
            tasks.append(_gather_amenities(crit.params.get("categories", [])))
        elif crit.type == "transit":
            tasks.append(_gather_transit(crit.params.get("modes", ["train", "bus"])))
        elif crit.type == "healthcare":
            tasks.append(_gather_healthcare(crit.params.get("facility_types", ["hospital", "clinic"])))

    if tasks:
        await asyncio.gather(*tasks)

    return {"amenities": amenities, "transit": transit, "healthcare": healthcare}
