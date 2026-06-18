from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.ai.parsers import ParsedResumeData


class ResumeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    filename: str
    is_active: bool
    created_at: datetime


class ResumeDetailResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    filename: str
    is_active: bool
    created_at: datetime
    parsed_data: ParsedResumeData | None

    @field_validator("parsed_data", mode="before")
    @classmethod
    def coerce_parsed_data(cls, v: object) -> ParsedResumeData | None:
        if v is None:
            return None
        if isinstance(v, dict):
            return ParsedResumeData.model_validate(v)
        return v  # type: ignore[return-value]
