from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.coding import CodingAttempt, CodingChallenge
from app.repositories.base import BaseRepository


class CodingChallengeRepository(BaseRepository[CodingChallenge]):
    model = CodingChallenge

    async def list_active(
        self, *, difficulty: str | None = None, tag: str | None = None
    ) -> list[CodingChallenge]:
        stmt = select(CodingChallenge).where(CodingChallenge.is_active.is_(True))
        if difficulty:
            stmt = stmt.where(CodingChallenge.difficulty == difficulty)
        if tag:
            stmt = stmt.where(CodingChallenge.tags.contains([tag]))
        stmt = stmt.order_by(CodingChallenge.created_at.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class CodingAttemptRepository(BaseRepository[CodingAttempt]):
    model = CodingAttempt

    async def list_for_user(
        self, user_id: uuid.UUID, *, challenge_id: uuid.UUID | None = None
    ) -> list[CodingAttempt]:
        stmt = select(CodingAttempt).where(CodingAttempt.user_id == user_id)
        if challenge_id:
            stmt = stmt.where(CodingAttempt.challenge_id == challenge_id)
        stmt = stmt.order_by(CodingAttempt.submitted_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
