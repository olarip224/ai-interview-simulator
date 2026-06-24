from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from app.middleware.error_handler import _unhandled_exception_handler


@pytest.mark.asyncio
async def test_unhandled_exception_returns_500():
    request = MagicMock()
    request.state.request_id = "test-request-id"
    request.url.path = "/api/v1/test"
    exc = RuntimeError("Something exploded")
    response = await _unhandled_exception_handler(request, exc)
    assert response.status_code == 500
    body = json.loads(response.body)
    assert body["detail"] == "Internal server error"
    assert body["request_id"] == "test-request-id"


@pytest.mark.asyncio
async def test_unhandled_exception_uses_unknown_when_no_request_id():
    request = MagicMock()
    request.state = object()  # plain object — no request_id attribute
    request.url.path = "/api/v1/test"
    exc = ValueError("oops")
    response = await _unhandled_exception_handler(request, exc)
    assert response.status_code == 500
    body = json.loads(response.body)
    assert body["request_id"] == "unknown"
