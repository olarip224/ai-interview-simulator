from __future__ import annotations

import magic
from fastapi import UploadFile

from app.core.exceptions import UploadError

_ACCEPTED_MIME = "application/pdf"


def validate_pdf_file(file: UploadFile, max_size_mb: int) -> None:
    max_bytes = max_size_mb * 1024 * 1024
    if file.size is not None and file.size > max_bytes:
        raise UploadError(f"File exceeds the {max_size_mb} MB size limit")

    if not (file.filename or "").lower().endswith(".pdf"):
        raise UploadError("Only PDF files are accepted")

    header = file.file.read(2048)
    file.file.seek(0)
    mime = magic.from_buffer(header, mime=True)
    if mime != _ACCEPTED_MIME:
        raise UploadError(f"File must be a PDF (detected: {mime})")
