from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, computed_field, field_validator

from app.ai.parsers import ParsedResumeData


class ResumeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    filename: str
    is_active: bool
    created_at: datetime
    parsed_data: Any = Field(default=None, exclude=True, repr=False)

    @computed_field  # type: ignore[misc]
    @property
    def is_analyzed(self) -> bool:
        return self.parsed_data is not None


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
