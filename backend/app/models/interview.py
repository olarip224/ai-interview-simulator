from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import Difficulty, InterviewType, SessionStatus
from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.resume import Resume
    from app.models.user import User


class InterviewSession(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "interview_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    resume_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    interview_type: Mapped[InterviewType] = mapped_column(String(20), nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(String(10), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        String(10), nullable=False, default=SessionStatus.ACTIVE
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("session_metadata", JSONB, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="interview_sessions")
    resume: Mapped[Resume | None] = relationship("Resume")
    questions: Mapped[list[Question]] = relationship(
        "Question", back_populates="session", cascade="all, delete-orphan",
        order_by="Question.sequence_order",
    )
    feedback_items: Mapped[list[Feedback]] = relationship(
        "Feedback", back_populates="session", cascade="all, delete-orphan"
    )
    analytics: Mapped[Analytics | None] = relationship(
        "Analytics", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class Question(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "questions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    sequence_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(15), nullable=False)
    difficulty_level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    session: Mapped[InterviewSession] = relationship("InterviewSession", back_populates="questions")
    answer: Mapped[Answer | None] = relationship(
        "Answer", back_populates="question", uselist=False, cascade="all, delete-orphan"
    )


class Answer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "answers"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True,
    )
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    question: Mapped[Question] = relationship("Question", back_populates="answer")
    feedback: Mapped[Feedback | None] = relationship(
        "Feedback", back_populates="answer", uselist=False, cascade="all, delete-orphan"
    )


class Feedback(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "feedback"

    answer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("answers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    technical_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    communication_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    correctness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    weaknesses: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    suggestions: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)

    answer: Mapped[Answer] = relationship("Answer", back_populates="feedback")
    session: Mapped[InterviewSession] = relationship("InterviewSession", back_populates="feedback_items")


class Analytics(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "analytics"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    interview_type: Mapped[str] = mapped_column(String(20), nullable=False)
    avg_technical_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_communication_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_correctness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    weak_topics: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)

    session: Mapped[InterviewSession] = relationship("InterviewSession", back_populates="analytics")
