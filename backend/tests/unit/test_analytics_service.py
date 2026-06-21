from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.analytics_service import AnalyticsService

_USER_ID = uuid.uuid4()


def _make_service():
    svc = AnalyticsService(AsyncMock())
    svc.analytics_repo = AsyncMock()
    return svc


def _row(interview_type: str = "swe", overall: float = 7.0, weak: list[str] | None = None):
    r = MagicMock()
    r.session_id = uuid.uuid4()
    r.interview_type = interview_type
    r.overall_score = overall
    r.avg_technical_score = None
    r.avg_communication_score = None
    r.avg_correctness_score = None
    r.weak_topics = weak or []
    r.session = MagicMock(completed_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    return r


@pytest.mark.asyncio
async def test_summary_empty_user():
    svc = _make_service()
    svc.analytics_repo.list_for_user = AsyncMock(return_value=[])
    result = await svc.get_summary(_USER_ID)
    assert result.total_sessions == 0
    assert result.avg_overall_score is None
    assert result.top_weak_topics == []
    assert result.by_interview_type == []


@pytest.mark.asyncio
async def test_summary_aggregates_scores():
    svc = _make_service()
    svc.analytics_repo.list_for_user = AsyncMock(return_value=[
        _row("swe", 8.0, ["timing"]),
        _row("swe", 6.0, ["depth", "timing"]),
        _row("ml", 9.0, []),
    ])
    result = await svc.get_summary(_USER_ID)
    assert result.total_sessions == 3
    assert result.avg_overall_score == pytest.approx(7.67, rel=0.01)
    assert result.top_weak_topics[0] == "timing"
    assert len(result.by_interview_type) == 2


@pytest.mark.asyncio
async def test_summary_by_type_avg():
    svc = _make_service()
    svc.analytics_repo.list_for_user = AsyncMock(return_value=[
        _row("swe", 8.0),
        _row("swe", 6.0),
    ])
    result = await svc.get_summary(_USER_ID)
    swe = next(t for t in result.by_interview_type if t.interview_type == "swe")
    assert swe.sessions == 2
    assert swe.avg_score == pytest.approx(7.0)


@pytest.mark.asyncio
async def test_progress_returns_items():
    svc = _make_service()
    rows = [_row("swe", 8.0), _row("ml", 6.0)]
    svc.analytics_repo.list_for_user_with_session = AsyncMock(return_value=rows)
    result = await svc.get_progress(_USER_ID)
    assert len(result) == 2
    assert result[0].overall_score == 8.0
    assert result[0].interview_type == "swe"
    assert result[0].completed_at is not None


@pytest.mark.asyncio
async def test_weak_topics_sorted_by_frequency():
    svc = _make_service()
    svc.analytics_repo.list_for_user = AsyncMock(return_value=[
        _row(weak=["a", "b", "a"]),
        _row(weak=["b", "c"]),
    ])
    result = await svc.get_weak_topics(_USER_ID)
    assert result[0].topic in ("a", "b")
    assert result[0].count >= result[1].count


@pytest.mark.asyncio
async def test_weak_topics_empty():
    svc = _make_service()
    svc.analytics_repo.list_for_user = AsyncMock(return_value=[])
    result = await svc.get_weak_topics(_USER_ID)
    assert result == []
