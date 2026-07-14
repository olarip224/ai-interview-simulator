# AI Interview Simulator

A full-stack web app that helps you practice for job interviews using Claude (Anthropic's AI). Upload your resume and get AI feedback on it, run mock interview sessions where an AI asks you questions and grades your answers in real time, practice coding problems with AI code review, and track your improvement over time on an analytics dashboard.

Think of it as a personal interview coach that never gets tired of running you through another round of questions.

**Languages:** Python · TypeScript · SQL

**Frameworks & libraries:** FastAPI · SQLAlchemy · Alembic · Pydantic · Redis · slowapi · Next.js · React · Tailwind CSS · shadcn/ui (Base UI) · TanStack Query · Zustand · Monaco Editor · Recharts · Anthropic SDK (Claude) · Pytest · Vitest · Playwright

---

## What this project actually does

There are four things you can do once you're logged in:

1. **Upload a resume** and have Claude read it and pull out your skills, work experience, education, and a short written summary — so the interview questions later can be tailored around what's actually on your resume.
2. **Run a mock interview.** Pick a type (software engineering, ML, behavioral, or cybersecurity) and a difficulty (junior/mid/senior), optionally attach your resume, and Claude generates one question at a time. You type an answer (against a countdown timer), Claude grades it instantly — score, strengths, weaknesses, suggestions — and then generates the next question. At the end you get a full summary of the whole session.
3. **Solve coding challenges** in an in-browser code editor (Python, JavaScript, TypeScript, or Go), submit your solution, and Claude evaluates it for correctness, efficiency, and style, the same way a human interviewer would leave code review comments.
4. **Track your progress** on an analytics dashboard — average scores over time, a line chart of how you're trending, and a ranked list of topics you keep getting marked down on, so you know what to practice next.

Everything an AI grades (resumes, interview answers, code submissions) goes through the same Claude model (`claude-haiku-4-5`), just with a different prompt and a different expected output shape for each use case.

---

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| **Backend language/framework** | Python 3.12 + **FastAPI** | FastAPI is async-native (important — every request that calls Claude or Postgres has to `await` without blocking other users), has automatic request/response validation via Pydantic, and Python has by far the best-supported SDK and ecosystem for calling LLM APIs. |
| **Database** | **PostgreSQL** via SQLAlchemy (async) + Alembic migrations | The data is genuinely relational — a user has many resumes, has many interview sessions, each session has many questions, each question has one answer, each answer has one feedback record. Postgres also has a `JSONB` column type, which is used to store Claude's parsed output (parsed resume data, question examples, etc.) without needing a rigid schema for AI-generated content. |
| **Caching / rate limiting** | **Redis** | Backs the rate limiter (`slowapi`) so things like "5 uploads per minute" are enforced correctly even across multiple backend processes, not just in one process's memory. |
| **Auth** | JWT (access + refresh tokens), `python-jose` + `passlib`/`bcrypt` | Stateless access tokens keep most requests fast (no DB hit to check who you are), while refresh tokens are stored server-side (as a SHA-256 hash, never the raw token) so a compromised refresh token can be revoked. |
| **AI** | **Anthropic's Claude API** (`claude-haiku-4-5`) | Haiku is Anthropic's fastest/cheapest model — appropriate here because every AI call in this app (parse a resume, grade an answer, evaluate code) needs to return in a few seconds so the UI doesn't feel like it's stalling, and the tasks involved don't need the heaviest reasoning model to do well. |
| **Frontend framework** | **Next.js 15** (App Router) + **TypeScript** | The App Router's file-based routing maps directly onto the app's structure (`/resumes`, `/interviews/[id]`, `/challenges/[id]`, etc.), and TypeScript end-to-end means the frontend's `types/*.ts` interfaces are hand-mirrors of the backend's Pydantic schemas — if the backend changes a field name, TypeScript will complain everywhere the old name was used. |
| **Styling / components** | **Tailwind CSS v4** + **shadcn/ui** (Base UI primitives) | shadcn isn't a component *library* you install — it copies accessible, unstyled component source directly into the repo (`components/ui/`), so every dialog, dropdown, and form control already has correct keyboard navigation and focus handling for free, and can still be edited like any other file in the project. |
| **Server state** | **TanStack Query** | Every piece of data that comes from the backend (resumes, sessions, challenges, analytics) is fetched, cached, and re-fetched through this — it's also what powers the "poll every 3 seconds until the resume is done analyzing" behavior without hand-written polling loops. |
| **Client state** | **Zustand** | Only used for one thing: who's currently logged in (the access/refresh tokens and user object). Deliberately not used for server data — that's TanStack Query's job. |
| **Code editor** | **Monaco Editor** (the engine behind VS Code) | Gives the coding-challenges feature real syntax highlighting and a proper editing experience, rather than a plain `<textarea>`. |
| **Charts** | **Recharts** (via shadcn's chart wrapper) | Powers the analytics score-over-time line chart. |
| **Testing** | **Pytest** (backend), **Vitest** + Testing Library (frontend unit/component), **Playwright** (frontend E2E) | Backend has unit tests (mocked AI/DB) and integration tests (real Postgres). Frontend mirrors that split — component/hook tests are fast and mock the network; the Playwright test drives an actual browser through the full register → upload → interview → analytics flow against a real running backend. |

---

## How it's organized (both sides mirror each other)

**Backend** — Clean Architecture, one direction of dependency only:

```
Router (HTTP only)  →  Service (business logic)  →  Repository (only layer touching the DB)  →  Postgres
```

```
backend/app/
├── api/v1/routers/   one file per feature: auth, resumes, interviews, challenges, analytics, health
├── services/         the actual logic — e.g. "what happens when someone submits an answer"
├── repositories/      the only place SQLAlchemy queries live
├── models/            the SQLAlchemy ORM table definitions
├── schemas/            Pydantic request/response contracts (what the API actually promises to send/receive)
├── ai/                 the AIClient wrapper, the prompts sent to Claude, and the parser that turns Claude's text back into structured data
└── auth/, core/, database/, middleware/, utils/   supporting pieces (JWT, exceptions, DB session, rate limiting, file storage)
```

**Frontend** — one feature = one vertical slice, same five pieces every time:

```
frontend/src/
├── types/<feature>.ts        TypeScript versions of the backend's schemas
├── lib/<feature>-api.ts       plain functions that call the backend (uses axios)
├── hooks/<feature>/           TanStack Query hooks wrapping those API calls
├── components/<feature>/      the UI pieces specific to that feature
└── app/<feature>/...          the actual pages (Next.js routes)
```

So if you want to see everything involved in, say, coding challenges, it's always `types/challenge.ts`, `lib/challenges-api.ts`, `hooks/challenges/`, `components/challenges/`, `app/(dashboard)/challenges/`.

---

## Walking through an interview, and what makes each part work

This follows the actual path someone takes through the app — for each step, what happens and exactly which files are responsible.

### 1. Sign up / log in

You register or log in on `/register` / `/login`.

- **Backend:** `POST /api/v1/auth/register` and `/login` (`api/v1/routers/auth.py` → `services/auth_service.py`) hash your password with bcrypt, create a row in the `users` table, and return an **access token** (15 min, stateless JWT) and a **refresh token** (7 days, stored server-side only as a SHA-256 hash — the raw token is shown to you once and never saved).
- **Frontend:** the form (`app/register/page.tsx`) calls `lib/auth-api.ts`, which stores the tokens in a Zustand store (`store/auth.ts`). Every subsequent request goes through `lib/api.ts`'s axios instance, which attaches your access token automatically and — this is the important part — if a request ever comes back `401` (expired token), it silently calls `/auth/refresh` in the background and retries your original request, so you're never randomly logged out mid-action.

### 2. Upload a resume

On `/resumes`, you drag a PDF in.

- **Frontend:** `components/resumes/ResumeUploadZone.tsx` (built on `react-dropzone`) validates it's a PDF under 10MB *before* even sending it, then `hooks/resumes/useUploadResume.ts` posts it.
- **Backend:** `POST /api/v1/resumes` (`resume_service.py`) saves the file, creates a `resumes` row, and immediately returns `202 Accepted` — **the AI analysis happens in a background task**, not before responding, so you're not stuck waiting on the upload screen. `utils/pdf_parser.py` extracts the raw text, which then goes into a prompt (`ai/prompts/resume.py`) asking Claude to pull out skills / experience / education / a summary as JSON.
- **Frontend again:** since the analysis is async, `hooks/resumes/polling.ts` makes the resume list and detail page **poll every 3 seconds** (via TanStack Query's `refetchInterval`) until the resume's `is_analyzed` flag flips to true — that's what makes the status badge go from "Processing" to "Analyzed" without you refreshing the page. If it's still processing after 90 seconds, `components/resumes/stall.ts` flags it as stalled and offers a manual retry button.

### 3. Start an interview session

On `/interviews`, "New Session" opens `components/interviews/CreateSessionDialog.tsx` — pick a type, difficulty, and optionally one of your (already-analyzed) resumes.

- **Backend:** `POST /api/v1/interviews/sessions` (`interview_service.py`) creates an `interview_sessions` row with `status: active`.

### 4. Answer AI-generated questions

This is the core loop, on `/interviews/[id]`:

- **Generating a question:** `POST /api/v1/interviews/sessions/{id}/questions` builds a prompt (`ai/prompts/interview.py`) that includes the session's type/difficulty (and your resume's skills, if one's linked) and asks Claude for one question as JSON. `ai/parsers.py` turns Claude's raw text response back into a typed `QuestionOutput`.
- **The countdown timer:** `hooks/interviews/useCountdown.ts` runs a plain `setInterval` — 180 seconds per question. If it hits zero, whatever's currently in the textarea auto-submits (`components/interviews/AnswerForm.tsx`), the same as if you'd clicked Submit yourself.
- **Grading the answer:** `POST /api/v1/interviews/sessions/{id}/questions/{qid}/answers` sends your answer text to Claude with a grading prompt (`ai/prompts/feedback.py`) asking for an overall score plus separate technical/communication/correctness scores, strengths, weaknesses, and suggestions — all parsed back into a structured `FeedbackOutput`.
- **The state machine:** the frontend room page (`app/(dashboard)/interviews/[id]/page.tsx`) doesn't track "what state am I in" itself — it derives it every render from `components/interviews/room-state.ts`, purely from whether the most recent question has an answer yet. That's what decides whether you see the answer form, the feedback card, or a "Next question" button.

### 5. End the interview and see the summary

"End interview" calls `POST /api/v1/interviews/sessions/{id}/complete`, which averages every answer's score into one `overall_score` and marks the session `completed`. The summary page (`app/(dashboard)/interviews/[id]/feedback/page.tsx`) then calls `GET /api/v1/interviews/sessions/{id}/feedback`, which is the one endpoint that returns every question, your answer, and the full feedback for each — reused for both "what happened in this session" and (as you'll see next) for analytics.

### 6. Practice coding challenges (separate from interviews)

On `/challenges`, you pick a problem, write code in a real Monaco editor (`components/challenges/CodeEditor.tsx`), and submit.

- **Backend:** `POST /api/v1/challenges/{id}/attempts` sends your code plus the problem's description/examples/constraints to Claude (`ai/prompts/coding.py`), asking for correctness/efficiency/style scores and a pass/fail verdict, parsed via `parse_code_evaluation`. Every submission is saved as a `CodingAttempt`, even if Claude's response fails to parse cleanly (it just falls back to a neutral default rather than losing your submission).
- **Frontend:** since every challenge only ships starter code for a couple of languages but the language picker always shows four (Python/JS/TS/Go), `components/challenges/starter-code.ts` fills in a placeholder comment for whichever language doesn't have real starter code for that problem.

### 7. Check your analytics

`/analytics` calls three endpoints — `GET /analytics/me/summary`, `/me/progress`, `/me/weak-topics` — which the backend builds by aggregating every completed session's scores and every piece of feedback's listed "weaknesses" across your whole history. The line chart (`components/analytics/ProgressChart.tsx`, Recharts) plots `overall_score` against each session's completion date; the weak-topics list is just a frequency count of which weaknesses come up most often across all your feedback.

---

## Running it locally

```bash
# Backend
cd backend
docker compose -f docker/docker-compose.yml up -d postgres redis
cp .env.example .env   # then fill in SECRET_KEY and ANTHROPIC_API_KEY
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`, register an account, and go through the flow above for real.

See `CLAUDE.md` for the full architecture reference and conventions, and `docs/deployment.md` for putting this live on Railway (backend) + Vercel (frontend).
