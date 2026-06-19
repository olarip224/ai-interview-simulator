import pytest
from app.ai.parsers import FeedbackOutput, QuestionOutput, parse_feedback_output, parse_question_output


def test_parse_question_valid_json():
    raw = '{"question_text": "Explain async/await", "question_type": "technical", "difficulty_level": 3}'
    result = parse_question_output(raw)
    assert result.question_text == "Explain async/await"
    assert result.question_type == "technical"
    assert result.difficulty_level == 3


def test_parse_question_json_in_prose():
    raw = 'Here is a question: {"question_text": "Describe a time...", "question_type": "behavioral", "difficulty_level": 2}'
    result = parse_question_output(raw)
    assert result.question_text == "Describe a time..."
    assert result.question_type == "behavioral"


def test_parse_question_fallback_on_invalid():
    result = parse_question_output("Sorry, I cannot generate a question.")
    assert result.question_text == ""
    assert result.question_type == "technical"
    assert result.difficulty_level == 3


def test_parse_feedback_valid_json():
    raw = """{
        "technical_score": 7.5, "communication_score": 8.0, "correctness_score": 7.0,
        "overall_score": 7.5, "feedback_text": "Good answer.",
        "strengths": ["Clear"], "weaknesses": ["Missing edge cases"], "suggestions": ["Add complexity analysis"]
    }"""
    result = parse_feedback_output(raw)
    assert result.overall_score == 7.5
    assert result.strengths == ["Clear"]
    assert result.weaknesses == ["Missing edge cases"]


def test_parse_feedback_fallback_on_invalid():
    result = parse_feedback_output("Unable to evaluate.")
    assert result.overall_score == 5.0
    assert result.feedback_text == ""
    assert result.strengths == []


def test_parse_feedback_clamps_scores():
    raw = '{"overall_score": 15.0, "feedback_text": "great", "strengths": [], "weaknesses": [], "suggestions": []}'
    result = parse_feedback_output(raw)
    assert result.overall_score <= 10.0
