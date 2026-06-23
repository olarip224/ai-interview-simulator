from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class CodingChallenge(Base, UUIDMixin):
    __tablename__ = "coding_challenges"

    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    examples: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    constraints: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    starter_code: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    expected_approach: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    attempts: Mapped[list[CodingAttempt]] = relationship(
        "CodingAttempt", back_populates="challenge", cascade="all, delete-orphan"
    )


class CodingAttempt(Base, UUIDMixin):
    __tablename__ = "coding_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    challenge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coding_challenges.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    code_text: Mapped[str] = mapped_column(Text, nullable=False)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    correctness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    efficiency_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    style_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    feedback_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    strengths: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    weaknesses: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    suggestions: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    challenge: Mapped[CodingChallenge] = relationship("CodingChallenge", back_populates="attempts")
