import asyncio
import re
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

import app.api.scoring as scoring
from app.main import app

FRONTEND_REGISTRY = Path(__file__).resolve().parents[2] / "frontend/src/lib/cities.ts"


def test_frontend_city_registry_matches_backend():
    """Every city the frontend marks available must have a backend config, and vice versa."""
    src = FRONTEND_REGISTRY.read_text()
    available = set(re.findall(r'slug: "([a-z-]+)"[^}]*available: true', src))
    backend = {c["slug"] for c in TestClient(app).get("/api/cities").json()}
    assert available == backend


def test_error_envelope_shapes():
    c = TestClient(app, raise_server_exceptions=False)
    r = c.get("/api/city", params={"slug": "atlantis"})
    assert r.status_code == 404
    assert r.json()["code"] == "unknown_city"
    r = c.post("/api/score", json={"criteria": "nope"})
    assert r.status_code == 422
    assert set(r.json()) >= {"code", "message", "retryable"}


async def _fake_compute(_city, _body, cancel):
    for _ in range(20):
        if cancel.is_set():
            raise scoring.ComputationCancelled()
        await asyncio.sleep(0.02)
    return {"type": "FeatureCollection", "features": [], "criterion_labels": {}}


@pytest.fixture
def fake_scoring(monkeypatch):
    monkeypatch.setattr(scoring, "compute_scores", _fake_compute)


def _body(job_id):
    return {"criteria": [], "city": "dubai", "job_id": job_id}


def test_cancel_is_scoped_to_one_job(fake_scoring):
    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
            a = asyncio.create_task(c.post("/api/score", json=_body("user-a")))
            b = asyncio.create_task(c.post("/api/score", json=_body("user-b")))
            await asyncio.sleep(0.05)
            await c.post("/api/score/cancel", params={"job_id": "user-b"})
            return await a, await b

    ra, rb = asyncio.run(run())
    assert ra.status_code == 200
    assert rb.status_code == 499
    assert scoring._jobs == {}


def test_resubmitting_a_job_supersedes_it(fake_scoring):
    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
            first = asyncio.create_task(c.post("/api/score", json=_body("same")))
            await asyncio.sleep(0.05)
            second = asyncio.create_task(c.post("/api/score", json=_body("same")))
            return await first, await second

    r1, r2 = asyncio.run(run())
    assert (r1.status_code, r2.status_code) == (499, 200)
