import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, id: uuid.UUID) -> ModelT | None:
        return await self.session.get(self.model, id)

    async def get_or_404(self, id: uuid.UUID) -> ModelT:
        obj = await self.get(id)
        if obj is None:
            raise NotFoundError(self.model.__name__)
        return obj

    async def create(self, **kwargs: object) -> ModelT:
        obj = self.model(**kwargs)
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.session.flush()
