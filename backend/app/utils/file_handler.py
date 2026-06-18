from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from pathlib import Path


class FileStorage(ABC):
    @abstractmethod
    async def save(self, content: bytes, *, suffix: str) -> str:
        """Persist content and return the storage path (relative key)."""

    @abstractmethod
    def get_file_path(self, storage_path: str) -> Path:
        """Resolve a storage path to a filesystem Path."""

    @abstractmethod
    def delete(self, storage_path: str) -> None:
        """Remove the file. Silent if it doesn't exist."""


class LocalFileStorage(FileStorage):
    def __init__(self, upload_dir: str) -> None:
        self._root = Path(upload_dir)
        self._root.mkdir(parents=True, exist_ok=True)

    async def save(self, content: bytes, *, suffix: str) -> str:
        filename = f"{uuid.uuid4()}{suffix}"
        (self._root / filename).write_bytes(content)
        return filename

    def get_file_path(self, storage_path: str) -> Path:
        return self._root / storage_path

    def delete(self, storage_path: str) -> None:
        path = self._root / storage_path
        path.unlink(missing_ok=True)
