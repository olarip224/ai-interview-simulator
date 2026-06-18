# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

**GitHub:** https://github.com/olarip224/ai-interview-simulator (private)
**Git user:** olarip224 / abrahamgutu23@gmail.com

**All git operations must use PowerShell with UNC paths** — the Bash tool cannot access the WSL filesystem:
```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/...
git commit -m "..."
git push
```

## Project

FastAPI + PostgreSQL backend for an AI-powered interview simulator. Uses Claude (via `anthropic` SDK) for resume analysis, question generation, and answer feedback. Backend only — frontend is a future milestone.

**Stack:** Python 3.12, FastAPI 0.115, SQLAlchemy 2.0 async, asyncpg, Alembic, Redis, JWT (HS256), bcrypt, pdfplumber, python-magic, Claude API

## Running Locally (inside WSL/Docker)

```bash
cd backend

# 1. Start dependencies
docker compose -f docker/docker-compose.yml up -d postgres redis

# 2. Copy and edit env
cp .env.example .env
# Set DATABASE_URL, SECRET_KEY, ANTHROPIC_API_KEY at minimum

# 3. Apply migrations
alembic upgrade head

# 4. Run dev server
uvicorn app.main:app --reload

# 5. Run tests
pytest -v

# Run a single test
pytest tests/integration/test_auth.py::test_register_returns_201_with_tokens -v

# New migration after model change
alembic revision --autogenerate -m "description"
```

## Architecture

Clean Architecture with strict layer boundaries. Dependency direction: Router → Service → Repository → PostgreSQL.

```
app/
├── api/v1/routers/     — HTTP only: parse input, call one service method, return response_model
├── services/           — all business logic; no SQLAlchemy imports; no HTTP concerns
├── repositories/       — only layer that touches ORM models; one file per model
├── models/             — SQLAlchemy ORM; never returned from routers
├── schemas/            — Pydantic v2 request/response contracts; decoupled from ORM
├── core/               — enums.py, exceptions.py (zero-dependency domain rules)
├── auth/               — jwt.py, password.py, dependencies.py (get_current_user)
├── ai/                 — AIClient ABC + ClaudeClient; prompts/; parsers.py
├── database/           — session.py (engine + get_db), redis.py
├── middleware/         — error_handler.py, logging.py
└── utils/              — file_handler.py (FileStorage), pdf_parser.py, validators.py
```

**Key rules enforced in every PR:**
- All DB access async — `async_sessionmaker`, `asyncpg`, `await` all queries
- `response_model=` on every route — ORM objects never leave the repository layer
- All PKs are UUID; all timestamps are `DateTime(timezone=True)`
- Never `Base.metadata.create_all()` — Alembic only
- Routes are `/api/v1/` prefixed
- Refresh tokens stored as `sha256(raw_token)` — raw token returned to client once, never stored

## Database

Two migrations so far:
- `0001_initial` — `users`, `refresh_tokens`
- `0002_add_resumes` — `resumes` (user_id FK → users CASCADE, JSONB parsed_data)

`_AsyncSessionLocal` is exported from `app.database.session` — background tasks that need their own session import this and create `async with _AsyncSessionLocal() as session:`.

## Auth

- Access token: 15 min, `type: "access"` claim validated on every protected route
- Refresh token: 7 days, stored as SHA-256 hash in `refresh_tokens` table; **SELECT FOR UPDATE** on rotation
- Replay attack: revoked token reuse triggers revocation of ALL tokens for that user
- `get_current_user` dep in `app/auth/dependencies.py`; add `Depends(get_current_user)` to protected routes
- bcrypt wrapped in `asyncio.to_thread()` to avoid blocking the event loop

## AI Layer

`AIClient` ABC in `app/ai/client.py` — services never import `anthropic` directly. `ClaudeClient` does lazy `from anthropic import AsyncAnthropic` inside `__init__`. `get_ai_client()` dep uses `@lru_cache`.

Resume analysis prompt in `app/ai/prompts/resume.py`. Parser in `app/ai/parsers.py` — extracts JSON with regex fallback to empty `ParsedResumeData`.

## File Uploads

`FileStorage` ABC in `app/utils/file_handler.py`. `LocalFileStorage.save()` returns filename only (UUID-based). `validate_pdf_file()` checks size → extension → magic bytes (requires `libmagic1` in Docker). `extract_text()` is `async def` and uses `run_in_executor`.

## Exception Hierarchy

`app/core/exceptions.py`:
- `AppError(Exception)` — base; has `message` and `status_code`
- `NotFoundError` → 404
- `AuthenticationError` → 401
- `ConflictError` → 409
- `ForbiddenError` → 403
- `UploadError` → 400

`error_handler.py` maps these to HTTP responses automatically.

## Testing

Unit tests (`tests/unit/`) use `AsyncMock`/`MagicMock` — no real DB or files. Integration tests (`tests/integration/`) use `AsyncClient` + `ASGITransport` + a real test DB. For integration tests, override `get_ai_client` and `get_file_storage` in `conftest.py` via `app.dependency_overrides` rather than inline `patch()` calls.

## Active Development Branch

`feat/milestone-2-resume-system` — Milestone 2 (Resume System) in progress. See `docs/superpowers/plans/` for implementation plans.

## Milestones

| Milestone | Status | Branch |
|---|---|---|
| 1: Auth + scaffold | Complete | merged to master |
| 2: Resume system | In progress | feat/milestone-2-resume-system |
| 3: Interview engine | Planned | — |
| 4: Analytics | Planned | — |
| 5: Coding challenges | Planned | — |
| 6: Production hardening | Planned | — |
