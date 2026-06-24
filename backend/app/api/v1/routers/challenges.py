from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.ai.client import AIClient
from app.ai.dependencies import get_ai_client
from app.core.rate_limit import limiter
from app.dependencies import DB, CurrentUser
from app.schemas.coding import (
    AttemptFeedbackResponse,
    CodingAttemptDetailResponse,
    CodingAttemptResponse,
    CodingChallengeDetailResponse,
    CodingChallengeResponse,
    SubmitAttemptResponse,
    SubmitCodeRequest,
)
from app.services.coding_service import CodingChallengeService

router = APIRouter(tags=["challenges"])


# /me/... routes defined FIRST to prevent conflict with /{challenge_id} UUID parameter
@router.get("/me/attempts", response_model=list[CodingAttemptResponse])
async def list_my_attempts(
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
    challenge_id: UUID | None = Query(None),
) -> list[CodingAttemptResponse]:
    return await CodingChallengeService(session, ai_client).list_user_attempts(
        current_user.id, challenge_id=challenge_id
    )


@router.get("/me/attempts/{attempt_id}", response_model=CodingAttemptDetailResponse)
async def get_my_attempt(
    attempt_id: UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> CodingAttemptDetailResponse:
    return await CodingChallengeService(session, ai_client).get_attempt(
        attempt_id, current_user.id
    )


@router.get("", response_model=list[CodingChallengeResponse])
async def list_challenges(
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
    difficulty: str | None = Query(None),
    tag: str | None = Query(None),
) -> list[CodingChallengeResponse]:
    return await CodingChallengeService(session, ai_client).list_challenges(
        difficulty=difficulty, tag=tag
    )


@router.get("/{challenge_id}", response_model=CodingChallengeDetailResponse)
async def get_challenge(
    challenge_id: UUID,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> CodingChallengeDetailResponse:
    return await CodingChallengeService(session, ai_client).get_challenge(challenge_id)


@router.post("/{challenge_id}/attempts", status_code=201, response_model=SubmitAttemptResponse)
@limiter.limit("10/minute")
async def submit_attempt(
    request: Request,
    challenge_id: UUID,
    body: SubmitCodeRequest,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> SubmitAttemptResponse:
    attempt = await CodingChallengeService(session, ai_client).submit_attempt(
        challenge_id=challenge_id,
        user_id=current_user.id,
        language=body.language,
        code_text=body.code_text,
        time_taken_seconds=body.time_taken_seconds,
    )
    return SubmitAttemptResponse(
        attempt_id=attempt.id,
        feedback=AttemptFeedbackResponse(
            overall_score=attempt.overall_score,
            correctness_score=attempt.correctness_score,
            efficiency_score=attempt.efficiency_score,
            style_score=attempt.style_score,
            is_correct=attempt.is_correct,
            feedback_text=attempt.feedback_text or "",
            strengths=attempt.strengths,
            weaknesses=attempt.weaknesses,
            suggestions=attempt.suggestions,
        ),
    )
