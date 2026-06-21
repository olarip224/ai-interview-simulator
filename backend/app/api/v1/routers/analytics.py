from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import DB, CurrentUser
from app.schemas.analytics import ProgressItem, UserSummaryResponse, WeakTopicItem
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=["analytics"])


@router.get("/me/summary", response_model=UserSummaryResponse)
async def get_summary(current_user: CurrentUser, session: DB) -> UserSummaryResponse:
    return await AnalyticsService(session).get_summary(current_user.id)


@router.get("/me/progress", response_model=list[ProgressItem])
async def get_progress(current_user: CurrentUser, session: DB) -> list[ProgressItem]:
    return await AnalyticsService(session).get_progress(current_user.id)


@router.get("/me/weak-topics", response_model=list[WeakTopicItem])
async def get_weak_topics(current_user: CurrentUser, session: DB) -> list[WeakTopicItem]:
    return await AnalyticsService(session).get_weak_topics(current_user.id)
