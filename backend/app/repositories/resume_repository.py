from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.models.resume import Resume
from app.repositories.base import BaseRepository


class ResumeRepository(BaseRepository[Resume]):
    model = Resume

    async def list_active_for_user(
        self,
        user_id: uuid.UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Resume], int]:
        base_stmt = (
            select(Resume)
            .where(Resume.user_id == user_id, Resume.is_active.is_(True))
        )

        total: int = (await self.session.execute(
            select(func.count()).select_from(base_stmt.subquery())
        )).scalar_one()

        paginated = base_stmt.order_by(Resume.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(paginated)
        return list(result.scalars().all()), total

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
