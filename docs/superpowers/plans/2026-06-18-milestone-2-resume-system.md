# Milestone 2 — Resume System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full resume upload, storage, PDF parsing, and AI-analysis pipeline behind five REST endpoints.

**Architecture:** Files are saved to local disk via a `FileStorage` abstraction (swappable to S3 later). Upload returns immediately with `status: "processing"`; PDF extraction and Claude AI analysis run in a FastAPI `BackgroundTasks` callback that opens its own DB session. Clean Architecture layers (Router → Service → Repository) are strictly maintained — the `AIClient` is injected into the service the same way the DB session is.

**Tech Stack:** FastAPI `UploadFile` + `BackgroundTasks`, `pdfplumber` (PDF text extraction in thread pool), `python-magic` (MIME validation), `anthropic` (Claude API), PostgreSQL JSONB for parsed resume data, existing SQLAlchemy 2.0 async / Alembic / Pydantic v2 stack.

## Global Constraints

- Python ≥ 3.12; all annotations use built-in generics (`list[str]`, `X | None`)
- SQLAlchemy async only — `await` all queries, no sync Session
- All PKs: `UUID(as_uuid=True)`; all timestamps: `DateTime(timezone=True)`
- `response_model=` on every route that returns a body
- Business logic in services only — routers call one service method then optionally enqueue a background task
- Services must not import SQLAlchemy models at runtime (use `TYPE_CHECKING` guard if needed)
- Never call `Base.metadata.create_all()` — Alembic only
- Max upload size: **10 MB**; accepted MIME type: `application/pdf` only
- `ANTHROPIC_API_KEY`, `UPLOAD_DIR`, `MAX_UPLOAD_SIZE_MB` added to `Settings` and `.env.example`
- Background tasks open their own `AsyncSession` via `_AsyncSessionLocal` — never reuse the request session
- All routes under `/api/v1/resumes`
- Git repo root for staging: `\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator`

---

### Task 1: Resume ORM Model and Alembic Migration

**Files:**
- Create: `backend/app/models/resume.py`
- Create: `backend/alembic/versions/0002_add_resumes.py`
- Modify: `backend/app/core/exceptions.py` (add `UploadError`)

**Interfaces:**
- Consumes: `Base`, `UUIDMixin`, `TimestampMixin` from `app/models/base.py`
- Produces:
  - `Resume` ORM class with fields: `id`, `user_id`, `filename`, `storage_path`, `raw_text`, `parsed_data`, `is_active`, `created_at`, `updated_at`
  - `UploadError(AppError)` with `status_code=400`
  - Migration `0002` that creates the `resumes` table

- [ ] **Step 1: Add `UploadError` to exceptions**

Open `backend/app/core/exceptions.py` and append:

```python
class UploadError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=400)
```

- [ ] **Step 2: Create `backend/app/models/resume.py`**

```python
from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class Resume(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "resumes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="resumes")
```

- [ ] **Step 3: Add `resumes` relationship to `backend/app/models/user.py`**

Open `backend/app/models/user.py`. Add to the top import block (inside `TYPE_CHECKING`):

```python
from __future__ import annotations

from typing import TYPE_CHECKING
...
if TYPE_CHECKING:
    from app.models.resume import Resume
```

Then add the relationship field to the `User` class (after `is_verified`):

```python
    resumes: Mapped[list[Resume]] = relationship(
        "Resume", back_populates="user", cascade="all, delete-orphan"
    )
```

- [ ] **Step 4: Create migration `backend/alembic/versions/0002_add_resumes.py`**

```python
"""add resumes table

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-18
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "resumes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("raw_text", sa.Text, nullable=True),
        sa.Column("parsed_data", postgresql.JSONB, nullable=True),
        sa.Column(
            "is_active", sa.Boolean, nullable=False, server_default=sa.text("TRUE")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resumes_user_id", "resumes", ["user_id"])
    op.create_index(
        "ix_resumes_user_id_is_active", "resumes", ["user_id", "is_active"]
    )


def downgrade() -> None:
    op.drop_index("ix_resumes_user_id_is_active", table_name="resumes")
    op.drop_index("ix_resumes_user_id", table_name="resumes")
    op.drop_table("resumes")
```

- [ ] **Step 5: Commit**

