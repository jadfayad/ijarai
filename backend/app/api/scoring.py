import asyncio
import contextlib
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.city_config import get_city
from app.errors import error_body
from app.models.schemas import ScoreRequest, ScoreResponse
from app.services.scoring import compute_scores, ComputationCancelled

logger = logging.getLogger(__name__)

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


@contextlib.asynccontextmanager
async def _job(body: ScoreRequest, request: Request) -> AsyncIterator[asyncio.Event]:
    """Register a cancellable job (superseding one with the same id) for its lifetime."""
    cancel = asyncio.Event()
    job_id = body.job_id
    if job_id:
        previous = _jobs.get(job_id)
        if previous is not None:
            previous.set()
        _jobs[job_id] = cancel
    watcher = asyncio.create_task(_cancel_on_disconnect(request, cancel))
    try:
        yield cancel
    finally:
        watcher.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await watcher
        if job_id and _jobs.get(job_id) is cancel:
            del _jobs[job_id]


@router.post("/score", response_model=ScoreResponse)
async def compute_score(body: ScoreRequest, request: Request):
    city = get_city(body.city)
    async with _job(body, request) as cancel:
        try:
            return await compute_scores(city, body, cancel)
        except ComputationCancelled:
            return JSONResponse(status_code=499, content=error_body(499, "Computation cancelled"))


def _sse(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/score/stream")
async def compute_score_stream(body: ScoreRequest, request: Request):
    """Same computation as /score, streamed as server-sent events.

    Events: start, criterion_done, assembling (progress) then exactly one
    terminal event: result {ScoreResponse} | cancelled | error {code,message,retryable}.
    """
    city = get_city(body.city)  # unknown city -> 404 before the stream opens

    async def events() -> AsyncIterator[str]:
        async with _job(body, request) as cancel:
            queue: asyncio.Queue[dict] = asyncio.Queue()
            task = asyncio.create_task(compute_scores(city, body, cancel, on_progress=queue.put))
            try:
                while True:
                    getter = asyncio.create_task(queue.get())
                    done, _ = await asyncio.wait({getter, task}, return_when=asyncio.FIRST_COMPLETED)
                    if getter in done:
                        event = getter.result()
                        yield _sse(event.pop("type"), event)
                        continue
                    getter.cancel()
                    # Flush progress queued before completion, then the terminal event.
                    while not queue.empty():
                        event = queue.get_nowait()
                        yield _sse(event.pop("type"), event)
                    break

                try:
                    result = task.result()
                    yield _sse("result", result.model_dump())
                except ComputationCancelled:
                    yield _sse("cancelled", error_body(499, "Computation cancelled"))
                except Exception:
                    logger.exception("Streaming score computation failed")
                    yield _sse("error", error_body(500, "Scoring failed. Please try again."))
            finally:
                if not task.done():
                    cancel.set()
                    task.cancel()
                    with contextlib.suppress(BaseException):
                        await task

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/score/cancel")
async def cancel_score(job_id: str):
    event = _jobs.get(job_id)
    if event is not None:
        event.set()
    return {"status": "cancelled" if event else "not_found"}
