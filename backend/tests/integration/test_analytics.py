"""Integration tests for /api/v1/analytics. Requires real DB (Docker)."""
from __future__ import annotations

import pytest

_USER = {"email": "analytics_user@example.com", "username": "analyticsuser", "password": "securepassword123"}


async def _login(client) -> str:
    await client.post("/api/v1/auth/register", json=_USER)
    resp = await client.post("/api/v1/auth/login", json={"email": _USER["email"], "password": _USER["password"]})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _complete_session(client, token: str) -> None:
    create = await client.post(
        "/api/v1/interviews/sessions",
        json={"interview_type": "swe", "difficulty": "mid"},
        headers=_auth(token),
    )
    session_id = create.json()["id"]
    q = await client.post(f"/api/v1/interviews/sessions/{session_id}/questions", headers=_auth(token))
    await client.post(
        f"/api/v1/interviews/sessions/{session_id}/questions/{q.json()['id']}/answers",
        json={"answer_text": "My answer."},
        headers=_auth(token),
    )
    await client.post(f"/api/v1/interviews/sessions/{session_id}/complete", headers=_auth(token))


@pytest.mark.asyncio
async def test_summary_empty_for_new_user(client):
    token = await _login(client)
    resp = await client.get("/api/v1/analytics/me/summary", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_sessions"] == 0
    assert body["avg_overall_score"] is None
    assert body["by_interview_type"] == []


@pytest.mark.asyncio
async def test_summary_after_completed_session(client):
    token = await _login(client)
    await _complete_session(client, token)
    resp = await client.get("/api/v1/analytics/me/summary", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_sessions"] == 1
    assert body["avg_overall_score"] is not None
    assert len(body["by_interview_type"]) == 1
    assert body["by_interview_type"][0]["interview_type"] == "swe"


@pytest.mark.asyncio
async def test_progress_returns_items(client):
    token = await _login(client)
    await _complete_session(client, token)
    resp = await client.get("/api/v1/analytics/me/progress", headers=_auth(token))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["interview_type"] == "swe"
    assert "completed_at" in items[0]
    assert "overall_score" in items[0]


@pytest.mark.asyncio
async def test_weak_topics_returns_list(client):
    token = await _login(client)
    await _complete_session(client, token)
    resp = await client.get("/api/v1/analytics/me/weak-topics", headers=_auth(token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_analytics_requires_auth(client):
    resp = await client.get("/api/v1/analytics/me/summary")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_progress_empty_for_new_user(client):
    token = await _login(client)
    resp = await client.get("/api/v1/analytics/me/progress", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json() == []