```
git add backend/app/core/exceptions.py
git add backend/app/models/resume.py
git add backend/app/models/user.py
git add backend/alembic/versions/0002_add_resumes.py
git commit -m "feat: Resume model and Alembic migration 0002"
```

---

### Task 2: File Utilities — Storage, PDF Parser, and Validator

**Files:**
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/file_handler.py`
- Create: `backend/app/utils/pdf_parser.py`
- Create: `backend/app/utils/validators.py`
- Create: `backend/tests/unit/test_file_utils.py`
- Modify: `backend/requirements.txt` (add pdfplumber, python-magic)
- Modify: `backend/docker/Dockerfile` (add libmagic1)

**Interfaces:**
- Consumes: `UploadError` from `app/core/exceptions`
- Produces:
  - `FileStorage` ABC with `save(content: bytes, *, suffix: str) -> str` and `get_file_path(storage_path: str) -> Path` and `delete(storage_path: str) -> None`
  - `LocalFileStorage(upload_dir: str)` concrete implementation
  - `extract_text(file_path: str) -> str` async function (runs pdfplumber in thread pool)
  - `validate_pdf_file(file: UploadFile, max_size_mb: int) -> None` — raises `UploadError`

- [ ] **Step 1: Add dependencies to `backend/requirements.txt`**

Append to the file (before the `# Testing` comment):

```
pdfplumber==0.11.4
python-magic==0.4.27
anthropic==0.43.0
```

- [ ] **Step 2: Update `backend/docker/Dockerfile` to install libmagic**

Replace the existing Dockerfile with:

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libmagic1 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Create `backend/app/utils/__init__.py`** (empty file)

- [ ] **Step 4: Write failing tests — `backend/tests/unit/test_file_utils.py`**

```python
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


# ── LocalFileStorage ──────────────────────────────────────────────────────────

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


# ── validate_pdf_file ──────────────────────────────────────────────────────────

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
```

- [ ] **Step 5: Run tests — expect failures**

```
cd backend && pytest tests/unit/test_file_utils.py -v
```

