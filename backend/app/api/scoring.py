from fastapi import APIRouter

from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.scoring import compute_scores

router = APIRouter()


@router.post("/score", response_model=ScoreResponse)
async def compute_score(request: ScoreRequest):
    return await compute_scores(request)
