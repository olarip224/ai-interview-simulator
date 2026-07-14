# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

**GitHub:** https://github.com/olarip224/ai-interview-simulator (private)
**Git user:** olarip224 / abrahamgutu23@gmail.com

When Claude Code runs directly inside WSL (Bash tool operating on the native Linux filesystem), `git`/`npm`/`pytest` all work normally from this directory — including local commits. **`git push` needs GitHub credentials that only exist on the Windows side** (no credential helper/SSH key is set up inside this WSL environment) — push from PowerShell:
```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git push
```
If invoked from Windows with only UNC-path access to WSL (no native Bash access), do the add/commit from PowerShell too:
```powershell
Set-Location "\\wsl.localhost\Ubuntu\home\olari\ai-interview-simulator"
git add backend/app/...
git commit -m "..."
git push
```

## Project

FastAPI + PostgreSQL backend for an AI-powered interview simulator. Uses Claude (via `anthropic` SDK) for resume analysis, question generation, and answer feedback. Frontend is a Next.js app (see Frontend Milestones below); all six milestones (F1–F6) are complete — only the account-level Railway/Vercel deploy steps remain, see `docs/deployment.md`.

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

`master` — Backend complete (M6). Frontend: F1–F6 all complete (F1 Scaffold+Auth, F2 Resumes, F3 Interviews, F4 Coding Challenges, F5 Analytics, F6 Polish+Deploy). Every planned milestone is done — remaining work is the account-level deploy steps in `docs/deployment.md` (Railway + Vercel), which need credentials this session doesn't have.

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

**Tech stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, Monaco Editor, Recharts, Vitest, Playwright — deployed to Vercel.

| Milestone | Deliverable | Status |
|---|---|---|
| F1: Scaffold + Auth | Login/register, protected routing, auth token rotation | Complete (merged to master) |
| F2: Resume System | Upload, async analysis polling, detail view | Complete (merged to master) |
| F3: Interview Simulator | Session creation, interview room, feedback summary | Complete (merged to master) |
| F4: Coding Challenges | Challenge browser, Monaco editor, AI evaluation | Complete (merged to master) |
| F5: Analytics Dashboard | Progress charts, weak topics, summary stats | Complete (merged to master) |
| F6: Polish + Deploy | Skeletons, error handling, responsive, live on Vercel | Complete (merged to master); deploy pending — see `docs/deployment.md` |

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

## Frontend Milestone 3 — What Was Added

**Interview Simulator** — session creation, the interview room loop, and a feedback summary. Pure frontend work; the backend interview engine (Milestone 3 backend) was already complete.

