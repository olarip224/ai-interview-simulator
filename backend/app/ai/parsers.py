from __future__ import annotations

import json
import re

from pydantic import BaseModel, ValidationError


class ParsedResumeData(BaseModel):
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    summary: str = ""


def parse_resume_analysis(raw: str) -> ParsedResumeData:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return ParsedResumeData()
    try:
        data = json.loads(match.group())
        return ParsedResumeData.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        return ParsedResumeData()


class QuestionOutput(BaseModel):
    question_text: str = ""
    question_type: str = "technical"
    difficulty_level: int = 3


class FeedbackOutput(BaseModel):
    technical_score: float | None = None
    communication_score: float | None = None
    correctness_score: float | None = None
    overall_score: float = 5.0
    feedback_text: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

    def model_post_init(self, __context: object) -> None:
        if self.technical_score is not None:
            self.technical_score = max(0.0, min(10.0, self.technical_score))
        if self.communication_score is not None:
            self.communication_score = max(0.0, min(10.0, self.communication_score))
        if self.correctness_score is not None:
            self.correctness_score = max(0.0, min(10.0, self.correctness_score))
        self.overall_score = max(0.0, min(10.0, self.overall_score))


def parse_question_output(raw: str) -> QuestionOutput:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return QuestionOutput()
    try:
        data = json.loads(match.group())
        return QuestionOutput.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        return QuestionOutput()


def parse_feedback_output(raw: str) -> FeedbackOutput:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return FeedbackOutput()
    try:
        data = json.loads(match.group())
        return FeedbackOutput.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        return FeedbackOutput()


class CodeEvaluationOutput(BaseModel):
    correctness_score: float | None = None
    efficiency_score: float | None = None
    style_score: float | None = None
    overall_score: float = 5.0
    is_correct: bool = False
    feedback_text: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []

    def model_post_init(self, __context: object) -> None:
        def _clamp(v: float | None) -> float | None:
            return None if v is None else max(0.0, min(10.0, v))

        self.correctness_score = _clamp(self.correctness_score)
        self.efficiency_score = _clamp(self.efficiency_score)
        self.style_score = _clamp(self.style_score)
        self.overall_score = max(0.0, min(10.0, self.overall_score))


def parse_code_evaluation(raw: str) -> CodeEvaluationOutput:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return CodeEvaluationOutput()
    try:
        data = json.loads(match.group())
        return CodeEvaluationOutput.model_validate(data)
    except (json.JSONDecodeError, ValidationError):
        return CodeEvaluationOutput()
