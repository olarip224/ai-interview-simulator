from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.coding import CodingChallenge

_TWO_SUM = {
    "title": "Two Sum",
    "difficulty": "easy",
    "description": (
        "Given an array of integers nums and an integer target, "
        "return indices of the two numbers such that they add up to target."
    ),
    "tags": ["arrays", "hash-map"],
    "examples": [{"input": "nums=[2,7,11,15], target=9", "output": "[0,1]"}],
    "constraints": ["2 <= nums.length <= 10^4"],
    "starter_code": {"python": "def two_sum(nums, target):\n    pass"},
    "expected_approach": "Use a hash map to store complements. O(n) time.",
    "is_active": True,
}


@pytest_asyncio.fixture
async def seeded_challenge(db_session):
    c = CodingChallenge(**_TWO_SUM)
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    yield c


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "coder@example.com", "username": "coder", "password": "password123"},
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.mark.asyncio
async def test_list_challenges_returns_seeded(client: AsyncClient, seeded_challenge):
    resp = await client.get("/api/v1/challenges")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Two Sum"
    assert data[0]["difficulty"] == "easy"
    assert "description" not in data[0]


@pytest.mark.asyncio
async def test_list_challenges_filters_by_difficulty(client: AsyncClient, seeded_challenge):
    resp = await client.get("/api/v1/challenges?difficulty=medium")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_challenge_detail_returns_description(client: AsyncClient, seeded_challenge):
    resp = await client.get(f"/api/v1/challenges/{seeded_challenge.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "description" in data
    assert "examples" in data
    assert "starter_code" in data
    assert data["title"] == "Two Sum"


@pytest.mark.asyncio
async def test_get_nonexistent_challenge_returns_404(client: AsyncClient):
    from uuid import uuid4
    resp = await client.get(f"/api/v1/challenges/{uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_submit_attempt_requires_auth(client: AsyncClient, seeded_challenge):
    resp = await client.post(
        f"/api/v1/challenges/{seeded_challenge.id}/attempts",
        json={"language": "python", "code_text": "pass"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_submit_attempt_returns_201_with_feedback(
    client: AsyncClient, auth_headers, seeded_challenge
):
    resp = await client.post(
        f"/api/v1/challenges/{seeded_challenge.id}/attempts",
        json={
            "language": "python",
            "code_text": "def two_sum(nums, target): return [0, 1]",
            "time_taken_seconds": 60,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "attempt_id" in data
    assert "feedback" in data
    feedback = data["feedback"]
    assert "overall_score" in feedback
    assert "is_correct" in feedback
    assert isinstance(feedback["strengths"], list)


@pytest.mark.asyncio
async def test_list_my_attempts_returns_submitted(
    client: AsyncClient, auth_headers, seeded_challenge
):
    await client.post(
        f"/api/v1/challenges/{seeded_challenge.id}/attempts",
        json={"language": "python", "code_text": "def two_sum(nums, target): return [0, 1]"},
        headers=auth_headers,
    )
    resp = await client.get("/api/v1/challenges/me/attempts", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["challenge_id"] == str(seeded_challenge.id)


@pytest.mark.asyncio
async def test_list_my_attempts_filters_by_challenge(
    client: AsyncClient, auth_headers, seeded_challenge
):
    from uuid import uuid4
    await client.post(
        f"/api/v1/challenges/{seeded_challenge.id}/attempts",
        json={"language": "python", "code_text": "pass"},
        headers=auth_headers,
    )
    resp = await client.get(
        f"/api/v1/challenges/me/attempts?challenge_id={uuid4()}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_attempt_detail_returns_code(
    client: AsyncClient, auth_headers, seeded_challenge
):
    submit_resp = await client.post(
        f"/api/v1/challenges/{seeded_challenge.id}/attempts",
        json={"language": "python", "code_text": "def two_sum(n, t): return [0,1]", "time_taken_seconds": 90},
        headers=auth_headers,
    )
    attempt_id = submit_resp.json()["attempt_id"]

    resp = await client.get(f"/api/v1/challenges/me/attempts/{attempt_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code_text"] == "def two_sum(n, t): return [0,1]"
    assert data["language"] == "python"
    assert data["time_taken_seconds"] == 90
