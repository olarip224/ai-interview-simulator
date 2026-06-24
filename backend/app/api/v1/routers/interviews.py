import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.ai.client import AIClient
from app.ai.dependencies import get_ai_client
from app.core.rate_limit import limiter
from app.dependencies import DB, CurrentUser
from app.schemas.interview import (
    AnswerFeedbackResponse,
    CompleteSessionResponse,
    CreateSessionRequest,
    FeedbackResponse,
    QuestionFeedbackItem,
    QuestionResponse,
    SessionDetailResponse,
    SessionFeedbackResponse,
    SessionResponse,
    SubmitAnswerRequest,
)
from app.services.interview_service import InterviewService

router = APIRouter(tags=["interviews"])


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    data: CreateSessionRequest,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> SessionResponse:
    svc = InterviewService(session, ai_client)
    s = await svc.create_session(current_user.id, data.interview_type, data.difficulty, data.resume_id)
    return SessionResponse.model_validate(s)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
    status: str | None = None,
) -> list[SessionResponse]:
    sessions = await InterviewService(session, ai_client).list_sessions(current_user.id, status=status)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> SessionDetailResponse:
    s = await InterviewService(session, ai_client).get_session_detail(session_id, current_user.id)
    return SessionDetailResponse.model_validate(s)


@router.post("/sessions/{session_id}/questions", response_model=QuestionResponse, status_code=201)
@limiter.limit("20/minute")
async def generate_question(
    request: Request,
    session_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> QuestionResponse:
    question = await InterviewService(session, ai_client).generate_question(session_id, current_user.id)
    return QuestionResponse.model_validate(question)


@router.post(
    "/sessions/{session_id}/questions/{question_id}/answers",
    response_model=AnswerFeedbackResponse,
)
@limiter.limit("20/minute")
async def submit_answer(
    request: Request,
    session_id: uuid.UUID,
    question_id: uuid.UUID,
    data: SubmitAnswerRequest,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> AnswerFeedbackResponse:
    answer, feedback = await InterviewService(session, ai_client).submit_answer(
        session_id, question_id, current_user.id, data.answer_text, data.time_taken_seconds
    )
    return AnswerFeedbackResponse(
        answer_id=answer.id,
        feedback=FeedbackResponse.model_validate(feedback),
    )


@router.post("/sessions/{session_id}/complete", response_model=CompleteSessionResponse)
async def complete_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> CompleteSessionResponse:
    svc = InterviewService(session, ai_client)
    s, questions_answered = await svc.complete_session(session_id, current_user.id)
    return CompleteSessionResponse(
        session_id=s.id,
        overall_score=s.overall_score or 0.0,
        questions_answered=questions_answered,
    )


@router.get("/sessions/{session_id}/feedback", response_model=SessionFeedbackResponse)
async def get_session_feedback(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    session: DB,
    ai_client: Annotated[AIClient, Depends(get_ai_client)],
) -> SessionFeedbackResponse:
    svc = InterviewService(session, ai_client)
    s, questions, answers, feedback_by_answer = await svc.get_session_feedback_detail(
        session_id, current_user.id
    )

    items: list[QuestionFeedbackItem] = []
    all_strengths: list[str] = []
    all_weaknesses: list[str] = []

    for q in questions:
        answer = answers.get(q.id)
        fb = None
        if answer is not None:
            fb_obj = feedback_by_answer.get(answer.id)
            if fb_obj is not None:
                fb = FeedbackResponse.model_validate(fb_obj)
                all_strengths.extend(fb_obj.strengths)
                all_weaknesses.extend(fb_obj.weaknesses)
        items.append(QuestionFeedbackItem(
            question=QuestionResponse.model_validate(q),
            answer_text=answer.answer_text if answer else None,
            feedback=fb,
        ))

    return SessionFeedbackResponse(
        session_id=s.id,
        overall_score=s.overall_score,
        per_question=items,
        strengths=list(dict.fromkeys(all_strengths)),
        weaknesses=list(dict.fromkeys(all_weaknesses)),
    )
