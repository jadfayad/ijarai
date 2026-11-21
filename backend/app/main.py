from dataclasses import asdict

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.scoring import router as scoring_router
from app.api.geocode import router as geocode_router
from app.api.agent import router as agent_router
from app.api.rentals import router as rentals_router
from app.api.cell_evidence import router as cell_evidence_router
from app.city_config import UnknownCityError, get_city, get_active_city
from app.models.schemas import CityConfigResponse
from app.services.static_data import get_city_average_utility_cost

app = FastAPI(title="OptimHouse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(UnknownCityError)
async def unknown_city_handler(_request: Request, exc: UnknownCityError):
    return JSONResponse(
        status_code=404,
        content={"code": "unknown_city", "message": str(exc), "retryable": False},
    )


app.include_router(scoring_router, prefix="/api")
app.include_router(geocode_router, prefix="/api")
app.include_router(agent_router, prefix="/api")
app.include_router(rentals_router, prefix="/api")
app.include_router(cell_evidence_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/city", response_model=CityConfigResponse)
async def city_config(slug: str = Query(default=None)):
    city = get_city(slug) if slug else get_active_city()
    data = asdict(city)
    data.pop("data_dir_name", None)
    data["utility_avg_monthly"] = get_city_average_utility_cost(city)
    return data
