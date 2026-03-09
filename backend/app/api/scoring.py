from fastapi import APIRouter

from app.city_config import get_city
from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.scoring import compute_scores

router = APIRouter()


@router.post("/score", response_model=ScoreResponse)
async def compute_score(request: ScoreRequest):
    city = get_city(request.city)
    return await compute_scores(city, request)
