from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.parsers import parse_feedback_output, parse_question_output
from app.ai.prompts.feedback import ANSWER_EVALUATION_PROMPT
from app.ai.prompts.interview import QUESTION_GENERATION_PROMPT
from app.core.enums import Difficulty, InterviewType, SessionStatus
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.repositories.interview_repository import (
    AnalyticsRepository,
    AnswerRepository,
    FeedbackRepository,
    QuestionRepository,
    SessionRepository,
)
from app.repositories.resume_repository import ResumeRepository

if TYPE_CHECKING:
    from app.ai.client import AIClient
    from app.models.interview import Answer, Feedback, InterviewSession, Question

_INTERVIEW_MODEL = "claude-haiku-4-5-20251001"
_QUESTION_MAX_TOKENS = 1024
_FEEDBACK_MAX_TOKENS = 2048


class InterviewService:
    def __init__(self, session: AsyncSession, ai_client: AIClient) -> None:
        self.session = session
        self.session_repo = SessionRepository(session)
        self.question_repo = QuestionRepository(session)
        self.answer_repo = AnswerRepository(session)
        self.feedback_repo = FeedbackRepository(session)
        self.analytics_repo = AnalyticsRepository(session)
        self.resume_repo = ResumeRepository(session)
        self.ai_client = ai_client

    async def create_session(
        self,
        user_id: uuid.UUID,
        interview_type: InterviewType,
        difficulty: Difficulty,
        resume_id: uuid.UUID | None = None,
    ) -> InterviewSession:
        if resume_id is not None:
            resume = await self.resume_repo.get_or_404(resume_id)
            if resume.user_id != user_id:
                raise ForbiddenError()
        return await self.session_repo.create(
            user_id=user_id,
            interview_type=interview_type,
            difficulty=difficulty,
            resume_id=resume_id,
            status=SessionStatus.ACTIVE,
        )

    async def list_sessions(
        self, user_id: uuid.UUID, status: str | None = None
    ) -> list[InterviewSession]:
        return await self.session_repo.list_for_user(user_id, status=status)

    async def get_session(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> InterviewSession:
        s = await self.session_repo.get_or_404(session_id)
        if s.user_id != user_id:
            raise ForbiddenError()
        return s

    async def get_session_detail(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> InterviewSession:
        s = await self.session_repo.get_with_questions(session_id)
        if s is None:
            raise NotFoundError("InterviewSession")
        if s.user_id != user_id:
            raise ForbiddenError()
        return s

    async def generate_question(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> Question:
        s = await self.get_session(session_id, user_id)
        if s.status != SessionStatus.ACTIVE:
            raise ConflictError("Session is not active")
        prior = await self.question_repo.list_for_session(session_id)
        next_seq = await self.question_repo.get_next_sequence(session_id)

        prior_text = (
            "\n".join(f"{i+1}. {q.question_text}" for i, q in enumerate(prior))
            or "None yet."
        )
        resume_context = ""
        if s.resume_id is not None:
            resume = await self.resume_repo.get(s.resume_id)
            if resume and resume.parsed_data:
                skills = resume.parsed_data.get("skills", [])
                if skills:
                    resume_context = f"Candidate skills from resume: {', '.join(skills[:10])}."

        prompt = QUESTION_GENERATION_PROMPT.format(
            interview_type=s.interview_type,
            difficulty=s.difficulty,
            question_number=next_seq,
            prior_questions_text=prior_text,
            resume_context=resume_context,
        )
        raw = await self.ai_client.complete(
            [{"role": "user", "content": prompt}],
            model=_INTERVIEW_MODEL,
            max_tokens=_QUESTION_MAX_TOKENS,
        )
        parsed = parse_question_output(raw)
        return await self.question_repo.create(
            session_id=session_id,
            sequence_order=next_seq,
            question_text=parsed.question_text,
            question_type=parsed.question_type,
            difficulty_level=parsed.difficulty_level,
        )

    async def submit_answer(
        self,
        session_id: uuid.UUID,
        question_id: uuid.UUID,
        user_id: uuid.UUID,
        answer_text: str,
        time_taken_seconds: int | None,
    ) -> tuple[Answer, Feedback]:
        s = await self.get_session(session_id, user_id)
        if s.status != SessionStatus.ACTIVE:
            raise ConflictError("Session is not active")
        question = await self.question_repo.get_or_404(question_id)
        if question.session_id != session_id:
            raise ForbiddenError()
        if await self.answer_repo.get_by_question(question_id) is not None:
            raise ConflictError("Question already answered")

        answer = await self.answer_repo.create(
            question_id=question_id,
            user_id=user_id,
            answer_text=answer_text,
            time_taken_seconds=time_taken_seconds,
        )
        prompt = ANSWER_EVALUATION_PROMPT.format(
            question_text=question.question_text,
            answer_text=answer_text,
            interview_type=s.interview_type,
            difficulty=s.difficulty,
        )
        raw = await self.ai_client.complete(
            [{"role": "user", "content": prompt}],
            model=_INTERVIEW_MODEL,
            max_tokens=_FEEDBACK_MAX_TOKENS,
        )
        fb = parse_feedback_output(raw)
        feedback = await self.feedback_repo.create(
            answer_id=answer.id,
            session_id=session_id,
            technical_score=fb.technical_score,
            communication_score=fb.communication_score,
            correctness_score=fb.correctness_score,
            overall_score=fb.overall_score,
            feedback_text=fb.feedback_text,
            strengths=fb.strengths,
            weaknesses=fb.weaknesses,
            suggestions=fb.suggestions,
        )
        return answer, feedback

    async def complete_session(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[InterviewSession, int]:
        s = await self.get_session(session_id, user_id)
        if s.status != SessionStatus.ACTIVE:
            raise ConflictError("Session already completed")

        feedbacks = await self.feedback_repo.list_for_session(session_id)
        if feedbacks:
            overall = sum(f.overall_score for f in feedbacks) / len(feedbacks)
            avg_tech = (
                sum(f.technical_score for f in feedbacks if f.technical_score is not None)
                / sum(1 for f in feedbacks if f.technical_score is not None)
                if any(f.technical_score is not None for f in feedbacks)
                else None
            )
            avg_comm = (
                sum(f.communication_score for f in feedbacks if f.communication_score is not None)
                / sum(1 for f in feedbacks if f.communication_score is not None)
                if any(f.communication_score is not None for f in feedbacks)
                else None
            )
            avg_corr = (
                sum(f.correctness_score for f in feedbacks if f.correctness_score is not None)
                / sum(1 for f in feedbacks if f.correctness_score is not None)
                if any(f.correctness_score is not None for f in feedbacks)
                else None
            )
            weak_topics: list[str] = []
            for f in feedbacks:
                weak_topics.extend(f.weaknesses)
        else:
            overall = avg_tech = avg_comm = avg_corr = None
            weak_topics = []

        s.overall_score = round(overall, 2) if overall is not None else 0.0
        s.status = SessionStatus.COMPLETED
        s.completed_at = datetime.now(timezone.utc)
        await self.session.flush()

        await self.analytics_repo.create(
            user_id=s.user_id,
            session_id=session_id,
            interview_type=s.interview_type,
            avg_technical_score=avg_tech,
            avg_communication_score=avg_comm,
            avg_correctness_score=avg_corr,
            overall_score=s.overall_score,
            weak_topics=weak_topics,
        )
        questions_answered = len(feedbacks)
        return s, questions_answered

    async def get_session_feedback(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[InterviewSession, list[Question]]:
        s = await self.get_session(session_id, user_id)
        questions = await self.question_repo.list_for_session(session_id)
        return s, questions

    async def get_session_feedback_detail(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> tuple[InterviewSession, list[Question], dict, dict]:
        s = await self.get_session(session_id, user_id)
        questions = await self.question_repo.list_for_session(session_id)
        feedbacks = await self.feedback_repo.list_for_session(session_id)
        feedback_by_answer: dict = {f.answer_id: f for f in feedbacks}
        answers: dict = {}
        for q in questions:
            answer = await self.answer_repo.get_by_question(q.id)
            if answer is not None:
                answers[q.id] = answer
        return s, questions, answers, feedback_by_answer
