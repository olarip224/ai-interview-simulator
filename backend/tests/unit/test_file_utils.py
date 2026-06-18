import asyncio
import io
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import UploadFile

from app.core.exceptions import UploadError
from app.utils.file_handler import LocalFileStorage
from app.utils.validators import validate_pdf_file


# ── LocalFileStorage ─────────────────────────────────────────────────────────

def test_local_storage_save_creates_file(tmp_path):
    storage = LocalFileStorage(str(tmp_path))
    content = b"%PDF-1.4 fake pdf content"
    path = asyncio.get_event_loop().run_until_complete(
        storage.save(content, suffix=".pdf")
    )
    assert Path(tmp_path / path).exists()
    assert path.endswith(".pdf")


def test_local_storage_save_uses_uuid_filename(tmp_path):
    storage = LocalFileStorage(str(tmp_path))
    content = b"%PDF-1.4 content"
    path1 = asyncio.get_event_loop().run_until_complete(storage.save(content, suffix=".pdf"))
    path2 = asyncio.get_event_loop().run_until_complete(storage.save(content, suffix=".pdf"))
    assert path1 != path2


def test_local_storage_get_file_path(tmp_path):
    storage = LocalFileStorage(str(tmp_path))
    result = storage.get_file_path("abc.pdf")
    assert result == tmp_path / "abc.pdf"


def test_local_storage_delete_removes_file(tmp_path):
    storage = LocalFileStorage(str(tmp_path))
    content = b"%PDF-1.4 content"
    path = asyncio.get_event_loop().run_until_complete(storage.save(content, suffix=".pdf"))
    full = tmp_path / path
    assert full.exists()
    storage.delete(path)
    assert not full.exists()


def test_local_storage_delete_missing_file_is_silent(tmp_path):
    storage = LocalFileStorage(str(tmp_path))
    storage.delete("nonexistent.pdf")  # must not raise


# ── validate_pdf_file ───────────────────────────────────────────────────────

def _make_upload_file(content: bytes, filename: str, content_type: str) -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(content), size=len(content))


def test_validate_pdf_rejects_oversized_file():
    # 11 MB of zeros
    big = b"\x00" * (11 * 1024 * 1024)
    file = _make_upload_file(big, "big.pdf", "application/pdf")
    with pytest.raises(UploadError, match="10 MB"):
        validate_pdf_file(file, max_size_mb=10)


def test_validate_pdf_rejects_wrong_extension():
    content = b"%PDF-1.4 content"
    file = _make_upload_file(content, "resume.exe", "application/pdf")
    with patch("magic.from_buffer", return_value="application/pdf"):
        with pytest.raises(UploadError, match="PDF"):
            validate_pdf_file(file, max_size_mb=10)


def test_validate_pdf_rejects_wrong_mime():
    content = b"not a pdf"
    file = _make_upload_file(content, "resume.pdf", "text/plain")
    with patch("magic.from_buffer", return_value="text/plain"):
        with pytest.raises(UploadError, match="PDF"):
            validate_pdf_file(file, max_size_mb=10)


def test_validate_pdf_accepts_valid_file():
    content = b"%PDF-1.4 valid pdf content"
    file = _make_upload_file(content, "resume.pdf", "application/pdf")
    with patch("magic.from_buffer", return_value="application/pdf"):
        validate_pdf_file(file, max_size_mb=10)  # must not raise
