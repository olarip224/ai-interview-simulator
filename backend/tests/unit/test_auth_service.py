import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from app.services.auth_service import AuthService
from app.core.exceptions import AuthenticationError, ConflictError
from app.schemas.auth import RegisterRequest


def make_service(mock_session=None):
    svc = AuthService(mock_session or AsyncMock())
    return svc


def make_mock_user(
    user_id="test-id",
    email="test@example.com",
    username="testuser",
    is_active=True,
    password_hash=None,
):
    user = MagicMock()
    user.id = user_id
    user.email = email
    user.username = username
    user.is_active = is_active
    user.password_hash = password_hash or "$2b$12$placeholder"
    return user


@pytest.mark.asyncio
async def test_register_raises_conflict_on_duplicate_email():
    svc = make_service()
    svc.user_repo = AsyncMock()
    svc.user_repo.email_exists = AsyncMock(return_value=True)

    with pytest.raises(ConflictError, match="Email already registered"):
        await svc.register(
            RegisterRequest(email="dup@example.com", username="user", password="password123")
        )


@pytest.mark.asyncio
async def test_register_raises_conflict_on_duplicate_username():
    svc = make_service()
    svc.user_repo = AsyncMock()
    svc.user_repo.email_exists = AsyncMock(return_value=False)
    svc.user_repo.username_exists = AsyncMock(return_value=True)

    with pytest.raises(ConflictError, match="Username already taken"):
        await svc.register(
            RegisterRequest(email="new@example.com", username="taken", password="password123")
        )


@pytest.mark.asyncio
async def test_login_raises_for_unknown_email():
    svc = make_service()
    svc.user_repo = AsyncMock()
    svc.user_repo.get_by_email = AsyncMock(return_value=None)

    with pytest.raises(AuthenticationError, match="Invalid email or password"):
        await svc.login("nobody@example.com", "password")


@pytest.mark.asyncio
async def test_login_raises_for_wrong_password():
    svc = make_service()
    svc.user_repo = AsyncMock()
    mock_user = make_mock_user()
    svc.user_repo.get_by_email = AsyncMock(return_value=mock_user)

    with patch("app.services.auth_service.verify_password", return_value=False):
        with pytest.raises(AuthenticationError, match="Invalid email or password"):
            await svc.login("test@example.com", "wrongpassword")


@pytest.mark.asyncio
async def test_login_raises_for_inactive_user():
    from app.auth.password import hash_password

    svc = make_service()
    svc.user_repo = AsyncMock()
    mock_user = make_mock_user(is_active=False, password_hash=hash_password("password123"))
    svc.user_repo.get_by_email = AsyncMock(return_value=mock_user)

    with pytest.raises(AuthenticationError, match="Account is disabled"):
        await svc.login("test@example.com", "password123")


@pytest.mark.asyncio
async def test_refresh_raises_for_nonexistent_token():
    svc = make_service()
    svc.auth_repo = AsyncMock()
    svc.auth_repo.get_by_hash = AsyncMock(return_value=None)

    with pytest.raises(AuthenticationError, match="Invalid refresh token"):
        await svc.refresh("nonexistenttoken")


@pytest.mark.asyncio
async def test_refresh_raises_and_revokes_all_for_revoked_token():
    svc = make_service()
    svc.auth_repo = AsyncMock()
    mock_token = MagicMock()
    mock_token.revoked = True
    mock_token.user_id = "user-id"
    svc.auth_repo.get_by_hash = AsyncMock(return_value=mock_token)
    svc.auth_repo.revoke_all_for_user = AsyncMock()

    with pytest.raises(AuthenticationError, match="revoked"):
        await svc.refresh("somerawtoken")

    svc.auth_repo.revoke_all_for_user.assert_awaited_once_with("user-id")
