# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

**GitHub:** https://github.com/olarip224/ai-interview-simulator (private)
**Git user:** olarip224 / abrahamgutu23@gmail.com

When Claude Code runs directly inside WSL (Bash tool operating on the native Linux filesystem), `git`/`npm`/`pytest` all work normally from this directory. If instead invoked from Windows with only UNC-path access to WSL, use PowerShell:
```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/...
git commit -m "..."
git push
```

## Project

FastAPI + PostgreSQL backend for an AI-powered interview simulator. Uses Claude (via `anthropic` SDK) for resume analysis, question generation, and answer feedback. Frontend is a Next.js app (see Frontend Milestones below); F1 and F2 are complete.

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

Four migrations:
- `0001_initial` — `users`, `refresh_tokens`
- `0002_add_resumes` — `resumes` (user_id FK → users CASCADE, JSONB parsed_data)
- `0003_add_interviews` — `interview_sessions`, `questions`, `answers`, `feedback`, `analytics`
- `0004_add_coding_challenges` — `coding_challenges`, `coding_attempts`

`_AsyncSessionLocal` is exported from `app.database.session` — background tasks that need their own session import this and create `async with _AsyncSessionLocal() as session:`.

## Auth

- Access token: 15 min, `type: "access"` claim validated on every protected route
- Refresh token: 7 days, stored as SHA-256 hash in `refresh_tokens` table; **SELECT FOR UPDATE** on rotation
- Replay attack: revoked token reuse triggers revocation of ALL tokens for that user
- `get_current_user` dep in `app/auth/dependencies.py`; add `Depends(get_current_user)` to protected routes
- bcrypt wrapped in `asyncio.to_thread()` to avoid blocking the event loop

## AI Layer

`AIClient` ABC in `app/ai/client.py` — services never import `anthropic` directly. `ClaudeClient` does lazy `from anthropic import AsyncAnthropic` inside `__init__`. `get_ai_client()` dep uses `@lru_cache`.

Resume analysis prompt in `app/ai/prompts/resume.py`. Interview question/feedback prompts in `app/ai/prompts/interview.py` and `app/ai/prompts/feedback.py`. Code evaluation prompt in `app/ai/prompts/coding.py`. Parser in `app/ai/parsers.py` — extracts JSON with regex fallback; produces `ParsedResumeData`, `QuestionOutput`, `FeedbackOutput`, `CodeEvaluationOutput`.

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

`master` — Backend complete (M6). Frontend: F1 (Scaffold + Auth) and F2 (Resume System) complete and merged to `master`. F3 (Interview Simulator) planned next.

## Backend Milestones

| Milestone | Status | Branch |
|---|---|---|
| 1: Auth + scaffold | Complete | merged to master |
| 2: Resume system | Complete | merged to master |
| 3: Interview engine | Complete | merged to master |
| 4: Analytics | Complete | merged to master |
| 5: Coding challenges | Complete | merged to master |
| 6: Production hardening | Complete | merged to master |

## Frontend Milestones

See full breakdown: [`docs/frontend-milestones.md`](docs/frontend-milestones.md)

**Tech stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Monaco Editor, Vitest, Playwright — deployed to Vercel.

| Milestone | Deliverable | Status |
|---|---|---|
| F1: Scaffold + Auth | Login/register, protected routing, auth token rotation | Complete (merged to master) |
| F2: Resume System | Upload, async analysis polling, detail view | Complete (merged to master) |
| F3: Interview Simulator | Session creation, interview room, feedback summary | Planned |
| F4: Coding Challenges | Challenge browser, Monaco editor, AI evaluation | Planned |
| F5: Analytics Dashboard | Progress charts, weak topics, summary stats | Planned |
| F6: Polish + Deploy | Skeletons, error handling, responsive, live on Vercel | Planned |

## Frontend Milestone 1 — What Was Added

**Scaffold + Auth** — Next.js 15 app shell with working login/register and protected routing.

- **Scaffold:** Next.js 15 (App Router), TypeScript, Tailwind, ESLint, shadcn/ui base components, Vitest
- **Auth wrappers:** standalone axios instance for auth calls (`register`, `login`, `refresh`, `logout`, `me`) with TypeScript contracts
- **Authenticated axios instance:** injects `Authorization: Bearer`, auto-retries on 401 via `/auth/refresh` — handles concurrent 401s without firing duplicate refresh calls (race fixed in latest commit)
- **Auth store:** Zustand — `user`, `accessToken`, `login()`, `logout()`, `register()`; 19 passing unit tests
- **Data layer:** TanStack Query provider wired into root layout
- **Routing:** Edge `middleware.ts` redirects unauthenticated users to `/login`; login `next` param open-redirect fixed (only same-origin paths honored)
- **Pages:** `/login`, `/register`, `/` (dashboard shell with TopNav/Sidebar)
- **CI:** GitHub Actions workflow — frontend typecheck + lint + vitest on push

## Frontend Milestone 2 — What Was Added

**Resume System** — upload, async analysis polling, and detail view.

