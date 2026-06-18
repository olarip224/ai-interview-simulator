from __future__ import annotations

import asyncio
from functools import partial


def _extract_sync(file_path: str) -> str:
    import pdfplumber

    with pdfplumber.open(file_path) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages).strip()


async def extract_text(file_path: str) -> str:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, partial(_extract_sync, file_path))
