from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.interview import Analytics, Answer, Feedback, InterviewSession, Question
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[InterviewSession]):
    model = InterviewSession

    async def list_for_user(
        self, user_id: uuid.UUID, *, status: str | None = None
    ) -> list[InterviewSession]:
        stmt = (
            select(InterviewSession)
            .where(InterviewSession.user_id == user_id)
            .order_by(InterviewSession.started_at.desc())
        )
        if status is not None:
            stmt = stmt.where(InterviewSession.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_questions(self, session_id: uuid.UUID) -> InterviewSession | None:
        result = await self.session.execute(
            select(InterviewSession)
            .where(InterviewSession.id == session_id)
            .options(selectinload(InterviewSession.questions))
        )
        return result.scalar_one_or_none()


class QuestionRepository(BaseRepository[Question]):
    model = Question

    async def list_for_session(self, session_id: uuid.UUID) -> list[Question]:
        result = await self.session.execute(
            select(Question)
            .where(Question.session_id == session_id)
            .order_by(Question.sequence_order)
        )
        return list(result.scalars().all())

    async def get_next_sequence(self, session_id: uuid.UUID) -> int:
        result = await self.session.execute(
            select(func.max(Question.sequence_order)).where(Question.session_id == session_id)
        )
        current_max = result.scalar_one_or_none()
        return (current_max or 0) + 1


class AnswerRepository(BaseRepository[Answer]):
    model = Answer

    async def get_by_question(self, question_id: uuid.UUID) -> Answer | None:
        result = await self.session.execute(
            select(Answer).where(Answer.question_id == question_id)
        )
        return result.scalar_one_or_none()


class FeedbackRepository(BaseRepository[Feedback]):
    model = Feedback

    async def list_for_session(self, session_id: uuid.UUID) -> list[Feedback]:
        result = await self.session.execute(
            select(Feedback).where(Feedback.session_id == session_id)
        )
        return list(result.scalars().all())


class AnalyticsRepository(BaseRepository[Analytics]):
    model = Analytics

    async def get_by_session(self, session_id: uuid.UUID) -> Analytics | None:
        result = await self.session.execute(
            select(Analytics).where(Analytics.session_id == session_id)
        )
        return result.scalar_one_or_none()
