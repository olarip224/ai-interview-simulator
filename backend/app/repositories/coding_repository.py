from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.models.coding import CodingAttempt, CodingChallenge
from app.repositories.base import BaseRepository


class CodingChallengeRepository(BaseRepository[CodingChallenge]):
    model = CodingChallenge

    async def list_active(
        self,
        *,
        difficulty: str | None = None,
        tag: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CodingChallenge], int]:
        base_stmt = select(CodingChallenge).where(CodingChallenge.is_active.is_(True))
        if difficulty:
            base_stmt = base_stmt.where(CodingChallenge.difficulty == difficulty)
        if tag:
            base_stmt = base_stmt.where(CodingChallenge.tags.contains([tag]))

        total: int = (await self.session.execute(
            select(func.count()).select_from(base_stmt.subquery())
        )).scalar_one()

        paginated = base_stmt.order_by(CodingChallenge.created_at.asc()).limit(limit).offset(offset)
        result = await self.session.execute(paginated)
        return list(result.scalars().all()), total


class CodingAttemptRepository(BaseRepository[CodingAttempt]):
    model = CodingAttempt

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        challenge_id: uuid.UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CodingAttempt], int]:
        base_stmt = select(CodingAttempt).where(CodingAttempt.user_id == user_id)
        if challenge_id:
            base_stmt = base_stmt.where(CodingAttempt.challenge_id == challenge_id)

        total: int = (await self.session.execute(
            select(func.count()).select_from(base_stmt.subquery())
        )).scalar_one()

        paginated = base_stmt.order_by(CodingAttempt.submitted_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(paginated)
        return list(result.scalars().all()), total
