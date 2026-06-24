from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_security_headers_present_on_health(client):
    resp = await client.get("/api/v1/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("X-XSS-Protection") == "0"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Permissions-Policy" in resp.headers


@pytest.mark.asyncio
async def test_security_headers_present_on_any_route(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "hdr@example.com", "username": "hdrtest", "password": "password123"},
    )
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"


@pytest.mark.asyncio
async def test_x_request_id_present(client):
    resp = await client.get("/api/v1/health")
    assert "X-Request-ID" in resp.headers
    assert len(resp.headers["X-Request-ID"]) == 36
