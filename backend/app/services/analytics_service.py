from __future__ import annotations

import uuid
from collections import Counter
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.interview_repository import AnalyticsRepository
from app.schemas.analytics import ProgressItem, TypeBreakdownItem, UserSummaryResponse, WeakTopicItem

if TYPE_CHECKING:
    from app.models.interview import Analytics


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.analytics_repo = AnalyticsRepository(session)

    async def get_summary(self, user_id: uuid.UUID) -> UserSummaryResponse:
        rows: list[Analytics] = await self.analytics_repo.list_for_user(user_id)
        if not rows:
            return UserSummaryResponse(
                total_sessions=0,
                avg_overall_score=None,
                avg_technical_score=None,
                avg_communication_score=None,
                avg_correctness_score=None,
                top_weak_topics=[],
                by_interview_type=[],
            )

        total = len(rows)
        avg_overall = sum(r.overall_score for r in rows) / total

        tech = [r.avg_technical_score for r in rows if r.avg_technical_score is not None]
        comm = [r.avg_communication_score for r in rows if r.avg_communication_score is not None]
        corr = [r.avg_correctness_score for r in rows if r.avg_correctness_score is not None]

        topic_counter: Counter[str] = Counter()
        for r in rows:
            topic_counter.update(r.weak_topics)
        top_weak = [t for t, _ in topic_counter.most_common(10)]

        by_type_map: dict[str, list[float]] = {}
        for r in rows:
            by_type_map.setdefault(r.interview_type, []).append(r.overall_score)
        by_type = [
            TypeBreakdownItem(
                interview_type=it,
                sessions=len(scores),
                avg_score=round(sum(scores) / len(scores), 2),
            )
            for it, scores in by_type_map.items()
        ]

        return UserSummaryResponse(
            total_sessions=total,
            avg_overall_score=round(avg_overall, 2),
            avg_technical_score=round(sum(tech) / len(tech), 2) if tech else None,
            avg_communication_score=round(sum(comm) / len(comm), 2) if comm else None,
            avg_correctness_score=round(sum(corr) / len(corr), 2) if corr else None,
            top_weak_topics=top_weak,
            by_interview_type=by_type,
        )

    async def get_progress(self, user_id: uuid.UUID) -> list[ProgressItem]:
        rows: list[Analytics] = await self.analytics_repo.list_for_user_with_session(user_id)
        return [
            ProgressItem(
                session_id=r.session_id,
                interview_type=r.interview_type,
                overall_score=r.overall_score,
                completed_at=r.session.completed_at,
            )
            for r in rows
            if r.session and r.session.completed_at is not None
        ]

    async def get_weak_topics(self, user_id: uuid.UUID) -> list[WeakTopicItem]:
        rows: list[Analytics] = await self.analytics_repo.list_for_user(user_id)
        counter: Counter[str] = Counter()
        for r in rows:
            counter.update(r.weak_topics)
        return [WeakTopicItem(topic=t, count=c) for t, c in counter.most_common()]
