import pytest

from app.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_refresh_token,
)
from app.core.exceptions import AuthenticationError


def test_create_access_token_returns_non_empty_string():
    token = create_access_token("user-id-123", "user@example.com")
    assert isinstance(token, str) and len(token) > 0


def test_decode_access_token_returns_correct_sub_and_email():
    token = create_access_token("user-id-123", "user@example.com")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-id-123"
    assert payload["email"] == "user@example.com"


def test_decode_access_token_type_is_access():
    token = create_access_token("user-id-123", "user@example.com")
    assert decode_access_token(token)["type"] == "access"


def test_decode_invalid_token_raises_authentication_error():
    with pytest.raises(AuthenticationError):
        decode_access_token("not.a.real.token")


def test_create_refresh_token_returns_raw_and_64_char_hash():
    raw, hashed = create_refresh_token()
    assert isinstance(raw, str) and len(raw) > 0
    assert len(hashed) == 64  # sha256 hex digest


def test_refresh_tokens_are_unique():
    raw1, _ = create_refresh_token()
    raw2, _ = create_refresh_token()
    assert raw1 != raw2


def test_hash_refresh_token_is_deterministic():
    raw, first_hash = create_refresh_token()
    assert hash_refresh_token(raw) == first_hash
