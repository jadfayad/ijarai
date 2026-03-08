from fastapi import APIRouter

from app.models.schemas import ScoreRequest, ScoreResponse

router = APIRouter()


@router.post("/score", response_model=ScoreResponse)
async def compute_score(request: ScoreRequest):
    from app.services.scoring import compute_scores
    return await compute_scores(request)
