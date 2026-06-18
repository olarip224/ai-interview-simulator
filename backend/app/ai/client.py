from __future__ import annotations

from abc import ABC, abstractmethod


class AIClient(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        max_tokens: int,
    ) -> str:
        """Send messages and return the assistant's text response."""


class ClaudeClient(AIClient):
    def __init__(self, api_key: str) -> None:
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=api_key)

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        max_tokens: int,
    ) -> str:
        response = await self._client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,  # type: ignore[arg-type]
        )
        return response.content[0].text  # type: ignore[union-attr]
