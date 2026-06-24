"""
Integration tests for /api/v1/resumes.
Requires Docker (postgres) running and ANTHROPIC_API_KEY set.
AI calls are mocked so no real API calls are made.
"""
from __future__ import annotations

import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

_USER = {
    "email": "resume_user@example.com",
    "username": "resumeuser",
    "password": "securepassword123",
}

_PDF_BYTES = b"%PDF-1.4 fake pdf content for testing"


async def _register_and_login(client):
    await client.post("/api/v1/auth/register", json=_USER)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": _USER["email"], "password": _USER["password"]},
    )
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _pdf_file():
    return {"file": ("resume.pdf", io.BytesIO(_PDF_BYTES), "application/pdf")}


@pytest.mark.asyncio
async def test_upload_returns_201(client):
    token = await _register_and_login(client)
    with patch("app.utils.validators.magic") as mock_magic, \
         patch("app.api.v1.routers.resumes._run_analysis", new_callable=AsyncMock):
        mock_magic.from_buffer.return_value = "application/pdf"
        resp = await client.post(
            "/api/v1/resumes",
            headers=_auth(token),
            files=_pdf_file(),
        )
    assert resp.status_code == 202
    body = resp.json()
    assert "id" in body
    assert body["filename"] == "resume.pdf"
    assert body["is_active"] is True


@pytest.mark.asyncio
async def test_upload_rejects_non_pdf(client):
    token = await _register_and_login(client)
    with patch("app.utils.validators.magic") as mock_magic:
        mock_magic.from_buffer.return_value = "text/plain"
        resp = await client.post(
            "/api/v1/resumes",
            headers=_auth(token),
            files={"file": ("resume.txt", io.BytesIO(b"not a pdf"), "text/plain")},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_resumes_returns_uploaded(client):
    token = await _register_and_login(client)
    with patch("app.utils.validators.magic") as mock_magic, \
         patch("app.api.v1.routers.resumes._run_analysis", new_callable=AsyncMock):
        mock_magic.from_buffer.return_value = "application/pdf"
        await client.post("/api/v1/resumes", headers=_auth(token), files=_pdf_file())

    resp = await client.get("/api/v1/resumes", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["limit"] == 50
    assert data["offset"] == 0
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_get_resume_returns_detail(client):
    token = await _register_and_login(client)
    with patch("app.utils.validators.magic") as mock_magic, \
         patch("app.api.v1.routers.resumes._run_analysis", new_callable=AsyncMock):
        mock_magic.from_buffer.return_value = "application/pdf"
        upload = await client.post("/api/v1/resumes", headers=_auth(token), files=_pdf_file())
    resume_id = upload.json()["id"]

    resp = await client.get(f"/api/v1/resumes/{resume_id}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == resume_id


@pytest.mark.asyncio
async def test_get_resume_returns_403_for_other_user(client):
    token_a = await _register_and_login(client)
    with patch("app.utils.validators.magic") as mock_magic, \
         patch("app.api.v1.routers.resumes._run_analysis", new_callable=AsyncMock):
        mock_magic.from_buffer.return_value = "application/pdf"
        upload = await client.post("/api/v1/resumes", headers=_auth(token_a), files=_pdf_file())
    resume_id = upload.json()["id"]

    # Register second user and try to access first user's resume
    user_b = {"email": "b@example.com", "username": "userb", "password": "password123"}
    await client.post("/api/v1/auth/register", json=user_b)
    resp_b = await client.post("/api/v1/auth/login", json={"email": user_b["email"], "password": user_b["password"]})
    token_b = resp_b.json()["access_token"]

    resp = await client.get(f"/api/v1/resumes/{resume_id}", headers=_auth(token_b))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_resume_returns_204(client):
    token = await _register_and_login(client)
    with patch("app.utils.validators.magic") as mock_magic, \
         patch("app.api.v1.routers.resumes._run_analysis", new_callable=AsyncMock):
        mock_magic.from_buffer.return_value = "application/pdf"
        upload = await client.post("/api/v1/resumes", headers=_auth(token), files=_pdf_file())
    resume_id = upload.json()["id"]

    resp = await client.delete(f"/api/v1/resumes/{resume_id}", headers=_auth(token))
    assert resp.status_code == 204

    # Deleted resume no longer in list
    list_resp = await client.get("/api/v1/resumes", headers=_auth(token))
    ids = [r["id"] for r in list_resp.json()["items"]]
    assert resume_id not in ids


@pytest.mark.asyncio
async def test_reanalyze_returns_parsed_data(client):
    token = await _register_and_login(client)
    # Upload a resume first
    with patch("app.utils.validators.magic") as mock_magic, \
         patch("app.api.v1.routers.resumes._run_analysis", new_callable=AsyncMock):
        mock_magic.from_buffer.return_value = "application/pdf"
        upload = await client.post("/api/v1/resumes", headers=_auth(token), files=_pdf_file())
    resume_id = upload.json()["id"]

    # Call analyze endpoint with extract_text mocked
    with patch("app.services.resume_service.extract_text", new_callable=AsyncMock) as mock_extract:
        mock_extract.return_value = "Test resume content with Python and REST API experience"
        resp = await client.post(
            f"/api/v1/resumes/{resume_id}/analyze",
            headers=_auth(token),
        )

    assert resp.status_code == 200
    body = resp.json()
    assert "parsed_data" in body
    assert isinstance(body["parsed_data"]["skills"], list)


@pytest.mark.asyncio
async def test_upload_requires_auth(client):
    resp = await client.post("/api/v1/resumes", files=_pdf_file())
    assert resp.status_code == 403
