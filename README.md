# OptimHouse — Find Your Dream Apartment in Dubai

Interactive heatmap tool that scores Dubai neighborhoods based on commute time, nearby amenities, rent budget, neighborhood quality, and noise levels.

## Architecture

- **Frontend**: Next.js 16 + TypeScript, Tailwind CSS, shadcn/ui, Mapbox GL JS via react-map-gl, deck.gl HeatmapLayer
- **Backend**: Python FastAPI, NumPy, Shapely for geospatial scoring
- **Data**: 5,400+ grid cells at ~500m resolution covering urban Dubai

## Prerequisites

- Node.js 20+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)
- API keys (see below)

## Setup

### 1. Clone and configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

| Variable | Source | Required |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | [mapbox.com/account](https://account.mapbox.com/) | Yes (for map tiles) |
| `ORS_API_KEY` | [openrouteservice.org](https://openrouteservice.org/dev/#/signup) | No (enables car isochrones; falls back to distance) |
| `GOOGLE_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com/) | No (enables transit routing; falls back to distance) |

### 2. Install dependencies

```bash
npm install            # root (installs concurrently)
cd frontend && npm install && cd ..
cd backend && uv venv && uv pip install -r pyproject.toml && cd ..
```

### 3. Run everything

```bash
npm run dev
```

This starts both the backend (port 8000) and frontend (port 3000) in a single terminal.

Open [http://localhost:3000](http://localhost:3000).

You can also run them separately if you prefer:

```bash
npm run dev:backend    # just the Python API
npm run dev:frontend   # just the Next.js app
```

### Docker Compose (alternative)

```bash
cp .env.example .env   # edit with your keys
docker compose up
```

## Usage

1. Open the app — you'll see a dark map of Dubai with a sidebar
2. Enable/disable criteria using the toggles
3. Adjust priority sliders (1 = low priority, 10 = high)
4. For commute criteria: enter a destination address and select car or transit mode
5. For amenities: toggle which categories matter to you
6. For budget: set your max monthly rent in AED
7. Click **Generate Heatmap**
8. Green areas = best match, red = worst match
9. Click any point on the heatmap to see a score breakdown

## Criteria

| Criterion | Description | Data Source |
|---|---|---|
| Commute to Office | Travel time to your workplace | ORS isochrones (car) / Google Directions (transit) / distance fallback |
| Commute to Airport | Travel time to DXB | Same as above |
| Commute to Custom Place | Travel time to any address | Same as above |
| Nearby Amenities | Density of gyms, cafes, beaches, parks, etc. | OpenStreetMap via Overpass API |
| Budget / Rent | Match to your monthly rent budget | Curated zone averages for 30+ Dubai communities |
| Neighborhood Quality | Area reputation and livability | Curated scores (0-10) per community |
| Low Noise | Distance from highways, airports | Computed from road/airport proximity |

## Project Structure

```
optim_house/
├── frontend/          Next.js app
│   └── src/
│       ├── app/           Pages and layout
│       ├── components/    Map, criteria panel, UI
│       ├── lib/           API client, types
│       └── stores/        Zustand state management
├── backend/           Python FastAPI
│   └── app/
│       ├── api/           REST endpoints
│       ├── services/      Scoring, commute, amenities, static data
│       ├── models/        Pydantic schemas
│       └── data/          Grid GeoJSON, zone data
├── docker-compose.yml
└── .env.example
```
