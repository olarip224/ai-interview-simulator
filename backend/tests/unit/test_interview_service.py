import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.enums import Difficulty, InterviewType, SessionStatus
from app.core.exceptions import ConflictError, ForbiddenError
from app.services.interview_service import InterviewService

_USER_ID = uuid.uuid4()
_SESSION_ID = uuid.uuid4()
_QUESTION_ID = uuid.uuid4()


def _make_service():
    db_session = AsyncMock()
    ai_client = AsyncMock()
    svc = InterviewService(db_session, ai_client)
    svc.session_repo = AsyncMock()
    svc.question_repo = AsyncMock()
    svc.answer_repo = AsyncMock()
    svc.feedback_repo = AsyncMock()
    svc.analytics_repo = AsyncMock()
    svc.resume_repo = AsyncMock()
    return svc, ai_client


def _make_session(user_id=_USER_ID, status=SessionStatus.ACTIVE):
    s = MagicMock()
    s.id = _SESSION_ID
    s.user_id = user_id
    s.status = status
    s.interview_type = InterviewType.SWE
    s.difficulty = Difficulty.MID
    s.resume_id = None
    return s


@pytest.mark.asyncio
async def test_create_session_returns_session():
    svc, _ = _make_service()
    mock_session = _make_session()
    svc.session_repo.create = AsyncMock(return_value=mock_session)
    result = await svc.create_session(_USER_ID, InterviewType.SWE, Difficulty.MID, resume_id=None)
    svc.session_repo.create.assert_awaited_once()
    assert result is mock_session


@pytest.mark.asyncio
async def test_create_session_validates_resume_ownership():
    svc, _ = _make_service()
    resume_id = uuid.uuid4()
    svc.resume_repo.get_or_404 = AsyncMock(return_value=MagicMock(user_id=uuid.uuid4()))
    with pytest.raises(ForbiddenError):
        await svc.create_session(_USER_ID, InterviewType.SWE, Difficulty.MID, resume_id=resume_id)


@pytest.mark.asyncio
async def test_get_session_raises_forbidden_for_wrong_user():
    svc, _ = _make_service()
    svc.session_repo.get_or_404 = AsyncMock(return_value=_make_session(user_id=uuid.uuid4()))
    with pytest.raises(ForbiddenError):
        await svc.get_session(_SESSION_ID, _USER_ID)


@pytest.mark.asyncio
async def test_get_session_returns_for_owner():
    svc, _ = _make_service()
    mock_session = _make_session()
    svc.session_repo.get_or_404 = AsyncMock(return_value=mock_session)
    result = await svc.get_session(_SESSION_ID, _USER_ID)
    assert result is mock_session


@pytest.mark.asyncio
async def test_generate_question_calls_ai_and_saves():
    svc, ai_client = _make_service()
    svc.session_repo.get_or_404 = AsyncMock(return_value=_make_session())
    svc.question_repo.list_for_session = AsyncMock(return_value=[])
    svc.question_repo.get_next_sequence = AsyncMock(return_value=1)
    ai_client.complete = AsyncMock(
        return_value='{"question_text": "What is a deadlock?", "question_type": "technical", "difficulty_level": 3}'
    )
    mock_question = MagicMock()
    svc.question_repo.create = AsyncMock(return_value=mock_question)

    result = await svc.generate_question(_SESSION_ID, _USER_ID)
    ai_client.complete.assert_awaited_once()
    svc.question_repo.create.assert_awaited_once()
    assert result is mock_question


@pytest.mark.asyncio
async def test_submit_answer_raises_conflict_if_already_answered():
    svc, _ = _make_service()
    svc.session_repo.get_or_404 = AsyncMock(return_value=_make_session())
    svc.question_repo.get_or_404 = AsyncMock(
        return_value=MagicMock(id=_QUESTION_ID, session_id=_SESSION_ID, question_text="Q?")
    )
    svc.answer_repo.get_by_question = AsyncMock(return_value=MagicMock())
    with pytest.raises(ConflictError):
        await svc.submit_answer(_SESSION_ID, _QUESTION_ID, _USER_ID, "my answer", None)


@pytest.mark.asyncio
async def test_submit_answer_creates_answer_and_feedback():
    svc, ai_client = _make_service()
    svc.session_repo.get_or_404 = AsyncMock(return_value=_make_session())
    svc.question_repo.get_or_404 = AsyncMock(
        return_value=MagicMock(id=_QUESTION_ID, session_id=_SESSION_ID, question_text="What is GIL?")
    )
    svc.answer_repo.get_by_question = AsyncMock(return_value=None)
    mock_answer = MagicMock(id=uuid.uuid4())
    svc.answer_repo.create = AsyncMock(return_value=mock_answer)
    ai_client.complete = AsyncMock(
        return_value='{"overall_score":8.0,"feedback_text":"Good","strengths":[],"weaknesses":[],"suggestions":[]}'
    )
    mock_feedback = MagicMock()
    svc.feedback_repo.create = AsyncMock(return_value=mock_feedback)

    answer, feedback = await svc.submit_answer(_SESSION_ID, _QUESTION_ID, _USER_ID, "The GIL...", 120)
    assert answer is mock_answer
    assert feedback is mock_feedback


@pytest.mark.asyncio
async def test_complete_session_raises_conflict_if_already_completed():
    svc, _ = _make_service()
    svc.session_repo.get_or_404 = AsyncMock(
        return_value=_make_session(status=SessionStatus.COMPLETED)
    )
    with pytest.raises(ConflictError):
        await svc.complete_session(_SESSION_ID, _USER_ID)


@pytest.mark.asyncio
async def test_complete_session_sets_score_and_status():
    svc, _ = _make_service()
    mock_session = _make_session()
    svc.session_repo.get_or_404 = AsyncMock(return_value=mock_session)
    svc.feedback_repo.list_for_session = AsyncMock(
        return_value=[
            MagicMock(overall_score=8.0, weaknesses=["timing"],
                      technical_score=None, communication_score=None, correctness_score=None),
            MagicMock(overall_score=6.0, weaknesses=["depth"],
                      technical_score=None, communication_score=None, correctness_score=None),
        ]
    )
    svc.analytics_repo.create = AsyncMock()

    result = await svc.complete_session(_SESSION_ID, _USER_ID)
    assert mock_session.status == SessionStatus.COMPLETED
    assert mock_session.overall_score == pytest.approx(7.0)
    svc.analytics_repo.create.assert_awaited_once()
    assert result is mock_session