Expected: `ModuleNotFoundError` or `ImportError` (modules don't exist yet).

- [ ] **Step 6: Create `backend/app/utils/file_handler.py`**

```python
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from pathlib import Path


class FileStorage(ABC):
    @abstractmethod
    async def save(self, content: bytes, *, suffix: str) -> str:
        """Persist content and return the storage path (relative key)."""

    @abstractmethod
    def get_file_path(self, storage_path: str) -> Path:
        """Resolve a storage path to a filesystem Path."""

    @abstractmethod
    def delete(self, storage_path: str) -> None:
        """Remove the file. Silent if it doesn't exist."""


class LocalFileStorage(FileStorage):
    def __init__(self, upload_dir: str) -> None:
        self._root = Path(upload_dir)
        self._root.mkdir(parents=True, exist_ok=True)

    async def save(self, content: bytes, *, suffix: str) -> str:
        filename = f"{uuid.uuid4()}{suffix}"
        (self._root / filename).write_bytes(content)
        return filename

    def get_file_path(self, storage_path: str) -> Path:
        return self._root / storage_path

    def delete(self, storage_path: str) -> None:
        path = self._root / storage_path
        path.unlink(missing_ok=True)
```

- [ ] **Step 7: Create `backend/app/utils/pdf_parser.py`**

```python
from __future__ import annotations

import asyncio
from functools import partial


def _extract_sync(file_path: str) -> str:
    import pdfplumber

    with pdfplumber.open(file_path) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages).strip()


async def extract_text(file_path: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_extract_sync, file_path))
```

- [ ] **Step 8: Create `backend/app/utils/validators.py`**

```python
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
```

- [ ] **Step 9: Run tests — expect pass**

```
cd backend && pytest tests/unit/test_file_utils.py -v
```

Expected: all 9 tests pass.

- [ ] **Step 10: Commit**

```
git add backend/requirements.txt
git add backend/docker/Dockerfile
git add backend/app/utils/__init__.py
git add backend/app/utils/file_handler.py
git add backend/app/utils/pdf_parser.py
git add backend/app/utils/validators.py
git add backend/tests/unit/test_file_utils.py
git commit -m "feat: file storage abstraction, PDF parser, and upload validator"
```

---

### Task 3: AI Client, Resume Prompt, and Response Parser (TDD)

**Files:**
- Create: `backend/app/ai/__init__.py`
- Create: `backend/app/ai/client.py`
- Create: `backend/app/ai/prompts/__init__.py`
- Create: `backend/app/ai/prompts/resume.py`
- Create: `backend/app/ai/parsers.py`
- Create: `backend/tests/unit/test_parsers.py`
- Modify: `backend/app/config.py` (add `ANTHROPIC_API_KEY`, `UPLOAD_DIR`, `MAX_UPLOAD_SIZE_MB`)
- Modify: `backend/.env.example`

**Interfaces:**
- Produces:
  - `AIClient` ABC: `async def complete(self, messages: list[dict[str, str]], *, model: str, max_tokens: int) -> str`
  - `ClaudeClient(api_key: str)` implementing `AIClient`
  - `RESUME_ANALYSIS_PROMPT: str` (contains `{resume_text}` placeholder)
  - `ParsedResumeData(BaseModel)` with fields `skills: list[str]`, `experience: list[dict]`, `education: list[dict]`, `summary: str`
  - `parse_resume_analysis(raw: str) -> ParsedResumeData`
  - `settings.ANTHROPIC_API_KEY: str`
  - `settings.UPLOAD_DIR: str`
  - `settings.MAX_UPLOAD_SIZE_MB: int`

- [ ] **Step 1: Update `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AI Interview Simulator"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    DATABASE_URL: str
    DATABASE_ECHO: bool = False

    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # AI
    ANTHROPIC_API_KEY: str

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10


settings = Settings()
```

- [ ] **Step 2: Update `backend/.env.example`** — append these lines:

```
# Claude AI
ANTHROPIC_API_KEY=sk-ant-your-key-here

# File uploads
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
```

- [ ] **Step 3: Write failing tests — `backend/tests/unit/test_parsers.py`**

```python
import pytest
from app.ai.parsers import ParsedResumeData, parse_resume_analysis


def test_parse_well_formed_json():
    raw = """
    {
      "skills": ["Python", "FastAPI", "PostgreSQL"],
      "experience": [{"title": "SWE", "company": "Acme", "duration": "2020-2023", "description": "Built APIs"}],
      "education": [{"degree": "BSc CS", "institution": "MIT", "year": "2020"}],
      "summary": "Experienced backend engineer."
    }
    """
    result = parse_resume_analysis(raw)
    assert result.skills == ["Python", "FastAPI", "PostgreSQL"]
    assert result.experience[0]["title"] == "SWE"
    assert result.education[0]["degree"] == "BSc CS"
    assert "backend" in result.summary


def test_parse_json_embedded_in_prose():
    raw = """
    Sure, here is the analysis:
    {"skills": ["Go"], "experience": [], "education": [], "summary": "Go developer."}
    Hope that helps!
    """
    result = parse_resume_analysis(raw)
    assert result.skills == ["Go"]


def test_parse_returns_empty_on_no_json():
    result = parse_resume_analysis("Sorry, I cannot parse this.")
    assert result.skills == []
    assert result.experience == []
    assert result.summary == ""


def test_parse_returns_empty_on_invalid_json():
    result = parse_resume_analysis("{not valid json}")
    assert isinstance(result, ParsedResumeData)


def test_parse_handles_missing_fields():
    raw = '{"skills": ["Python"]}'
    result = parse_resume_analysis(raw)
    assert result.skills == ["Python"]
    assert result.experience == []
    assert result.summary == ""


def test_parsed_resume_data_defaults():
    data = ParsedResumeData()
    assert data.skills == []
    assert data.experience == []
    assert data.education == []
    assert data.summary == ""
```

- [ ] **Step 4: Run tests — expect failures**

```
cd backend && pytest tests/unit/test_parsers.py -v
```

Expected: `ModuleNotFoundError` for `app.ai.parsers`.

- [ ] **Step 5: Create `backend/app/ai/__init__.py`** (empty)

- [ ] **Step 6: Create `backend/app/ai/prompts/__init__.py`** (empty)

- [ ] **Step 7: Create `backend/app/ai/prompts/resume.py`**

```python
RESUME_ANALYSIS_PROMPT = """\
You are an expert resume analyst. Extract structured information from the resume text below.

Respond ONLY with a JSON object in exactly this format — no prose, no markdown fences:
{{
  "skills": ["skill1", "skill2"],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "duration": "2020 - 2023",
      "description": "Brief description of responsibilities"
    }}
  ],
  "education": [
    {{
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "2020"
    }}
  ],
  "summary": "2-3 sentence professional summary of the candidate"
}}

Resume text:
{resume_text}
"""
```

- [ ] **Step 8: Create `backend/app/ai/parsers.py`**

```python
from __future__ import annotations

import json
import re

from pydantic import BaseModel, ValidationError


class ParsedResumeData(BaseModel):
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    summary: str = ""


def parse_resume_analysis(raw: str) -> ParsedResumeData:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return ParsedResumeData()
    try:
        data = json.loads(match.group())
        return ParsedResumeData.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        return ParsedResumeData()
```

- [ ] **Step 9: Create `backend/app/ai/client.py`**

```python
from __future__ import annotations

from abc import ABC, abstractmethod


class AIClient(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        max_tokens: int,
    ) -> str:
        """Send messages and return the assistant's text response."""


class ClaudeClient(AIClient):
    def __init__(self, api_key: str) -> None:
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=api_key)

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        max_tokens: int,
    ) -> str:
        response = await self._client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,  # type: ignore[arg-type]
        )
        return response.content[0].text  # type: ignore[union-attr]
```

- [ ] **Step 10: Run tests — expect pass**

```
cd backend && pytest tests/unit/test_parsers.py -v
```

Expected: all 6 tests pass.

- [ ] **Step 11: Commit**

```
git add backend/app/config.py
git add backend/.env.example
git add backend/app/ai/__init__.py
git add backend/app/ai/client.py
git add backend/app/ai/prompts/__init__.py
git add backend/app/ai/prompts/resume.py
git add backend/app/ai/parsers.py
git add backend/tests/unit/test_parsers.py
git commit -m "feat: AI client abstraction, resume analysis prompt, and response parser"
```

---

### Task 4: Resume Schema and Repository

**Files:**
- Create: `backend/app/schemas/resume.py`
- Create: `backend/app/repositories/resume_repository.py`

**Interfaces:**
- Consumes:
  - `Resume` ORM class from `app/models/resume.py`
  - `BaseRepository` from `app/repositories/base.py`
  - `ParsedResumeData` from `app/ai/parsers.py`
- Produces:
  - `ResumeResponse` — list view: `id`, `filename`, `created_at`, `is_active`
  - `ResumeDetailResponse` — detail view: adds `parsed_data: ParsedResumeData | None`
  - `ResumeRepository` with methods:
    - `list_active_for_user(user_id: uuid.UUID) -> list[Resume]`
    - `update_parsed(resume: Resume, *, raw_text: str, parsed_data: dict) -> Resume`
    - `soft_delete(resume: Resume) -> None`

- [ ] **Step 1: Create `backend/app/schemas/resume.py`**

```python
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.ai.parsers import ParsedResumeData


class ResumeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    filename: str
    is_active: bool
    created_at: datetime


class ResumeDetailResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    filename: str
    is_active: bool
    created_at: datetime
    parsed_data: ParsedResumeData | None

    @field_validator("parsed_data", mode="before")
    @classmethod
    def coerce_parsed_data(cls, v: object) -> ParsedResumeData | None:
        if v is None:
            return None
        if isinstance(v, dict):
            return ParsedResumeData.model_validate(v)
        return v  # type: ignore[return-value]
```

- [ ] **Step 2: Create `backend/app/repositories/resume_repository.py`**

```python
from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.resume import Resume
from app.repositories.base import BaseRepository


class ResumeRepository(BaseRepository[Resume]):
    model = Resume

    async def list_active_for_user(self, user_id: uuid.UUID) -> list[Resume]:
        result = await self.session.execute(
            select(Resume)
            .where(Resume.user_id == user_id, Resume.is_active.is_(True))
            .order_by(Resume.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_parsed(
        self,
        resume: Resume,
        *,
        raw_text: str,
        parsed_data: dict,
    ) -> Resume:
        resume.raw_text = raw_text
        resume.parsed_data = parsed_data
        await self.session.flush()
        await self.session.refresh(resume)
        return resume

    async def soft_delete(self, resume: Resume) -> None:
        resume.is_active = False
        await self.session.flush()
```

- [ ] **Step 3: Commit**

```
git add backend/app/schemas/resume.py
git add backend/app/repositories/resume_repository.py
git commit -m "feat: resume schema and repository"
```

---

### Task 5: Resume Service (TDD)

**Files:**
- Create: `backend/app/services/resume_service.py`
- Create: `backend/tests/unit/test_resume_service.py`

**Interfaces:**
- Consumes:
  - `ResumeRepository` — `create`, `get_or_404`, `list_active_for_user`, `update_parsed`, `soft_delete`
  - `FileStorage` — `save`, `get_file_path`, `delete`
  - `AIClient` — `complete`
  - `extract_text` from `app/utils/pdf_parser`
  - `validate_pdf_file` from `app/utils/validators`
  - `parse_resume_analysis` from `app/ai/parsers`
  - `RESUME_ANALYSIS_PROMPT` from `app/ai/prompts/resume`
  - `ForbiddenError`, `UploadError` from `app/core/exceptions`
  - `settings.MAX_UPLOAD_SIZE_MB`, `settings.ANTHROPIC_API_KEY` (model name constant)
- Produces:
  - `ResumeService(session, file_storage, ai_client)`
    - `async upload(user_id, file) -> Resume`
    - `async analyze(resume) -> Resume`
    - `async list_for_user(user_id) -> list[Resume]`
    - `async get_by_id(resume_id, user_id) -> Resume`
    - `async delete(resume_id, user_id) -> None`

**Note on `analyze`:** The `analyze` method is designed to be called from a background task with its own session. It does NOT commit — the session passed to `ResumeService` in the background task context manages its own commit cycle via `get_db`-style transaction management.

- [ ] **Step 1: Write failing tests — `backend/tests/unit/test_resume_service.py`**

```python
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


# ── upload ─────────────────────────────────────────────────────────────────────

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


# ── analyze ────────────────────────────────────────────────────────────────────

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


# ── get_by_id ──────────────────────────────────────────────────────────────────

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


# ── delete ─────────────────────────────────────────────────────────────────────

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
```

- [ ] **Step 2: Run tests — expect failures**

```
cd backend && pytest tests/unit/test_resume_service.py -v
```

Expected: `ModuleNotFoundError` for `app.services.resume_service`.

- [ ] **Step 3: Create `backend/app/services/resume_service.py`**

```python
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.parsers import parse_resume_analysis
from app.ai.prompts.resume import RESUME_ANALYSIS_PROMPT
from app.config import settings
from app.core.exceptions import ForbiddenError
from app.repositories.resume_repository import ResumeRepository
from app.utils.pdf_parser import extract_text
from app.utils.validators import validate_pdf_file

if TYPE_CHECKING:
    from fastapi import UploadFile

    from app.ai.client import AIClient
    from app.models.resume import Resume
    from app.utils.file_handler import FileStorage

logger = logging.getLogger(__name__)

_RESUME_MODEL = "claude-haiku-4-5-20251001"
_RESUME_MAX_TOKENS = 2048


class ResumeService:
    def __init__(
        self,
        session: AsyncSession,
        file_storage: FileStorage,
        ai_client: AIClient,
    ) -> None:
        self.session = session
        self.repo = ResumeRepository(session)
        self.file_storage = file_storage
        self.ai_client = ai_client

    async def upload(self, user_id: uuid.UUID, file: UploadFile) -> Resume:
        validate_pdf_file(file, max_size_mb=settings.MAX_UPLOAD_SIZE_MB)
        content = await file.read()
        storage_path = await self.file_storage.save(content, suffix=".pdf")
        return await self.repo.create(
            user_id=user_id,
            filename=file.filename or "resume.pdf",
            storage_path=storage_path,
        )

    async def analyze(self, resume: Resume) -> Resume:
        file_path = str(self.file_storage.get_file_path(resume.storage_path))
        raw_text = await extract_text(file_path)
        prompt = RESUME_ANALYSIS_PROMPT.format(resume_text=raw_text)
        raw = await self.ai_client.complete(
            [{"role": "user", "content": prompt}],
            model=_RESUME_MODEL,
            max_tokens=_RESUME_MAX_TOKENS,
        )
        parsed = parse_resume_analysis(raw)
        return await self.repo.update_parsed(
            resume,
            raw_text=raw_text,
            parsed_data=parsed.model_dump(),
        )

    async def list_for_user(self, user_id: uuid.UUID) -> list[Resume]:
        return await self.repo.list_active_for_user(user_id)

    async def get_by_id(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
        resume = await self.repo.get_or_404(resume_id)
        if resume.user_id != user_id:
            raise ForbiddenError()
        return resume

    async def delete(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> None:
        resume = await self.get_by_id(resume_id, user_id)
        await self.repo.soft_delete(resume)
```

- [ ] **Step 4: Run tests — expect pass**

```
cd backend && pytest tests/unit/test_resume_service.py -v
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```
git add backend/app/services/resume_service.py
git add backend/tests/unit/test_resume_service.py
git commit -m "feat: ResumeService with upload, AI analysis, list, get, and delete"
```

---

### Task 6: AI Dependency, Resume Router, App Wiring, and Integration Tests

**Files:**
- Create: `backend/app/ai/dependencies.py`
- Create: `backend/app/api/v1/routers/resumes.py`
- Create: `backend/tests/integration/test_resumes.py`
- Modify: `backend/app/main.py` (add resumes router)

**Interfaces:**
- Consumes:
  - `ResumeService` — `upload`, `analyze`, `list_for_user`, `get_by_id`, `delete`
  - `ClaudeClient` from `app/ai/client.py`
  - `LocalFileStorage` from `app/utils/file_handler.py`
  - `CurrentUser`, `DB` from `app/dependencies.py`
  - `settings.ANTHROPIC_API_KEY`, `settings.UPLOAD_DIR`
  - `_AsyncSessionLocal` from `app/database/session.py` (background task only)
  - `ResumeResponse`, `ResumeDetailResponse` from `app/schemas/resume.py`
- Produces:
  - `get_ai_client() -> AIClient` FastAPI dependency (singleton via `lru_cache`)
  - `get_file_storage() -> FileStorage` FastAPI dependency (singleton via `lru_cache`)
  - Five routes on `/api/v1/resumes`:
    - `POST /` → 201 `ResumeResponse`
    - `GET /` → 200 `list[ResumeResponse]`
    - `GET /{resume_id}` → 200 `ResumeDetailResponse`
    - `POST /{resume_id}/analyze` → 200 `ResumeDetailResponse`
    - `DELETE /{resume_id}` → 204

**Note on background task session:** The background analysis function `_run_analysis` opens its own `AsyncSession` using `_AsyncSessionLocal` directly. This is intentional — the request session is closed before the background task runs.

- [ ] **Step 1: Create `backend/app/ai/dependencies.py`**

```python
from __future__ import annotations

from functools import lru_cache

from app.ai.client import AIClient, ClaudeClient
from app.config import settings
from app.utils.file_handler import FileStorage, LocalFileStorage


@lru_cache
def get_ai_client() -> AIClient:
    return ClaudeClient(api_key=settings.ANTHROPIC_API_KEY)


@lru_cache
def get_file_storage() -> FileStorage:
    return LocalFileStorage(upload_dir=settings.UPLOAD_DIR)
```

- [ ] **Step 2: Create `backend/app/api/v1/routers/resumes.py`**

```python
from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile

from app.ai.client import AIClient
from app.ai.dependencies import get_ai_client, get_file_storage
from app.database.session import _AsyncSessionLocal
from app.dependencies import DB, CurrentUser
from app.repositories.resume_repository import ResumeRepository
from app.schemas.resume import ResumeDetailResponse, ResumeResponse
from app.services.resume_service import ResumeService
from app.utils.file_handler import FileStorage

router = APIRouter(tags=["resumes"])
logger = logging.getLogger(__name__)


async def _run_analysis(
    resume_id: uuid.UUID,
    file_storage: FileStorage,
    ai_client: AIClient,
) -> None:
    async with _AsyncSessionLocal() as session:
        try:
            repo = ResumeRepository(session)
            resume = await repo.get(resume_id)
            if resume is None:
                return
            await ResumeService(session, file_storage, ai_client).analyze(resume)
            await session.commit()
        except Exception:
            logger.exception("Background resume analysis failed for %s", resume_id)


@router.post("", response_model=ResumeResponse, status_code=201)
async def upload_resume(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ResumeResponse:
    svc = ResumeService(session, file_storage, ai_client)
    resume = await svc.upload(current_user.id, file)
    background_tasks.add_task(_run_analysis, resume.id, file_storage, ai_client)
    return ResumeResponse.model_validate(resume)


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> list[ResumeResponse]:
    resumes = await ResumeService(session, file_storage, ai_client).list_for_user(current_user.id)
    return [ResumeResponse.model_validate(r) for r in resumes]


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ResumeDetailResponse:
    resume = await ResumeService(session, file_storage, ai_client).get_by_id(resume_id, current_user.id)
    return ResumeDetailResponse.model_validate(resume)


@router.post("/{resume_id}/analyze", response_model=ResumeDetailResponse)
async def reanalyze_resume(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> ResumeDetailResponse:
    svc = ResumeService(session, file_storage, ai_client)
    resume = await svc.get_by_id(resume_id, current_user.id)
    resume = await svc.analyze(resume)
    return ResumeDetailResponse.model_validate(resume)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    file_storage: Annotated[FileStorage, Depends(get_file_storage)],
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> None:
    await ResumeService(session, file_storage, ai_client).delete(resume_id, current_user.id)
```

- [ ] **Step 3: Update `backend/app/main.py`** — add the resumes router

```python
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import auth as auth_router
from app.api.v1.routers import health as health_router
from app.api.v1.routers import resumes as resumes_router
from app.config import settings
from app.database.redis import close_redis
from app.middleware.error_handler import register_exception_handlers
from app.middleware.logging import LoggingMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)

    register_exception_handlers(app)

    app.include_router(health_router.router, prefix=settings.API_PREFIX)
    app.include_router(auth_router.router, prefix=f"{settings.API_PREFIX}/auth")
    app.include_router(resumes_router.router, prefix=f"{settings.API_PREFIX}/resumes")

    return app


app = create_app()
```

- [ ] **Step 4: Create `backend/tests/integration/test_resumes.py`**

```python
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
    assert resp.status_code == 201
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
    assert len(resp.json()) == 1


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
    ids = [r["id"] for r in list_resp.json()]
    assert resume_id not in ids


@pytest.mark.asyncio
async def test_reanalyze_triggers_ai_and_returns_detail(client):
    token = await _register_and_login(client)
    with patch("app.utils.validators.magic") as mock_magic, \
         patch("app.api.v1.routers.resumes._run_analysis", new_callable=AsyncMock):
        mock_magic.from_buffer.return_value = "application/pdf"
        upload = await client.post("/api/v1/resumes", headers=_auth(token), files=_pdf_file())
    resume_id = upload.json()["id"]

    ai_response = '{"skills":["Python"],"experience":[],"education":[],"summary":"Dev."}'
    with patch("app.services.resume_service.extract_text", return_value="resume text"), \
         patch("app.services.resume_service.ResumeService.analyze.__wrapped__", create=True), \
         patch("app.ai.client.ClaudeClient.complete", new_callable=AsyncMock, return_value=ai_response):
        resp = await client.post(f"/api/v1/resumes/{resume_id}/analyze", headers=_auth(token))

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_upload_requires_auth(client):
    resp = await client.post("/api/v1/resumes", files=_pdf_file())
    assert resp.status_code == 403
```

- [ ] **Step 5: Commit**

```
git add backend/app/ai/dependencies.py
git add backend/app/api/v1/routers/resumes.py
git add backend/app/main.py
git add backend/tests/integration/test_resumes.py
git commit -m "feat: resume router with upload, list, get, analyze, and delete endpoints"
```

---

## Running the Full Test Suite

After all 6 tasks are complete:

```bash
cd backend

# Start dependencies
docker compose -f docker/docker-compose.yml up -d postgres redis

# Apply both migrations
alembic upgrade head

# Unit tests (no Docker needed)
pytest tests/unit/ -v

# Integration tests (require Docker)
pytest tests/integration/ -v

# Full suite
pytest tests/ -v
```

Expected:
- `tests/unit/` — all pass without Docker (AI calls mocked)
- `tests/integration/test_resumes.py` — all pass with Docker running
