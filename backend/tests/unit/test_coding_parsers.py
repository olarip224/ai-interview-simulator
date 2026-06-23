from __future__ import annotations

import pytest

from app.ai.parsers import CodeEvaluationOutput, parse_code_evaluation


def test_parse_code_evaluation_valid_json():
    raw = (
        '{"correctness_score": 9.0, "efficiency_score": 7.5, "style_score": 8.0, '
        '"overall_score": 8.5, "is_correct": true, "feedback_text": "Good job.", '
        '"strengths": ["Clean code"], "weaknesses": ["Missing edge case"], '
        '"suggestions": ["Handle empty input"]}'
    )
    result = parse_code_evaluation(raw)
    assert result.overall_score == 8.5
    assert result.correctness_score == 9.0
    assert result.is_correct is True
    assert result.strengths == ["Clean code"]
    assert result.suggestions == ["Handle empty input"]


def test_parse_code_evaluation_no_json_returns_defaults():
    result = parse_code_evaluation("Great effort but no JSON here")
    assert result.overall_score == 5.0
    assert result.is_correct is False
    assert result.strengths == []


def test_parse_code_evaluation_invalid_json_returns_defaults():
    result = parse_code_evaluation("{not valid json}")
    assert result.overall_score == 5.0


def test_parse_code_evaluation_clamps_score_above_10():
    raw = '{"overall_score": 15.0, "correctness_score": 12.0}'
    result = parse_code_evaluation(raw)
    assert result.overall_score == 10.0
    assert result.correctness_score == 10.0


def test_parse_code_evaluation_clamps_score_below_0():
    raw = '{"overall_score": -3.0, "efficiency_score": -1.0}'
    result = parse_code_evaluation(raw)
    assert result.overall_score == 0.0
    assert result.efficiency_score == 0.0


def test_parse_code_evaluation_none_scores_stay_none():
    raw = '{"overall_score": 7.0}'
    result = parse_code_evaluation(raw)
    assert result.correctness_score is None
    assert result.efficiency_score is None
    assert result.style_score is None


def test_code_evaluation_output_is_pydantic_model():
    obj = CodeEvaluationOutput(overall_score=6.0, is_correct=True)
    assert obj.overall_score == 6.0
    assert obj.feedback_text == ""
