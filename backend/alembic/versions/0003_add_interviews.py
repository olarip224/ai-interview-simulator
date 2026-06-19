"""add interview engine tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-18
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "interview_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resume_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("interview_type", sa.String(20), nullable=False),
        sa.Column("difficulty", sa.String(10), nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="active"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("overall_score", sa.Float, nullable=True),
        sa.Column("session_metadata", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interview_sessions_user_id", "interview_sessions", ["user_id"])
    op.create_index("ix_interview_sessions_user_id_status", "interview_sessions", ["user_id", "status"])
    op.create_index("ix_interview_sessions_resume_id", "interview_sessions", ["resume_id"])

    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sequence_order", sa.SmallInteger, nullable=False),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("question_type", sa.String(15), nullable=False),
        sa.Column("difficulty_level", sa.SmallInteger, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_questions_session_id", "questions", ["session_id"])

    op.create_table(
        "answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("answer_text", sa.Text, nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("time_taken_seconds", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_id", name="uq_answers_question_id"),
    )
    op.create_index("ix_answers_question_id", "answers", ["question_id"])
    op.create_index("ix_answers_user_id", "answers", ["user_id"])

    op.create_table(
        "feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("answer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("technical_score", sa.Float, nullable=True),
        sa.Column("communication_score", sa.Float, nullable=True),
        sa.Column("correctness_score", sa.Float, nullable=True),
        sa.Column("overall_score", sa.Float, nullable=False),
        sa.Column("feedback_text", sa.Text, nullable=False),
        sa.Column("strengths", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("weaknesses", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("suggestions", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["answer_id"], ["answers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("answer_id", name="uq_feedback_answer_id"),
    )
    op.create_index("ix_feedback_answer_id", "feedback", ["answer_id"])
    op.create_index("ix_feedback_session_id", "feedback", ["session_id"])

    op.create_table(
        "analytics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("interview_type", sa.String(20), nullable=False),
        sa.Column("avg_technical_score", sa.Float, nullable=True),
        sa.Column("avg_communication_score", sa.Float, nullable=True),
        sa.Column("avg_correctness_score", sa.Float, nullable=True),
        sa.Column("overall_score", sa.Float, nullable=False),
        sa.Column("weak_topics", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", name="uq_analytics_session_id"),
    )
    op.create_index("ix_analytics_user_id", "analytics", ["user_id"])
    op.create_index("ix_analytics_user_id_interview_type", "analytics", ["user_id", "interview_type"])


def downgrade() -> None:
    op.drop_table("analytics")
    op.drop_table("feedback")
    op.drop_table("answers")
    op.drop_table("questions")
    op.drop_table("interview_sessions")
