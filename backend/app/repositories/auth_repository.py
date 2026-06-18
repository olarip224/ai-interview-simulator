import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import RefreshToken
from app.repositories.base import BaseRepository


class AuthRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_by_hash(self, token_hash: str, *, for_update: bool = False) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke(self, token: RefreshToken) -> None:
        token.revoked = True
        await self.session.flush()

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked.is_(False),
            )
            .values(revoked=True)
        )
        await self.session.flush()
