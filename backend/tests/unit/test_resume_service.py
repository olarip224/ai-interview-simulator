import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import UploadFile

from app.core.exceptions import ForbiddenError, UploadError
from app.services.resume_service import ResumeService

_USER_ID = uuid.uuid4()
_RESUME_ID = uuid.uuid4()


def _make_service():
    session = AsyncMock()
    file_storage = AsyncMock()
    ai_client = AsyncMock()
    svc = ResumeService(session, file_storage, ai_client)
    svc.repo = AsyncMock()
    return svc, file_storage, ai_client


def _make_upload_file(content: bytes = b"%PDF-1.4 x", filename: str = "r.pdf") -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(content), size=len(content))


# ── upload ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_validates_file():
    svc, _, _ = _make_service()
    bad_file = _make_upload_file(b"not a pdf", "r.txt")
    with patch("app.services.resume_service.validate_pdf_file", side_effect=UploadError("bad")):
        with pytest.raises(UploadError):
            await svc.upload(_USER_ID, bad_file)


@pytest.mark.asyncio
async def test_upload_saves_file_and_creates_record():
    svc, file_storage, _ = _make_service()
    file_storage.save = AsyncMock(return_value="abc123.pdf")
    mock_resume = MagicMock(id=_RESUME_ID)
    svc.repo.create = AsyncMock(return_value=mock_resume)

    upload = _make_upload_file()
    with patch("app.services.resume_service.validate_pdf_file"):
        result = await svc.upload(_USER_ID, upload)

    file_storage.save.assert_awaited_once()
    svc.repo.create.assert_awaited_once()
    assert result is mock_resume


# ── analyze ────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_analyze_calls_ai_and_updates_record():
    svc, file_storage, ai_client = _make_service()
    mock_resume = MagicMock(storage_path="abc123.pdf")
    file_storage.get_file_path = MagicMock(return_value="/uploads/abc123.pdf")
    svc.repo.update_parsed = AsyncMock(return_value=mock_resume)
    ai_client.complete = AsyncMock(return_value='{"skills":["Python"],"experience":[],"education":[],"summary":"Dev."}')

    with patch("app.services.resume_service.extract_text", return_value="resume text"):
        result = await svc.analyze(mock_resume)

    ai_client.complete.assert_awaited_once()
    svc.repo.update_parsed.assert_awaited_once()
    assert result is mock_resume


# ── get_by_id ──────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_by_id_raises_forbidden_for_wrong_user():
    svc, _, _ = _make_service()
    other_user_id = uuid.uuid4()
    mock_resume = MagicMock(user_id=other_user_id)
    svc.repo.get_or_404 = AsyncMock(return_value=mock_resume)

    with pytest.raises(ForbiddenError):
        await svc.get_by_id(_RESUME_ID, _USER_ID)


@pytest.mark.asyncio
async def test_get_by_id_returns_resume_for_owner():
    svc, _, _ = _make_service()
    mock_resume = MagicMock(user_id=_USER_ID)
    svc.repo.get_or_404 = AsyncMock(return_value=mock_resume)

    result = await svc.get_by_id(_RESUME_ID, _USER_ID)
    assert result is mock_resume


# ── delete ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_soft_deletes_resume():
    svc, file_storage, _ = _make_service()
    mock_resume = MagicMock(user_id=_USER_ID, storage_path="abc123.pdf")
    svc.repo.get_or_404 = AsyncMock(return_value=mock_resume)
    svc.repo.soft_delete = AsyncMock()

    await svc.delete(_RESUME_ID, _USER_ID)

    svc.repo.soft_delete.assert_awaited_once_with(mock_resume)


@pytest.mark.asyncio
async def test_delete_raises_forbidden_for_wrong_user():
    svc, _, _ = _make_service()
    mock_resume = MagicMock(user_id=uuid.uuid4())
    svc.repo.get_or_404 = AsyncMock(return_value=mock_resume)

    with pytest.raises(ForbiddenError):
        await svc.delete(_RESUME_ID, _USER_ID)
