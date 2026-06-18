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
