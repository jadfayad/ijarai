import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.city_config import get_city
from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.scoring import compute_scores, ComputationCancelled

router = APIRouter()

_current_cancel: asyncio.Event | None = None


@router.post("/score", response_model=ScoreResponse)
async def compute_score(request: ScoreRequest):
    global _current_cancel
    if _current_cancel is not None:
        _current_cancel.set()

    cancel = asyncio.Event()
    _current_cancel = cancel
    try:
        city = get_city(request.city)
        return await compute_scores(city, request, cancel)
    except ComputationCancelled:
        return JSONResponse(status_code=499, content={"detail": "Computation cancelled"})
    finally:
        if _current_cancel is cancel:
            _current_cancel = None


@router.post("/score/cancel")
async def cancel_score():
    global _current_cancel
    if _current_cancel is not None:
        _current_cancel.set()
    return {"status": "cancelled"}
