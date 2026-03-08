from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.scoring import router as scoring_router
from app.api.geocode import router as geocode_router

app = FastAPI(title="OptimHouse API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scoring_router, prefix="/api")
app.include_router(geocode_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