- **Pages:** `/interviews` (list, status filter, pagination), `/interviews/[id]` (interview room), `/interviews/[id]/feedback` (summary)
- **Create session:** `CreateSessionDialog` — shadcn `Dialog` (net-new primitive, added alongside `Select`/`Textarea`) with type/difficulty/optional-resume `Select`s; the resume dropdown reuses F2's `useResumes({limit:100})` hook as-is. On success, navigates straight into the new session's room.
- **Room state machine:** driven off `GET /interviews/sessions/{id}/feedback` (`useSessionFeedback`), not the bare session detail endpoint — `per_question` is the only source that reflects per-question answered/unanswered state. Pure derivation in `components/interviews/room-state.ts` (`getCurrentQuestionState`) maps the last `per_question` item to `no-questions | awaiting-answer | feedback-shown`, which the room page switches on to render `QuestionCard`+`AnswerForm`, or `FeedbackCard`+"Next question"/"End interview".
- **Answer timer:** `hooks/interviews/useCountdown.ts` — generic 1s-tick countdown hook (setInterval-based, ref-guarded so `onExpire` fires exactly once regardless of re-renders); `AnswerForm` mounts it keyed on `question.id` so switching questions resets both the textarea and the timer via remount rather than manual reset plumbing. `DEFAULT_QUESTION_TIME_LIMIT_SECONDS = 180`, `TIMER_WARNING_THRESHOLD_SECONDS = 30` (red/pulse styling below 30s) in `hooks/interviews/countdown.ts`.
- **Auto-submit on timeout:** `AnswerForm` submits on manual click **or** timer expiry through the same code path — first attempt (whichever fires first) permanently freezes the countdown and disables the textarea, preventing a manual-click/expiry double-submit race. A failed submit (network/429) shows an inline retry that resubmits the exact same captured text and elapsed time, without restarting the timer.
- **End interview:** `EndInterviewDialog` (shadcn `alert-dialog`, mirrors `ResumeDeleteDialog`) always available in the room, with copy that adapts when the current question is still unanswered — the backend allows completing with zero answers, so this confirm is a pure client-side guardrail, not a backend requirement.
- **Backend gaps worked around defensively:** `generate_question` doesn't block on the prior question being unanswered, and there's no `abandoned`-status endpoint despite the enum value existing — the frontend only exposes "Next question" once feedback is showing, and simply leaves an untouched session `active` forever (revisiting the room reconstructs full state from `useSessionFeedback`, nothing is lost).
- **Data layer:** `types/interview.ts`, `lib/interviews-api.ts`, `hooks/interviews/*` (`useSessions`, `useSession`, `useSessionFeedback`, `useCreateSession`, `useGenerateQuestion`, `useSubmitAnswer`, `useCompleteSession`), query keys in `hooks/interviews/keys.ts`
- **Nav:** Sidebar "Interview Sessions" link added (`F4–F5` still pending), dashboard card on `/` now links to `/interviews`
- **New shadcn components:** `dialog`, `select`, `textarea` (no new npm deps — all backed by the already-installed `@base-ui/react`)
- **Tests:** 52 new frontend vitest tests (110 total) — pure logic (`room-state`, `countdown`, `submit-helpers`), `useCountdown` under fake timers (tick/expire-once/pause), all 7 query/mutation hooks, `AnswerForm`'s manual/auto-submit/retry paths under fake timers, dialogs, cards — all passing; typecheck, lint, and `next build` all clean. No backend changes were needed, so no new backend tests.
- **Note:** combining `vi.useFakeTimers()` with `@testing-library/react`'s `waitFor`/`findByText` (which poll on real timers) hangs — the timer-dependent `AnswerForm` tests use `await vi.advanceTimersByTimeAsync(...)` inside `act()` instead, and assert directly rather than through `waitFor`, once advanced.

## Frontend Milestone 4 — What Was Added

**Coding Challenges** — challenge browser, embedded Monaco editor with a 4-language selector, AI evaluation, and attempt history. Pure frontend work; the backend coding-challenges engine (Milestone 5 backend) was already complete.