- **Pages:** `/resumes` (list, grid of cards, pagination) and `/resumes/[id]` (detail)
- **Upload:** `ResumeUploadZone` — `react-dropzone`, PDF-only, 10 MB max, `POST /resumes` (202), toast on success, inline `Alert` on rejection/error (429 gets a dedicated message)
- **Status:** backend computed field `ResumeResponse.is_analyzed` (`parsed_data is not None`) added alongside the existing `ResumeDetailResponse.parsed_data`; `ResumeStatusBadge` renders Analyzed / Processing / "Taking longer than expected" (stalled)
- **Polling:** `hooks/resumes/polling.ts` — pure functions `getResumeRefetchInterval` / `getResumesRefetchInterval` feed TanStack Query's `refetchInterval`; poll every 3s while any item/detail is unanalyzed, stop once `parsed_data` is populated
- **Stall + retry:** `components/resumes/stall.ts` — `isResumeStalled(createdAt, now)` flags resumes still processing after 90s; detail page then shows a "Retry analysis" button wired to `POST /resumes/{id}/analyze` (`useReanalyzeResume`)
- **Detail view:** `ResumeDetail` renders Claude's parsed skills/experience/education + summary once available, or the processing/stalled state before that
- **Delete:** `ResumeDeleteDialog` (shadcn `alert-dialog`) confirms before `DELETE /resumes/{id}` (soft delete — repo already filters `is_active` in list queries)
- **Data layer:** `lib/resumes-api.ts` + `hooks/resumes/*` (`useResumes`, `useResume`, `useUploadResume`, `useReanalyzeResume`, `useDeleteResume`), query keys in `hooks/resumes/keys.ts`
- **Upload content-type:** `resumes-api.ts` posts `FormData` with `Content-Type: undefined` so axios drops its default `application/json` header and lets the browser set the multipart boundary
- **Nav:** Sidebar "Resumes" link added (`F3–F5` items still pending), dashboard card on `/` now links to `/resumes`
- **New deps:** `react-dropzone`, `sonner` (toasts, wired into root layout via `<Toaster />`), `next-themes`
- **Tests:** 58 frontend vitest tests across hooks/components/lib for this milestone (polling logic, stall detection, upload rejection/error messages, delete confirmation flow, API wrappers) — all passing; typecheck, lint, and `next build` all clean
- **Note:** integration tests for the new `is_analyzed` field (`test_resumes.py`) need a real Postgres instance (`JSONB`/`UUID` columns aren't SQLite-compatible) — verified instead via the full unit suite (83 passing) plus a manual `model_validate` check against a fake ORM object

## Milestone 6 — What Was Added

**Production Hardening** — API hardened for production deployment.

- **Rate Limiting:** `slowapi==0.1.9` backed by Redis. `app/core/rate_limit.py` exports a `limiter` singleton. Seven routes decorated: register(5/min), login(10/min), refresh(30/min), upload(5/min), submit_attempt(10/min), generate_question(20/min), submit_answer(20/min). `RateLimitExceeded` → 429 `{"detail": "Rate limit exceeded"}`. Tests disable limiting via `_disable_rate_limiting` autouse fixture in `conftest.py`.
- **Error Handling:** Global `_unhandled_exception_handler` → 500 `{"detail": "Internal server error", "request_id": "..."}`. `LoggingMiddleware` now stores `request_id` in `request.state` for access by handlers.
- **Health Check:** `/api/v1/health` now checks Redis (`await redis.ping()`) in addition to DB, returning `{"status":"ok","db":"ok","redis":"ok"}`. Uses `Depends(get_redis)` pattern.
- **Security Headers:** `SecurityHeadersMiddleware` adds X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy on every response.
- **Startup Validation:** `_validate_settings()` called in lifespan — `sys.exit(1)` if `SECRET_KEY` is a known placeholder or `ANTHROPIC_API_KEY` starts with `sk-ant-your`. Bypassed in tests via `SKIP_STARTUP_VALIDATION=1` env var (set in `conftest.py`).
- **DB Pool:** `pool_recycle=3600` added to SQLAlchemy engine.
- **Pagination:** `app/schemas/pagination.py` — `PageParams` (limit/offset query deps), `Pagination` type alias, `PageResponse[T]` generic Pydantic model. Four list endpoints updated: `GET /challenges`, `GET /challenges/me/attempts`, `GET /interviews/sessions`, `GET /resumes`. Repo `list_*` methods return `tuple[list[T], int]`.
- **Docker:** `backend/docker/Dockerfile` — non-root `appuser` (UID 1001), HEALTHCHECK via curl. `backend/docker/docker-compose.prod.yml` — 4 workers, no `--reload`, `restart: unless-stopped`, `mem_limit` on all services.
- **Note:** `from __future__ import annotations` must NOT be in router files — it breaks FastAPI path-param resolution when combined with `@limiter.limit()` decorators.

## Milestone 5 — What Was Added

**Coding Challenges** — standalone practice feature, independent of interview sessions.

- **Models:** `CodingChallenge` (problem bank), `CodingAttempt` (user submissions) in `app/models/coding.py`
- **Migration:** `0004_add_coding_challenges` — `coding_challenges` + `coding_attempts` tables
- **AI:** `CODE_EVALUATION_PROMPT` in `app/ai/prompts/coding.py`; `CodeEvaluationOutput` + `parse_code_evaluation` in `app/ai/parsers.py`
- **Schemas:** 7 Pydantic schemas in `app/schemas/coding.py`
- **Repositories:** `CodingChallengeRepository`, `CodingAttemptRepository` in `app/repositories/coding_repository.py`
- **Service:** `CodingChallengeService(session, ai_client)` in `app/services/coding_service.py`
- **Endpoints** (all at `/api/v1/challenges`):
  - `GET /` — list challenges (filter by `difficulty`, `tag`; no auth)
  - `GET /{challenge_id}` — challenge detail with description, examples, starter code (no auth)
  - `POST /{challenge_id}/attempts` — submit code, get AI feedback (auth required, returns 201)
  - `GET /me/attempts` — list my attempts, optional `?challenge_id=` filter (auth required)
  - `GET /me/attempts/{attempt_id}` — attempt detail with code and all scores (auth required)
- **Seed script:** `backend/seed_challenges.py` — seeds 5 starter problems (Two Sum, Valid Parentheses, Maximum Subarray, Binary Search, Climbing Stairs); idempotent
- **Tests:** 13 unit tests + 9 integration tests; also fixed pre-existing pytest-asyncio 0.24 event loop issue in conftest
