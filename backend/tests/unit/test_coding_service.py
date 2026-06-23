from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import ForbiddenError, NotFoundError
from app.services.coding_service import CodingChallengeService


@pytest.mark.asyncio
async def test_list_challenges_delegates_to_repo():
    mock_challenges = [MagicMock(), MagicMock()]
    mock_cr = MagicMock()
    mock_cr.list_active = AsyncMock(return_value=mock_challenges)
    mock_ar = MagicMock()

    with patch("app.services.coding_service.CodingChallengeRepository", return_value=mock_cr), \
         patch("app.services.coding_service.CodingAttemptRepository", return_value=mock_ar):
        svc = CodingChallengeService(MagicMock(), MagicMock())
        result = await svc.list_challenges(difficulty="easy", tag="arrays")

    assert result == mock_challenges
    mock_cr.list_active.assert_awaited_once_with(difficulty="easy", tag="arrays")


@pytest.mark.asyncio
async def test_get_challenge_not_found_raises():
    mock_cr = MagicMock()
    mock_cr.get = AsyncMock(return_value=None)
    mock_ar = MagicMock()

    with patch("app.services.coding_service.CodingChallengeRepository", return_value=mock_cr), \
         patch("app.services.coding_service.CodingAttemptRepository", return_value=mock_ar):
        svc = CodingChallengeService(MagicMock(), MagicMock())
        with pytest.raises(NotFoundError):
            await svc.get_challenge(uuid4())


@pytest.mark.asyncio
async def test_get_challenge_inactive_raises():
    challenge = MagicMock()
    challenge.is_active = False
    mock_cr = MagicMock()
    mock_cr.get = AsyncMock(return_value=challenge)
    mock_ar = MagicMock()

    with patch("app.services.coding_service.CodingChallengeRepository", return_value=mock_cr), \
         patch("app.services.coding_service.CodingAttemptRepository", return_value=mock_ar):
        svc = CodingChallengeService(MagicMock(), MagicMock())
        with pytest.raises(NotFoundError):
            await svc.get_challenge(uuid4())


@pytest.mark.asyncio
async def test_submit_attempt_calls_ai_and_stores():
    challenge = MagicMock()
    challenge.is_active = True
    challenge.title = "Two Sum"
    challenge.description = "Find two indices that add up to target."
    challenge.examples = [{"input": "[2,7], 9", "output": "[0,1]"}]
    challenge.constraints = ["2 <= nums.length"]
    challenge.expected_approach = "Hash map"
    challenge.id = uuid4()

    mock_attempt = MagicMock()
    mock_cr = MagicMock()
    mock_cr.get = AsyncMock(return_value=challenge)
    mock_ar = MagicMock()
    mock_ar.create = AsyncMock(return_value=mock_attempt)

    mock_ai = MagicMock()
    mock_ai.complete = AsyncMock(
        return_value='{"overall_score": 8.0, "is_correct": true, "feedback_text": "Good.", '
                     '"strengths": [], "weaknesses": [], "suggestions": []}'
    )

    with patch("app.services.coding_service.CodingChallengeRepository", return_value=mock_cr), \
         patch("app.services.coding_service.CodingAttemptRepository", return_value=mock_ar):
        svc = CodingChallengeService(MagicMock(), mock_ai)
        result = await svc.submit_attempt(
            challenge_id=challenge.id,
            user_id=uuid4(),
            language="python",
            code_text="def two_sum(nums, target): pass",
            time_taken_seconds=60,
        )

    assert result == mock_attempt
    mock_ai.complete.assert_awaited_once()
    mock_ar.create.assert_awaited_once()
    call_kwargs = mock_ar.create.call_args.kwargs
    assert call_kwargs["language"] == "python"
    assert call_kwargs["overall_score"] == 8.0
    assert call_kwargs["is_correct"] is True


@pytest.mark.asyncio
async def test_list_user_attempts_filters_by_challenge():
    mock_attempts = [MagicMock()]
    challenge_id = uuid4()
    user_id = uuid4()
    mock_cr = MagicMock()
    mock_ar = MagicMock()
    mock_ar.list_for_user = AsyncMock(return_value=mock_attempts)

    with patch("app.services.coding_service.CodingChallengeRepository", return_value=mock_cr), \
         patch("app.services.coding_service.CodingAttemptRepository", return_value=mock_ar):
        svc = CodingChallengeService(MagicMock(), MagicMock())
        result = await svc.list_user_attempts(user_id, challenge_id=challenge_id)

    assert result == mock_attempts
    mock_ar.list_for_user.assert_awaited_once_with(user_id, challenge_id=challenge_id)


@pytest.mark.asyncio
async def test_get_attempt_raises_forbidden_for_wrong_user():
    attempt = MagicMock()
    attempt.user_id = uuid4()

    mock_cr = MagicMock()
    mock_ar = MagicMock()
    mock_ar.get_or_404 = AsyncMock(return_value=attempt)

    with patch("app.services.coding_service.CodingChallengeRepository", return_value=mock_cr), \
         patch("app.services.coding_service.CodingAttemptRepository", return_value=mock_ar):
        svc = CodingChallengeService(MagicMock(), MagicMock())
        with pytest.raises(ForbiddenError):
            await svc.get_attempt(uuid4(), uuid4())
