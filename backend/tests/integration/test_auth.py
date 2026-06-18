import pytest

_USER = {
    "email": "test@example.com",
    "username": "testuser",
    "password": "securepassword123",
}


@pytest.mark.asyncio
async def test_register_returns_201_with_tokens(client):
    response = await client.post("/api/v1/auth/register", json=_USER)
    assert response.status_code == 201
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == _USER["email"]
    assert body["user"]["username"] == _USER["username"]
    assert "password" not in body["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client):
    await client.post("/api/v1/auth/register", json=_USER)
    response = await client.post("/api/v1/auth/register", json=_USER)
    assert response.status_code == 409
    assert "Email already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username_returns_409(client):
    await client.post("/api/v1/auth/register", json=_USER)
    response = await client.post("/api/v1/auth/register", json={
        **_USER,
        "email": "other@example.com",
    })
    assert response.status_code == 409
    assert "Username already taken" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_returns_200_with_tokens(client):
    await client.post("/api/v1/auth/register", json=_USER)
    response = await client.post("/api/v1/auth/login", json={
        "email": _USER["email"],
        "password": _USER["password"],
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client):
    await client.post("/api/v1/auth/register", json=_USER)
    response = await client.post("/api/v1/auth/login", json={
        "email": _USER["email"],
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client):
    response = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "password",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_returns_new_token_pair(client):
    reg = await client.post("/api/v1/auth/register", json=_USER)
    old_refresh = reg.json()["refresh_token"]

    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["refresh_token"] != old_refresh  # token was rotated


@pytest.mark.asyncio
async def test_refresh_with_used_token_returns_401(client):
    reg = await client.post("/api/v1/auth/register", json=_USER)
    old_refresh = reg.json()["refresh_token"]

    await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    response = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_invalidates_refresh_token(client):
    reg = await client.post("/api/v1/auth/register", json=_USER)
    tokens = reg.json()

    logout = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert logout.status_code == 204

    refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client):
    reg = await client.post("/api/v1/auth/register", json=_USER)
    access = reg.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == _USER["email"]
    assert body["username"] == _USER["username"]
    assert "password_hash" not in body


@pytest.mark.asyncio
async def test_me_without_token_returns_403(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403
