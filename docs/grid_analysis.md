# Grid Resolution Analysis

Reference for the grid system used in the Dubai housing optimiser.
All authoritative parameter values live in `backend/app/grid_config.py`.

---

## Coverage Area

The grid covers the main urban area of Dubai within these geographic bounds:

| Dimension | Min      | Max      | Span   | Distance |
|-----------|----------|----------|--------|----------|
| Latitude  | 25.00°N  | 25.30°N  | 0.30°  | ~33.4 km |
| Longitude | 55.05°E  | 55.45°E  | 0.40°  | ~40.3 km |

**Total bounding area: ~1,346 km²**

Conversion factors at mid-latitude (25.15°N):

- 1° latitude  ≈ 111,320 m
- 1° longitude ≈ 100,851 m

---

## Resolution Presets

Three presets are available. Each one defines how the grid is spaced and how
cells are drawn on the map.

### Dimensions & Counts

| Property                  | Coarse       | Normal       | Fine          |
|---------------------------|--------------|--------------|---------------|
| **Cell spacing**          | 1,000 m      | 500 m        | 250 m         |
| **Circle radius (visual)**| 550 m       | 300 m        | 150 m         |
| **Circle diameter**       | 1,100 m      | 600 m        | 300 m         |
| **Grid rows (lat)**       | ~34          | ~67          | ~134          |
| **Grid columns (lng)**    | ~41          | ~81          | ~162          |
| **Raw cells (rows × cols)**| ~1,394      | ~5,427       | ~21,708       |
| **Land-only cells (approx)**| ~1,300     | ~5,400       | ~21,000       |

> Roughly 7% of raw cells fall in the sea and are filtered out by the
> `global-land-mask` library.

### Areas

| Property                  | Coarse       | Normal       | Fine          |
|---------------------------|--------------|--------------|---------------|
| **Cell area (square)**    | 1.0 km²      | 0.25 km²     | 0.0625 km²    |
| **Circle area**           | 0.9503 km²   | 0.2827 km²   | 0.0707 km²    |

### Visual Overlap

The `circleRadius` is intentionally larger than half the cell spacing so that
adjacent circles overlap slightly, producing seamless visual coverage on the
map (no gaps). The circles are rendered in meters (`radiusUnits: "meters"` in
the deck.gl `ScatterplotLayer`).

| Property                        | Coarse | Normal | Fine  |
|---------------------------------|--------|--------|-------|
| **Overlap between neighbours**  | 100 m  | 100 m  | 50 m  |
| **Overlap as % of diameter**    | 9.1%   | 16.7%  | 16.7% |
| **Radius-to-spacing ratio**     | 1.10×  | 1.20×  | 1.20× |

---

## Scaling Behaviour

Each step down in resolution **halves the spacing** in both dimensions,
resulting in roughly **4× the number of cells**:

```
coarse  →  normal :  ×4.15   (1,300 → 5,400)
normal  →  fine   :  ×3.89   (5,400 → 21,000)
```

---

## Amenity Search Radius

Amenity scoring uses a fixed search radius of **1,500 m** around each cell
centroid (`AMENITY_SEARCH_RADIUS_M` in `grid_config.py`). This is
significantly larger than any cell spacing, so amenity scores smooth naturally
across neighbouring cells at every resolution.

| Resolution | Search radius / cell spacing |
|------------|------------------------------|
| Coarse     | 1.5×                         |
| Normal     | 3.0×                         |
| Fine       | 6.0×                         |

---

## Rendering Constraints

The deck.gl `ScatterplotLayer` applies pixel-based clamps on top of the
meter-based radius:

| Parameter          | Value | Effect                                      |
|--------------------|-------|---------------------------------------------|
| `radiusMinPixels`  | 4     | Cells stay visible even when fully zoomed out |
| `radiusMaxPixels`  | 25    | Prevents excessive overlap at low zoom       |
| `opacity`          | 0.85  | Slight transparency to show overlap regions  |

---

## File Map

| File                               | Role                                     |
|------------------------------------|------------------------------------------|
| `backend/app/grid_config.py`       | **Source of truth** for all grid params   |
| `backend/app/services/grid.py`     | Grid generation & caching                |
| `backend/app/services/amenities.py`| Amenity scoring (uses search radius)      |
| `frontend/src/lib/types.ts`        | Frontend mirror of resolution presets     |
