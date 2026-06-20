from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class TypeBreakdownItem(BaseModel):
    interview_type: str
    sessions: int
    avg_score: float


class UserSummaryResponse(BaseModel):
    total_sessions: int
    avg_overall_score: float | None
    avg_technical_score: float | None
    avg_communication_score: float | None
    avg_correctness_score: float | None
    top_weak_topics: list[str]
    by_interview_type: list[TypeBreakdownItem]


class ProgressItem(BaseModel):
    session_id: uuid.UUID
    interview_type: str
    overall_score: float
    completed_at: datetime


class WeakTopicItem(BaseModel):
    topic: str
    count: int
