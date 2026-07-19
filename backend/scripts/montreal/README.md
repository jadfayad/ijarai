# Montreal data ingestion

ETL for the curated scoring layers in `backend/app/data/montreal/`. These scripts
pull from Montreal / Québec / federal open data and transform it into the zone
JSON schemas the scoring services expect (`app/services/static_data.py`,
`app/services/hazard.py`).

The committed `data/montreal/*.json` files are already seeded with published,
neighbourhood-level values so the app runs without running any of this. Re-run a
script to refresh or increase the fidelity of a given layer.

## Shared zone definitions

`_zones.py` holds the canonical ~30 Montreal zones (borough / neighbourhood
centroids + radii). Every layer reuses these so scores stay spatially consistent
across files. Edit zones there once.

## Source catalog

| Layer / file | Source | Endpoint / dataset | License | Cadence |
|---|---|---|---|---|
| `neighborhood_scores.json` → `safety` | **SPVM** actes criminels | `donnees.montreal.ca` CKAN pkg `actes-criminels` (point CSV, lat/lng) | CC-BY 4.0 | ~monthly |
| `neighborhood_scores.json` → `green_spaces` | Grands parcs + tree canopy | `donnees.montreal.ca` pkgs `grands-parcs-parcs-et-espaces-publics`, `indice-canopee` | CC-BY 4.0 | annual |
| `rent_zones.json` | **CMHC** Rental Market Survey (avg rent by zone) | CMHC Housing Market Information Portal — `Primary Rental Market, Average Rent by Zone` (XLSX/CSV; not CKAN — manual download) | CMHC open data | annual (Q4) |
| `school_quality.json` | Québec MEQ results + Fraser Institute rankings | `donneesquebec.ca` (MEQ) + Fraser Institute school report cards | Open / published | annual |
| `hazard_risk.json` | Zones inondables (spring flood plains) | CMM Géogrille / `donnees.montreal.ca` pkg `zones-inondables` (GeoJSON polygons) | CC-BY 4.0 | on revision |
| `noise_sources.json` | Highways / rail / airport | OSM (highway/rail classes) + YUL location; optional Ville de Montréal carte de bruit | ODbL | static |
| `utility_costs.json` | Hydro-Québec residential Rate D | hydroquebec.com published tariffs | published | annual (Apr) |
| `property_tax.json` | Ville de Montréal taux de taxation | ville.montreal.qc.ca budget / rôle foncier | published | annual |

## Scripts

- `build_safety_from_spvm.py` — downloads the SPVM crime point CSV, counts
  incidents within each zone radius, normalizes to a 1–10 safety score (inverse
  of density), and writes it back into the `safety` field of
  `neighborhood_scores.json`. Runnable, representative example of the pattern.

The remaining layers are seeded from the published figures in the source catalog
above; add a `build_<layer>.py` per the same pattern (load `_zones.py`, fetch,
bin to zones, write JSON) when automating them.

## Running

```bash
cd backend
uv run python scripts/montreal/build_safety_from_spvm.py
```

Scripts fetch over the network and print a summary; they overwrite only the field
they own and leave the rest of the JSON untouched. Note: `donnees.montreal.ca` is
behind an edge firewall that may block non-browser/datacenter IPs — run from a
normal network if you get HTTP 403.
