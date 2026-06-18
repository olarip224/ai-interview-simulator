from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, create_refresh_token, hash_refresh_token
from app.auth.password import hash_password, verify_password
from app.config import settings
from app.core.exceptions import AuthenticationError, ConflictError
from app.repositories.auth_repository import AuthRepository

if TYPE_CHECKING:
    from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, RegisterRequest, UserInToken


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repo = UserRepository(session)
        self.auth_repo = AuthRepository(session)

    async def register(self, data: RegisterRequest) -> AuthResponse:
        if await self.user_repo.email_exists(data.email):
            raise ConflictError("Email already registered")
        if await self.user_repo.username_exists(data.username):
            raise ConflictError("Username already taken")

        try:
            user = await self.user_repo.create(
                email=data.email.lower(),
                username=data.username,
                password_hash=await asyncio.to_thread(hash_password, data.password),
            )
        except IntegrityError:
            raise ConflictError("Email or username already registered")
        return await self._issue_tokens(user)

    async def login(self, email: str, password: str) -> AuthResponse:
        user = await self.user_repo.get_by_email(email)
        if user is None or not await asyncio.to_thread(verify_password, password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        return await self._issue_tokens(user)

    async def refresh(self, raw_token: str) -> AuthResponse:
        token_hash = hash_refresh_token(raw_token)
        stored = await self.auth_repo.get_by_hash(token_hash, for_update=True)

        if stored is None:
            raise AuthenticationError("Invalid refresh token")
        if stored.revoked:
            await self.auth_repo.revoke_all_for_user(stored.user_id)
            raise AuthenticationError("Refresh token has been revoked")
        if stored.expires_at < datetime.now(timezone.utc):
            raise AuthenticationError("Refresh token has expired")

        await self.auth_repo.revoke(stored)
        user = await self.user_repo.get_or_404(stored.user_id)
        return await self._issue_tokens(user)

    async def logout(self, raw_token: str) -> None:
        token_hash = hash_refresh_token(raw_token)
        stored = await self.auth_repo.get_by_hash(token_hash)
        if stored is not None and not stored.revoked:
            await self.auth_repo.revoke(stored)

    async def _issue_tokens(self, user: User) -> AuthResponse:
        access = create_access_token(str(user.id), user.email)
        raw, token_hash = create_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        await self.auth_repo.create(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
        )
        return AuthResponse(
            access_token=access,
            refresh_token=raw,
            user=UserInToken(id=str(user.id), email=user.email, username=user.username),
        )
