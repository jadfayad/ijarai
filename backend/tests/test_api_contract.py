import asyncio
import json
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


def _parse_sse(text: str) -> list[tuple[str, dict]]:
    out = []
    for block in text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines() if ": " in line)
        out.append((lines["event"], json.loads(lines["data"])))
    return out


def test_score_stream_reports_progress_then_result():
    body = {
        "criteria": [{"type": "budget", "weight": 5, "params": {"max_monthly_rent": 8000}}],
        "cell_size_m": 2500,
        "city": "dubai",
    }
    r = TestClient(app).post("/api/score/stream", json=body)
    assert r.status_code == 200
    events = _parse_sse(r.text)
    names = [e for e, _ in events]
    assert names[0] == "start" and names[-1] == "result"
    assert names.count("criterion_done") == 1 and "assembling" in names
    start = events[0][1]
    assert start["cells"] > 0 and start["criteria"][0]["label"] == "Budget Match"
    result = events[-1][1]
    assert len(result["features"]) == start["cells"]
    assert set(result["criterion_status"].values()) <= {"ok", "no_variation", "empty"}


def test_score_stream_unknown_city_is_404_not_a_stream():
    r = TestClient(app).post("/api/score/stream", json={"criteria": [], "city": "atlantis"})
    assert r.status_code == 404
    assert r.json()["code"] == "unknown_city"


def test_score_stream_cancel(monkeypatch):
    async def slow(_city, _body, cancel, on_progress=None):
        await on_progress({"type": "start", "cells": 1, "criteria": []})
        for _ in range(50):
            if cancel.is_set():
                raise scoring.ComputationCancelled()
            await asyncio.sleep(0.02)
        raise AssertionError("not cancelled")

    monkeypatch.setattr(scoring, "compute_scores", slow)

    async def run():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
            stream = asyncio.create_task(
                c.post("/api/score/stream", json={"criteria": [], "city": "dubai", "job_id": "s1"})
            )
            await asyncio.sleep(0.1)
            await c.post("/api/score/cancel", params={"job_id": "s1"})
            return await stream

    r = asyncio.run(run())
    names = [e for e, _ in _parse_sse(r.text)]
    assert names == ["start", "cancelled"]


class _RecordingProvider:
    def __init__(self, fail=False):
        self.calls = []
        self.fail = fail

    async def run_stream(self, prompt, city, existing_criteria=None, history=None, focus_area=None):
        self.calls.append({"prompt": prompt, "history": history, "focus_area": focus_area})
        if self.fail:
            raise RuntimeError("boom")
        yield {"type": "result", "data": {"summary": "ok", "zones": [], "pois": []}}


def _agent_post(monkeypatch, provider, body):
    import app.api.agent as agent_api

    monkeypatch.setattr(agent_api, "get_provider", lambda: provider)
    agent_api._ai_stream_cache.clear()
    return TestClient(app).post("/api/agent/research/stream", json=body)


def test_agent_stream_forwards_history_and_focus_area(monkeypatch):
    provider = _RecordingProvider()
    history = [{"role": "user", "content": f"q{i}"} for i in range(20)]
    r = _agent_post(monkeypatch, provider, {
        "prompt": "make it cheaper",
        "city": "dubai",
        "history": history,
        "focus_area": {"name": "Jumeirah", "lat": 25.2, "lng": 55.2, "score": 0.4,
                       "breakdown": {"Budget Match": 0.3}},
    })
    assert [e for e, _ in _parse_sse(r.text)] == ["result"]
    call = provider.calls[0]
    assert len(call["history"]) == 12 and call["history"][-1].content == "q19"
    assert call["focus_area"].name == "Jumeirah"


def test_agent_follow_up_is_never_served_from_cache(monkeypatch):
    provider = _RecordingProvider()
    body = {"prompt": "same question", "city": "dubai"}
    _agent_post(monkeypatch, provider, body)
    import app.api.agent as agent_api
    monkeypatch.setattr(agent_api, "get_provider", lambda: provider)
    TestClient(app).post("/api/agent/research/stream", json={
        **body, "history": [{"role": "user", "content": "earlier"}],
    })
    assert len(provider.calls) == 2


def test_agent_provider_crash_ends_with_error_frame(monkeypatch):
    r = _agent_post(monkeypatch, _RecordingProvider(fail=True), {"prompt": "x", "city": "dubai"})
    events = _parse_sse(r.text)
    assert events[-1][0] == "error"
    assert events[-1][1]["code"] == "server_error"