- **Pages:** `/challenges` (browse list, difficulty + tag filters, pagination), `/challenges/[id]` (description/examples/constraints + editor + submit, evaluation renders inline — no redirect), `/challenges/me/attempts` (history, optional `?challenge_id=` filter), `/challenges/me/attempts/[id]` (read-only code replay + full feedback)
- **Monaco editor:** first `@monaco-editor/react` usage in the codebase (new dep) and the first `next/dynamic(..., { ssr: false })` usage — `components/challenges/CodeEditor.tsx` wraps it with a `Skeleton` loading fallback; reused as-is in read-only mode (`options.readOnly`) for attempt-detail code replay instead of a second syntax-highlighting component
- **Language selector:** `LanguageTabs` (shadcn `tabs`, net-new primitive alongside `skeleton`) always shows all 4 fixed languages (Python/JavaScript/TypeScript/Go) regardless of what a challenge's `starter_code` actually has — today's 5 seeded challenges only ever have `python`/`javascript` keys. `components/challenges/starter-code.ts`'s `getStarterCodeForLanguage` falls back to a `// Write your {language} solution here` placeholder for the rest. Per-language code drafts are kept in local `Record<language, code>` state so switching tabs doesn't lose in-progress edits in the other languages.
- **Three distinct feedback shapes, not one shared type:** the submit response nests scores under `feedback: {...}`; the attempt-list item has only `overall_score`/`is_correct`; the attempt-detail response flattens the same score/text/array fields directly onto the object. Modeled as three separate TS interfaces in `types/challenge.ts` (`AttemptFeedback`, `Attempt`, `AttemptDetail`) rather than coercing them into one shape.
- **Evaluation display:** `EvaluationResultCard` (mirrors F3's `FeedbackCard`) takes flattened primitive props (not a nested feedback object) so both the submit-result page and the attempt-detail replay page can pass their differently-shaped data through the same component without an adapter.
- **Attempt history titles:** `GET /challenges/me/attempts` list items only carry `challenge_id`, no title — `AttemptCard` does a per-item `useChallenge(challenge_id)` lookup (hits the public unauthenticated detail endpoint; TanStack Query caches/dedupes repeats) rather than adding a title field client-side.
- **Backend gaps worked around:** submitting is allowed for any `language` string and any starter-code mismatch (no enum/whitelist enforced server-side); an unparseable AI response is silently stored as a neutral-default attempt (`overall_score: 5.0`, `is_correct: false`, empty text/arrays) with no error flag — the UI just renders whatever comes back, same as F2/F3's AI-degradation handling; inactive vs. missing challenge are both a plain 404 (no distinct "retired" messaging is possible).
- **Data layer:** `types/challenge.ts`, `lib/challenges-api.ts`, `hooks/challenges/*` (`useChallenges`, `useChallenge`, `useAttempts`, `useAttempt`, `useSubmitAttempt`), two independent query-key factories in `hooks/challenges/keys.ts` (`challengeKeys`, `attemptKeys`) since challenges and attempts are separate top-level resources under this feature
- **Nav:** Sidebar "Coding Challenges" link added (last F5 placeholder remains), dashboard card on `/` now links to `/challenges`
- **New deps:** `@monaco-editor/react` (pulls in `monaco-editor` transitively)
- **Tests:** 29 new frontend vitest tests (139 total) — `starter-code` fallback logic, all 5 query/mutation hooks, `ChallengeCard`/`ChallengeDifficultyBadge`/`EvaluationResultCard`/`LanguageTabs`/`AttemptCard` (including its internal challenge-title lookup), `CodeEditor` (with `@monaco-editor/react`'s `Editor` mocked as a plain textarea — Monaco itself doesn't run meaningfully in jsdom), API wrapper — all passing; typecheck, lint, and `next build` all clean (Monaco confirmed code-split out of the initial bundle via the dynamic import, not bloating First Load JS). No backend changes were needed, so no new backend tests.

## Frontend Milestone 5 — What Was Added

**Analytics Dashboard** — read-only summary stats, a multi-series progress chart, a by-type breakdown, and a weak-topics list. Pure frontend work; the backend analytics engine (Milestone 4 backend) was already complete.

- **Page:** `/analytics` — assembles stat cards, chart, breakdown table, and weak-topics list; empty state (`total_sessions === 0`) shows a CTA to `/interviews` instead of blank charts
- **Charting:** first `recharts` usage in the codebase, added via `npx shadcn add chart` (installs `components/ui/chart.tsx` — `ChartContainer`/`ChartTooltip`/`ChartLegend`/`ChartConfig`). No conflict with the rest of shadcn's `@base-ui/react`-based primitives since Recharts is independent SVG/D3 rendering.
- **Palette:** ran the `dataviz` skill before writing any chart code — the project's `--chart-1..5` CSS vars in `globals.css` were a placeholder monochrome ramp; replaced with a validated categorical palette (`scripts/validate_palette.js`, CVD-safe fixed order: blue/aqua/yellow/green/violet) checked against this project's actual light (`#ffffff`) and dark (~`#171717`) card surfaces, not the skill's generic defaults.
- **Progress chart is multi-series, not a single line** (per explicit product decision): one `<Line>` per interview type (swe/ml/behavioral/cybersecurity) that actually appears in the user's history — `components/analytics/progress-data.ts`'s `getPresentInterviewTypes` filters a fixed canonical order (reusing `INTERVIEW_TYPE_LABELS` from `components/interviews/labels.ts` — same enum/domain, deliberate cross-feature reuse) down to only types present, and `toChartRows` builds one row per session with only that session's own type-key set — other types stay `undefined` on that row so Recharts draws a gap, not a misleading zero, for types not practiced at that point.
- **Backend ordering gotcha worked around:** `GET /analytics/me/progress` returns newest-first by an internal insertion timestamp, not `completed_at`, and isn't guaranteed sorted at all for charting purposes — `sortProgressAscending` re-sorts client-side before anything is charted.
- **Weak topics:** sourced from the dedicated `GET /me/weak-topics` endpoint (has per-topic counts) rather than summary's capped, count-less `top_weak_topics` field; copy says "mentioned most often" since the data is frequency-ranked, not score-ranked — no per-topic score exists anywhere in the backend. Uncapped server response is capped to top 10 client-side (`MAX_DISPLAYED_TOPICS`) since `weak_topics` is raw free-text (not a fixed taxonomy) and can get long-tail noisy.
- **No fabricated stats:** summary's only real fields are `total_sessions` + four avg-score fields (overall/technical/communication/correctness) — there is no "total questions answered" anywhere in the analytics contract despite the milestone doc implying one; `SummaryStatsCards` only surfaces what actually exists.
- **Testing Recharts under jsdom:** jsdom has no `ResizeObserver`, and Recharts' `ResponsiveContainer` (which shadcn's `ChartContainer` wraps) waits for a resize callback reporting a non-zero size before rendering any children — a no-op stub isn't enough. Added a real polyfill to `vitest.setup.ts` whose `observe()` fires the callback once (via `queueMicrotask`) with a fixed 320×200 size, letting `ProgressChart` render for real in tests (`await screen.findByText(...)`) instead of needing a full Recharts mock.
- **Data layer:** `types/analytics.ts` (reuses `InterviewType` from `types/interview.ts`), `lib/analytics-api.ts`, `hooks/analytics/*` (`useSummary`, `useProgress`, `useWeakTopics` — all three backend endpoints take no params and aren't paginated, so `keys.ts` has no list/detail split, just `analyticsKeys.summary()/progress()/weakTopics()`)
- **Nav:** Sidebar "Analytics" link added — this was the last remaining placeholder, so the Sidebar nav list is now fully real; dashboard gained a genuine 4th card (no existing inert div to convert this time, unlike F2–F4)
- **New deps:** `recharts` (via the shadcn `chart` component)
- **Tests:** 23 new frontend vitest tests (162 total) — `progress-data.ts` pure helpers (sort, present-types, row-shaping with gaps), all 3 query hooks, stat cards/breakdown table/weak-topics list, `ProgressChart` rendered for real (not mocked) against the `ResizeObserver` polyfill, API wrapper — all passing; typecheck, lint, and `next build` all clean (`/analytics` prerenders fully static, unlike F4's Monaco-dependent dynamic routes). No backend changes were needed, so no new backend tests.

## Frontend Milestone 6 — What Was Added

**Polish + Deploy prep** — cross-cutting pass over all 11 existing pages (loading, error, responsive, a11y) plus deployment tooling. Unlike F1–F5, this touched every existing feature rather than adding a new one; no backend changes were needed.

- **Shared dashboard shell:** introduced `app/(dashboard)/layout.tsx` (Next.js route group — doesn't change any URL) rendering `TopNav` + `Sidebar` + `<main>` once; moved all 11 existing pages (`/`, `/resumes/**`, `/interviews/**`, `/challenges/**`, `/analytics`) under it and deleted their individually hand-rolled wrapper markup. `login`/`register` stay siblings outside the group (no dashboard chrome). This is what made the mobile-nav fix a one-file change instead of an 11-file one.
- **Responsive mobile nav:** added shadcn `sheet` (new primitive). `Sidebar` is now `hidden lg:block`; `TopNav` gained a hamburger button (`lg:hidden`) opening a `Sheet` drawer with the same links. Extracted `components/nav/nav-items.ts` as the single source both `Sidebar` and the mobile drawer render from, so they can't drift. Fixed a concrete overflow bug found during the move: `challenges/page.tsx`'s filter row (`w-40` Select + `w-48` Input, no wrap) forced horizontal scroll on narrow viewports.
- **Loading skeletons:** `components/skeletons/{CardGridSkeleton,DetailSkeleton,StatCardsSkeleton}.tsx` — three reusable shapes cover all 11 pages (list pages share `CardGridSkeleton`; unique detail pages use `DetailSkeleton` with page-specific block heights; analytics uses `StatCardsSkeleton`) rather than one bespoke skeleton per page. Replaced every `{isLoading && <p>Loading…</p>}` across the app; goal was "no layout shift," not pixel-perfect fidelity.
- **Error handling:** new `lib/errors.ts` exporting `getApiErrorMessage(error, {rateLimitMessage, fallbackMessage})`, replacing three near-identical 429-detection helpers that had accumulated independently in `resumes/upload-helpers.ts` and both `interviews/` and `challenges/submit-helpers.ts` (each now a 4-line wrapper calling the shared helper — call sites unchanged). Fixed two real gaps found by audit: the interview room (`interviews/[id]/page.tsx`) never checked `isError` on either of its two hooks (a fetch failure rendered a blank page); `analytics/page.tsx` only checked `useSummary`'s `isError`, silently swallowing `useProgress`/`useWeakTopics` failures. Added `app/error.tsx` and `app/global-error.tsx` (neither existed — first App Router error boundaries in the project). Added a 429 case to `lib/api.ts`'s response interceptor that fires a `sonner` toast globally, additive to (not replacing) each feature's existing inline error message.
- **Accessibility:** audited first rather than assumed — Base UI's `Dialog`/`AlertDialog` already provide focus-trap + return-focus for free (`FloatingFocusManager`, confirmed from `node_modules/@base-ui/react` source), and focus-visible styling is already global via shadcn's per-component classes. The one real gap was a missing skip-link, added to `(dashboard)/layout.tsx` (`sr-only focus:not-sr-only`, targets `#main-content`).
- **Playwright E2E:** `@playwright/test` added (first use in the project). `frontend/e2e/smoke.spec.ts` — one test: register → upload a resume → run a full interview (generate question, answer, next question, end) → view analytics, `180s` timeout since question generation/feedback hit the real Claude API. `.github/workflows/e2e-smoke.yml` runs it manually/post-deploy against a live URL, not on every push (it needs a real target).
- **Environment/tooling gotchas hit while verifying this milestone** (all resolved, worth remembering):
  - `vitest.config.ts` needed `exclude: [...configDefaults.exclude, 'e2e/**']` — Vitest was picking up the new Playwright spec file as one of its own tests and failing on `test.setTimeout()` (a Playwright-only API). Extending `configDefaults.exclude` rather than replacing it, so `node_modules`/etc. stay excluded too.
  - The first live Playwright run (against `next dev`) failed with the register form doing a native GET submission (fields appended to the URL) — a hydration race from Next dev's on-demand per-route compilation, not a real app bug. Re-running against a production `next build && next start` (which is what "passes against production" actually means anyway) fixed it.
  - Playwright's downloaded Chromium needs `libnss3`/`libnspr4`/`libasound2`/etc., and `playwright install --with-deps` needs root, which isn't available here. Worked around it without sudo: `apt-get download` (fetches `.deb`s without installing) + `dpkg -x` (extracts a `.deb`'s contents to an arbitrary directory, no root needed) into `~/.playwright-libs/extracted`, then run tests with `LD_LIBRARY_PATH` pointing at `.../usr/lib/x86_64-linux-gnu`. Use `/home` for anything that needs to survive between commands, not `/tmp` — this sandbox appears to periodically reset `/tmp` and stop backgrounded Docker containers/processes independent of anything this session did.
  - Caught a real near-miss: a real `ANTHROPIC_API_KEY` was pasted into `backend/.env.example` (git-tracked template) instead of `backend/.env` (gitignored, actually loaded) while setting up credentials for live verification. Caught via `git diff` before any commit — moved the key to `.env`, restored `.env.example`'s placeholder, generated a real `SECRET_KEY` for `.env` too (was still the startup-validation-rejected placeholder). Nothing was ever committed or pushed with a real secret in it.
- **Live verification (not just mocks/unit tests) — first time in this project**: with Docker Desktop + WSL integration available, ran the actual stack — `docker compose up -d postgres redis`, real `uvicorn` backend, production Next.js build via `next start`, and the Playwright smoke test end-to-end against it, including real Claude API calls for interview questions/feedback and resume analysis. Also ran the backend's full test suite (134 tests: unit + integration, not just unit as in F2–F5) against the real DB. Both fully green.
- **Deployment runbook:** `docs/deployment.md` — step-by-step for the account-level actions this session can't perform (no Railway/Vercel credentials, and provisioning real cloud infra/secrets isn't something to do unilaterally regardless): create the Railway project (picks up `railway.toml`/`backend/docker/Dockerfile`), provision Postgres+Redis, set production env vars, run migrations; connect the GitHub repo to Vercel (root dir `frontend/`), set `NEXT_PUBLIC_API_URL`, deploy; circle back and update Railway's `CORS_ORIGINS` with the resulting Vercel URL.
- **Tests:** 20 new/changed frontend vitest tests (182 total) — `lib/errors.ts`, the three skeleton components, `app/error.tsx`'s retry button, mobile-nav Sheet contents matching `nav-items.ts`. Full suite + `tsc` + `eslint` + `next build` all clean.

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
