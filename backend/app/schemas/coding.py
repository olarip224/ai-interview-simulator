from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class CodingChallengeResponse(BaseModel):
    id: UUID
    title: str
    difficulty: str
    tags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class CodingChallengeDetailResponse(BaseModel):
    id: UUID
    title: str
    description: str
    difficulty: str
    tags: list[str]
    examples: list[dict]
    constraints: list[str]
    starter_code: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class SubmitCodeRequest(BaseModel):
    language: str
    code_text: str
    time_taken_seconds: int | None = None


class AttemptFeedbackResponse(BaseModel):
    overall_score: float | None
    correctness_score: float | None
    efficiency_score: float | None
    style_score: float | None
    is_correct: bool
    feedback_text: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]


class SubmitAttemptResponse(BaseModel):
    attempt_id: UUID
    feedback: AttemptFeedbackResponse


class CodingAttemptResponse(BaseModel):
    id: UUID
    challenge_id: UUID
    language: str
    overall_score: float | None
    is_correct: bool
    submitted_at: datetime

    model_config = {"from_attributes": True}


class CodingAttemptDetailResponse(BaseModel):
    id: UUID
    challenge_id: UUID
    language: str
    code_text: str
    overall_score: float | None
    correctness_score: float | None
    efficiency_score: float | None
    style_score: float | None
    is_correct: bool
    feedback_text: str | None
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    time_taken_seconds: int | None
    submitted_at: datetime

    model_config = {"from_attributes": True}
