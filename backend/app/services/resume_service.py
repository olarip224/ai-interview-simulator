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
