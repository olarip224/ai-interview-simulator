from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.core.enums import Difficulty, InterviewType, SessionStatus


class CreateSessionRequest(BaseModel):
    interview_type: InterviewType
    difficulty: Difficulty
    resume_id: uuid.UUID | None = None


class QuestionResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    sequence_order: int
    question_text: str
    question_type: str
    created_at: datetime


class SessionResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    interview_type: InterviewType
    difficulty: Difficulty
    status: SessionStatus
    started_at: datetime
    completed_at: datetime | None
    overall_score: float | None


class SessionDetailResponse(SessionResponse):
    questions: list[QuestionResponse] = []


class SubmitAnswerRequest(BaseModel):
    answer_text: str
    time_taken_seconds: int | None = None


class FeedbackResponse(BaseModel):
    model_config = {"from_attributes": True}
    overall_score: float
    feedback_text: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    technical_score: float | None
    communication_score: float | None
    correctness_score: float | None


class AnswerFeedbackResponse(BaseModel):
    answer_id: uuid.UUID
    feedback: FeedbackResponse


class CompleteSessionResponse(BaseModel):
    session_id: uuid.UUID
    overall_score: float
    questions_answered: int


class QuestionFeedbackItem(BaseModel):
    question: QuestionResponse
    answer_text: str | None
    feedback: FeedbackResponse | None


class SessionFeedbackResponse(BaseModel):
    session_id: uuid.UUID
    overall_score: float | None
    per_question: list[QuestionFeedbackItem]
    strengths: list[str]
    weaknesses: list[str]
