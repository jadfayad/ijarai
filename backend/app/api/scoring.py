import asyncio
import contextlib

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.city_config import get_city
from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.scoring import compute_scores, ComputationCancelled

router = APIRouter()

# Cancellation is scoped per job. Each client generates its own job_id, so one
# user's request can never cancel another user's computation.
_jobs: dict[str, asyncio.Event] = {}

_DISCONNECT_POLL_S = 0.5


async def _cancel_on_disconnect(request: Request, cancel: asyncio.Event) -> None:
    while not cancel.is_set():
        if await request.is_disconnected():
            cancel.set()
            return
        await asyncio.sleep(_DISCONNECT_POLL_S)


@router.post("/score", response_model=ScoreResponse)
async def compute_score(body: ScoreRequest, request: Request):
    cancel = asyncio.Event()
    job_id = body.job_id
    if job_id:
        previous = _jobs.get(job_id)
        if previous is not None:
            previous.set()
        _jobs[job_id] = cancel

    watcher = asyncio.create_task(_cancel_on_disconnect(request, cancel))
    try:
        city = get_city(body.city)
        return await compute_scores(city, body, cancel)
    except ComputationCancelled:
        return JSONResponse(
            status_code=499,
            content={"code": "cancelled", "message": "Computation cancelled", "retryable": True},
        )
    finally:
        watcher.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await watcher
        if job_id and _jobs.get(job_id) is cancel:
            del _jobs[job_id]


@router.post("/score/cancel")
async def cancel_score(job_id: str):
    event = _jobs.get(job_id)
    if event is not None:
        event.set()
    return {"status": "cancelled" if event else "not_found"}
