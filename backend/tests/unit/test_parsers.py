import pytest
from app.ai.parsers import ParsedResumeData, parse_resume_analysis


def test_parse_well_formed_json():
    raw = """
    {
      "skills": ["Python", "FastAPI", "PostgreSQL"],
      "experience": [{"title": "SWE", "company": "Acme", "duration": "2020-2023", "description": "Built APIs"}],
      "education": [{"degree": "BSc CS", "institution": "MIT", "year": "2020"}],
      "summary": "Experienced backend engineer."
    }
    """
    result = parse_resume_analysis(raw)
    assert result.skills == ["Python", "FastAPI", "PostgreSQL"]
    assert result.experience[0]["title"] == "SWE"
    assert result.education[0]["degree"] == "BSc CS"
    assert "backend" in result.summary


def test_parse_json_embedded_in_prose():
    raw = """
    Sure, here is the analysis:
    {"skills": ["Go"], "experience": [], "education": [], "summary": "Go developer."}
    Hope that helps!
    """
    result = parse_resume_analysis(raw)
    assert result.skills == ["Go"]


def test_parse_returns_empty_on_no_json():
    result = parse_resume_analysis("Sorry, I cannot parse this.")
    assert result.skills == []
    assert result.experience == []
    assert result.summary == ""


def test_parse_returns_empty_on_invalid_json():
    result = parse_resume_analysis("{not valid json}")
    assert isinstance(result, ParsedResumeData)


def test_parse_handles_missing_fields():
    raw = '{"skills": ["Python"]}'
    result = parse_resume_analysis(raw)
    assert result.skills == ["Python"]
    assert result.experience == []
    assert result.summary == ""


def test_parsed_resume_data_defaults():
    data = ParsedResumeData()
    assert data.skills == []
    assert data.experience == []
    assert data.education == []
    assert data.summary == ""
