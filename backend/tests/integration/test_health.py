from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health_check_returns_ok(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"
    assert data["redis"] == "ok"


@pytest.mark.asyncio
async def test_health_check_includes_all_fields(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert set(resp.json().keys()) == {"status", "db", "redis"}
