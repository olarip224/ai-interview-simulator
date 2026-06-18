import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest, LoginRequest


def test_register_rejects_invalid_email():
    with pytest.raises(ValidationError):
        RegisterRequest(email="not-an-email", username="user", password="password123")


def test_register_rejects_short_password():
    with pytest.raises(ValidationError, match="Password must be at least 8 characters"):
        RegisterRequest(email="a@b.com", username="user", password="short")


def test_register_rejects_short_username():
    with pytest.raises(ValidationError, match="Username must be 3-50 characters"):
        RegisterRequest(email="a@b.com", username="ab", password="password123")


def test_register_rejects_username_with_special_chars():
    with pytest.raises(ValidationError, match="Username can only contain"):
        RegisterRequest(email="a@b.com", username="bad name!", password="password123")


def test_register_accepts_valid_data():
    req = RegisterRequest(email="User@Example.com", username="valid_user", password="password123")
    assert req.email == "user@example.com"  # pydantic EmailStr lowercases
    assert req.username == "valid_user"


def test_register_accepts_username_with_dash_and_underscore():
    req = RegisterRequest(email="a@b.com", username="my-user_123", password="password123")
    assert req.username == "my-user_123"


def test_login_requires_email_and_password():
    with pytest.raises(ValidationError):
        LoginRequest(email="not-email", password="pass")
