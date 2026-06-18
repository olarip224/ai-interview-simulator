from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import CurrentUser
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(
    data: RegisterRequest,
    session: AsyncSession = Depends(get_db),
) -> AuthResponse:
    return await AuthService(session).register(data)


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> AuthResponse:
    return await AuthService(session).login(data.email, data.password)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    data: RefreshRequest,
    session: AsyncSession = Depends(get_db),
) -> AuthResponse:
    return await AuthService(session).refresh(data.refresh_token)


@router.post("/logout", status_code=204)
async def logout(
    data: LogoutRequest,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_db),
) -> None:
    await AuthService(session).logout(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
