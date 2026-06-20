"""Integration tests for /api/v1/interviews. AI calls mocked via conftest dependency_overrides."""
from __future__ import annotations

import pytest

_USER = {"email": "interview_user@example.com", "username": "interviewuser", "password": "securepassword123"}


async def _login(client) -> str:
    await client.post("/api/v1/auth/register", json=_USER)
    resp = await client.post("/api/v1/auth/login", json={"email": _USER["email"], "password": _USER["password"]})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_session_returns_201(client):
    token = await _login(client)
    resp = await client.post(
        "/api/v1/interviews/sessions",
        json={"interview_type": "swe", "difficulty": "mid"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["interview_type"] == "swe"
    assert body["status"] == "active"
    assert "id" in body


@pytest.mark.asyncio
async def test_list_sessions_returns_created(client):
    token = await _login(client)
    await client.post("/api/v1/interviews/sessions", json={"interview_type": "behavioral", "difficulty": "junior"}, headers=_auth(token))
    resp = await client.get("/api/v1/interviews/sessions", headers=_auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_generate_question_returns_201(client):
    token = await _login(client)
    create = await client.post("/api/v1/interviews/sessions", json={"interview_type": "swe", "difficulty": "senior"}, headers=_auth(token))
    session_id = create.json()["id"]
    resp = await client.post(f"/api/v1/interviews/sessions/{session_id}/questions", headers=_auth(token))
    assert resp.status_code == 201
    assert "question_text" in resp.json()
    assert resp.json()["sequence_order"] == 1


@pytest.mark.asyncio
async def test_submit_answer_returns_feedback(client):
    token = await _login(client)
    create = await client.post("/api/v1/interviews/sessions", json={"interview_type": "swe", "difficulty": "mid"}, headers=_auth(token))
    session_id = create.json()["id"]
    q = await client.post(f"/api/v1/interviews/sessions/{session_id}/questions", headers=_auth(token))
    question_id = q.json()["id"]
    resp = await client.post(
        f"/api/v1/interviews/sessions/{session_id}/questions/{question_id}/answers",
        json={"answer_text": "My answer here.", "time_taken_seconds": 60},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "answer_id" in body
    assert "overall_score" in body["feedback"]


@pytest.mark.asyncio
async def test_complete_session_returns_score(client):
    token = await _login(client)
    create = await client.post("/api/v1/interviews/sessions", json={"interview_type": "ml", "difficulty": "mid"}, headers=_auth(token))
    session_id = create.json()["id"]
    q = await client.post(f"/api/v1/interviews/sessions/{session_id}/questions", headers=_auth(token))
    await client.post(
        f"/api/v1/interviews/sessions/{session_id}/questions/{q.json()['id']}/answers",
        json={"answer_text": "My answer."},
        headers=_auth(token),
    )
    resp = await client.post(f"/api/v1/interviews/sessions/{session_id}/complete", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert "overall_score" in body
    assert body["questions_answered"] == 1


@pytest.mark.asyncio
async def test_complete_session_twice_returns_409(client):
    token = await _login(client)
    create = await client.post("/api/v1/interviews/sessions", json={"interview_type": "swe", "difficulty": "junior"}, headers=_auth(token))
    session_id = create.json()["id"]
    await client.post(f"/api/v1/interviews/sessions/{session_id}/complete", headers=_auth(token))
    resp = await client.post(f"/api/v1/interviews/sessions/{session_id}/complete", headers=_auth(token))
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_session_requires_auth(client):
    resp = await client.post("/api/v1/interviews/sessions", json={"interview_type": "swe", "difficulty": "mid"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_session_feedback(client):
    token = await _login(client)
    create = await client.post("/api/v1/interviews/sessions", json={"interview_type": "swe", "difficulty": "mid"}, headers=_auth(token))
    session_id = create.json()["id"]
    q = await client.post(f"/api/v1/interviews/sessions/{session_id}/questions", headers=_auth(token))
    await client.post(
        f"/api/v1/interviews/sessions/{session_id}/questions/{q.json()['id']}/answers",
        json={"answer_text": "My answer."},
        headers=_auth(token),
    )
    await client.post(f"/api/v1/interviews/sessions/{session_id}/complete", headers=_auth(token))
    resp = await client.get(f"/api/v1/interviews/sessions/{session_id}/feedback", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert "per_question" in body
    assert len(body["per_question"]) == 1
    assert body["per_question"][0]["answer_text"] == "My answer."
