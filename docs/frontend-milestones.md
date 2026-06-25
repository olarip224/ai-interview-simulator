# Frontend Milestone Structure — AI Interview Simulator

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query (React Query) |
| Auth state | Zustand |
| Code editor | Monaco Editor |
| HTTP client | axios (instance with interceptor) |
| Testing | Vitest + Testing Library + Playwright |
| Deploy | Vercel |

---

## Milestone Map

```
F1: Scaffold + Auth         ← everything else depends on this
F2: Resume System           ← upload, analyze, view
F3: Interview Simulator     ← the core product loop
F4: Coding Challenges       ← standalone practice feature
F5: Analytics Dashboard     ← read-only, depends on F3 data
F6: Polish + Deploy         ← production-ready frontend
```

## Dependency Order

```
F1 → F2, F3, F4, F5 (all require auth)
F3 → F5 (analytics needs session data)
F1–F5 → F6 (deploy after features complete)
F2 and F4 are independent of each other
```

---

## F1 — Scaffold + Auth Infrastructure

**Deliverable:** A working Next.js app with login/register and protected routing. Every subsequent milestone plugs into this shell.

**Covers:**
- Project scaffold: Next.js 15, TypeScript, Tailwind, ESLint, shadcn/ui base components
- Axios instance with Authorization header injection + automatic refresh token rotation (on 401, call `POST /auth/refresh`, retry original request)
- Auth store (Zustand): `user`, `accessToken`, `login()`, `logout()`, `register()`
- `middleware.ts` for route protection (redirect unauthenticated users to `/login`)
- Pages: `/login`, `/register`, `/` (dashboard shell, empty)
- Shared layout: top nav, sidebar skeleton, user menu (logout)
- Environment config: `NEXT_PUBLIC_API_URL`

**Backend endpoints consumed:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

**Exit criteria:** Can register, log in, be redirected if unauthenticated, and log out. Refresh token rotation works silently on 401.

---

## F2 — Resume System

**Deliverable:** Full resume management — upload, async analysis polling, and detail view.

**Covers:**
- `/resumes` list page with status badges (processing / analyzed / failed)
- Upload flow: drag-and-drop PDF input, POST to API, redirect to list
- Status polling: TanStack Query `refetchInterval` until `status !== "processing"`
- `/resumes/[id]` detail page: parsed data (skills, experience, education) + Claude's analysis feedback
- Delete resume with confirmation dialog
- Empty state when no resumes uploaded

**Backend endpoints consumed:**
- `POST /api/v1/resumes`
- `GET /api/v1/resumes`
- `GET /api/v1/resumes/{id}`
- `POST /api/v1/resumes/{id}/analyze`
- `DELETE /api/v1/resumes/{id}`

**Exit criteria:** Upload a PDF, watch status update to "analyzed" without a page reload, read the Claude feedback.

---

## F3 — Interview Simulator

**Deliverable:** The core product experience — create a session, work through AI-generated questions, receive feedback, and review the summary.

**Covers:**
- `/interviews` session list (paginated, status filter)
- Create session modal: choose type (behavioral/technical), difficulty, optionally link a resume
- `/interviews/[id]` — interview room:
  - Display current question
  - Text area for answer + optional timer
  - Submit → show inline feedback card (score, strengths, weaknesses, suggestions)
  - "Next question" button (generates next via Claude)
  - "End interview" button → complete session
- `/interviews/[id]/feedback` — post-session summary: all Q&A pairs, aggregate scores, overall feedback
- Session status handling: ACTIVE / COMPLETED / ABANDONED

**Backend endpoints consumed:**
- `POST /api/v1/interviews/sessions`
- `GET /api/v1/interviews/sessions`
- `GET /api/v1/interviews/sessions/{id}`
- `POST /api/v1/interviews/sessions/{id}/questions`
- `POST /api/v1/interviews/sessions/{id}/questions/{qid}/answers`
- `POST /api/v1/interviews/sessions/{id}/complete`
- `GET /api/v1/interviews/sessions/{id}/feedback`

**Exit criteria:** Complete a full interview loop — create, generate questions, submit answers, end, view feedback summary.

---

## F4 — Coding Challenges

**Deliverable:** A standalone practice section with an in-browser code editor and AI-powered evaluation.

**Covers:**
- `/challenges` browse page: paginated list, filter by difficulty and tag
- `/challenges/[id]` detail: problem description, examples, constraints, starter code
- Embedded Monaco Editor with language selector (Python / JavaScript / TypeScript / Go)
- Submit code → show AI evaluation: overall/correctness/efficiency/style scores + feedback + strengths/weaknesses/suggestions
- `/challenges/me/attempts` history page with scores per attempt
- Attempt detail page: code replay + full feedback

**Backend endpoints consumed:**
- `GET /api/v1/challenges` (no auth required)
- `GET /api/v1/challenges/{id}` (no auth required)
- `POST /api/v1/challenges/{id}/attempts`
- `GET /api/v1/challenges/me/attempts`
- `GET /api/v1/challenges/me/attempts/{id}`

**Exit criteria:** Browse challenges, write code in the editor, submit, and see AI scores and feedback.

---

## F5 — Analytics Dashboard

**Deliverable:** A read-only insights view showing improvement over time.

**Covers:**
- `/analytics` dashboard page
- Summary stats cards: total sessions, avg score, total questions answered
- Progress chart: score over time (line chart, by date)
- Weak topics section: ranked list of topics with low scores + suggestion to practice
- Empty state when user has no session history

**Backend endpoints consumed:**
- `GET /api/v1/analytics/me/summary`
- `GET /api/v1/analytics/me/progress`
- `GET /api/v1/analytics/me/weak-topics`

**Exit criteria:** After completing F3 interviews, analytics page shows real data with charts.

---

## F6 — Polish + Production Deploy

**Deliverable:** A production-ready frontend deployed to Vercel.

**Covers:**
- Loading skeletons on all data-fetching pages (no layout shift)
- Error boundaries: graceful fallback for API failures, 429 rate limit toasts, 500 server error pages
- Responsive design: all pages usable on mobile
- Accessibility: keyboard navigation, ARIA labels, focus management in modals
- `NEXT_PUBLIC_API_URL` pointed at Railway-deployed backend
- Vercel deployment: connect GitHub repo, set env vars, auto-deploy on push to master
- E2E smoke test (Playwright): register → upload resume → run interview → view analytics

**Exit criteria:** App is live on a public URL. Smoke test passes against production.

---

## Pages Summary

| Milestone | Routes |
|---|---|
| F1 | `/login`, `/register`, `/` |
| F2 | `/resumes`, `/resumes/[id]` |
| F3 | `/interviews`, `/interviews/[id]`, `/interviews/[id]/feedback` |
| F4 | `/challenges`, `/challenges/[id]`, `/challenges/me/attempts`, `/challenges/me/attempts/[id]` |
| F5 | `/analytics` |
| F6 | all existing, polished + deployed |
