from __future__ import annotations

from functools import lru_cache

from app.ai.client import AIClient, ClaudeClient
from app.config import settings
from app.utils.file_handler import FileStorage, LocalFileStorage


@lru_cache
def get_ai_client() -> AIClient:
    return ClaudeClient(api_key=settings.ANTHROPIC_API_KEY)


@lru_cache
def get_file_storage() -> FileStorage:
    return LocalFileStorage(upload_dir=settings.UPLOAD_DIR)
