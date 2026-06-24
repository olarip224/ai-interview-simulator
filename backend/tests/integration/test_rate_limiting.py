from __future__ import annotations

import json

import pytest
from slowapi.errors import RateLimitExceeded

from app.middleware.error_handler import _rate_limit_handler


@pytest.mark.asyncio
async def test_rate_limit_handler_returns_json_429():
    """Verify the RateLimitExceeded handler returns proper JSON."""
    from unittest.mock import MagicMock
    request = MagicMock()
    exc = MagicMock(spec=RateLimitExceeded)
    response = await _rate_limit_handler(request, exc)
    assert response.status_code == 429
    body = json.loads(response.body)
    assert body == {"detail": "Rate limit exceeded"}


@pytest.mark.asyncio
async def test_register_works_normally_without_rate_limit(client):
    """Rate limiting is disabled in tests; normal requests must succeed."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "ratetest@example.com", "username": "ratetest", "password": "password123"},
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_login_works_normally_without_rate_limit(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "loginrate@example.com", "username": "loginrate", "password": "password123"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "loginrate@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
