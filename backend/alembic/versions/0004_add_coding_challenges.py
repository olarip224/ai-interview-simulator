"""add coding challenges tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "coding_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("difficulty", sa.String(10), nullable=False),
        sa.Column("tags", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("examples", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("constraints", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("starter_code", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("expected_approach", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_coding_challenges_difficulty", "coding_challenges", ["difficulty"])

    op.create_table(
        "coding_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("challenge_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language", sa.String(20), nullable=False),
        sa.Column("code_text", sa.Text, nullable=False),
        sa.Column("overall_score", sa.Float, nullable=True),
        sa.Column("correctness_score", sa.Float, nullable=True),
        sa.Column("efficiency_score", sa.Float, nullable=True),
        sa.Column("style_score", sa.Float, nullable=True),
        sa.Column("is_correct", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("feedback_text", sa.Text, nullable=True),
        sa.Column("strengths", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("weaknesses", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("suggestions", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("time_taken_seconds", sa.Integer, nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["challenge_id"], ["coding_challenges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_coding_attempts_user_id", "coding_attempts", ["user_id"])
    op.create_index("ix_coding_attempts_challenge_id", "coding_attempts", ["challenge_id"])
    op.create_index(
        "ix_coding_attempts_user_challenge",
        "coding_attempts", ["user_id", "challenge_id"]
    )


def downgrade() -> None:
    op.drop_table("coding_attempts")
    op.drop_table("coding_challenges")
