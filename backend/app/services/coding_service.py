from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import AIClient
from app.ai.parsers import parse_code_evaluation
from app.ai.prompts.coding import CODE_EVALUATION_PROMPT
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.coding import CodingAttempt, CodingChallenge
from app.repositories.coding_repository import (
    CodingAttemptRepository,
    CodingChallengeRepository,
)


class CodingChallengeService:
    def __init__(self, session: AsyncSession, ai_client: AIClient) -> None:
        self._challenges = CodingChallengeRepository(session)
        self._attempts = CodingAttemptRepository(session)
        self._ai = ai_client

    async def list_challenges(
        self, *, difficulty: str | None = None, tag: str | None = None
    ) -> list[CodingChallenge]:
        return await self._challenges.list_active(difficulty=difficulty, tag=tag)

    async def get_challenge(self, challenge_id: uuid.UUID) -> CodingChallenge:
        challenge = await self._challenges.get(challenge_id)
        if challenge is None or not challenge.is_active:
            raise NotFoundError("CodingChallenge")
        return challenge

    async def submit_attempt(
        self,
        challenge_id: uuid.UUID,
        user_id: uuid.UUID,
        language: str,
        code_text: str,
        time_taken_seconds: int | None,
    ) -> CodingAttempt:
        challenge = await self.get_challenge(challenge_id)

        examples_text = "\n".join(
            f"Input: {ex.get('input', '')}\nOutput: {ex.get('output', '')}"
            + (f"\nExplanation: {ex['explanation']}" if ex.get("explanation") else "")
            for ex in challenge.examples
        ) or "No examples provided."

        constraints_text = (
            "\n".join(f"- {c}" for c in challenge.constraints)
            or "No constraints listed."
        )

        prompt = CODE_EVALUATION_PROMPT.format(
            challenge_title=challenge.title,
            challenge_description=challenge.description,
            examples_text=examples_text,
            constraints_text=constraints_text,
            expected_approach=challenge.expected_approach or "Not specified.",
            language=language,
            code_text=code_text,
        )

        raw = await self._ai.complete(
            [{"role": "user", "content": prompt}],
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
        )
        result = parse_code_evaluation(raw)

        return await self._attempts.create(
            user_id=user_id,
            challenge_id=challenge.id,
            language=language,
            code_text=code_text,
            overall_score=result.overall_score,
            correctness_score=result.correctness_score,
            efficiency_score=result.efficiency_score,
            style_score=result.style_score,
            is_correct=result.is_correct,
            feedback_text=result.feedback_text,
            strengths=result.strengths,
            weaknesses=result.weaknesses,
            suggestions=result.suggestions,
            time_taken_seconds=time_taken_seconds,
        )

    async def list_user_attempts(
        self, user_id: uuid.UUID, *, challenge_id: uuid.UUID | None = None
    ) -> list[CodingAttempt]:
        return await self._attempts.list_for_user(user_id, challenge_id=challenge_id)

    async def get_attempt(
        self, attempt_id: uuid.UUID, user_id: uuid.UUID
    ) -> CodingAttempt:
        attempt = await self._attempts.get_or_404(attempt_id)
        if attempt.user_id != user_id:
            raise ForbiddenError()
        return attempt
