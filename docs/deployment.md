# Deployment runbook — Railway (backend) + Vercel (frontend)

This is a step-by-step guide for the actual account-level deploy steps for F6.
Everything on the code side (Dockerfile, `railway.toml`, env var wiring, CORS
config) is already in place — this is just where to click and what to set.

There's a two-way dependency between the two services: Railway's URL is
needed before Vercel's env var can be set, and Vercel's URL is needed before
Railway's CORS can be finalized. Do it in this order.

## 1. Railway (backend)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select `ai-interview-simulator`.
   Railway auto-detects `railway.toml` at the repo root, which points it at `backend/docker/Dockerfile` (build context `backend/`). No extra config needed for the build itself.
2. **Add Postgres**: in the project, "+ New" → Database → PostgreSQL. Railway auto-injects a `DATABASE_URL` reference variable — but the app expects the `asyncpg` driver prefix, so on the backend service's Variables tab set:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   then edit it to swap the scheme to `postgresql+asyncpg://` (Railway's default is plain `postgresql://`, which asyncpg won't accept as-is) — or just reference the individual `PG*` variables Railway exposes and compose the URL yourself. Confirm by checking the deploy logs for a successful `alembic upgrade head` on first boot (it's the first thing `railway.toml`'s `startCommand` runs).
3. **Add Redis**: "+ New" → Database → Redis. Set on the backend service:
   ```
   REDIS_URL=${{Redis.REDIS_URL}}
   ```
4. **Set the remaining production env vars** on the backend service (see `backend/.env.example` for the full list):
   - `SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_hex(32))"`. Must **not** be the placeholder value, or the app's startup validation (`_validate_settings()`) will `sys.exit(1)`.
   - `ANTHROPIC_API_KEY` — your real key. Must not start with `sk-ant-your`, same startup-validation reason.
   - `CORS_ORIGINS` — start with `["http://localhost:3000"]` for now; you'll add the Vercel URL here in step 3 below.
   - `APP_NAME`, `DEBUG=false`, `API_PREFIX=/api/v1`, `ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=15`, `REFRESH_TOKEN_EXPIRE_DAYS=7`, `UPLOAD_DIR=./uploads`, `MAX_UPLOAD_SIZE_MB=10`, `RATE_LIMIT_ENABLED=true`.
5. Deploy. Railway assigns a public URL like `https://ai-interview-simulator-production.up.railway.app` — copy it, you need it for step 2.
6. Sanity check: `curl https://<railway-url>/api/v1/health` should return `{"status":"ok","db":"ok","redis":"ok"}`.

## 2. Vercel (frontend)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the same GitHub repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Next.js — no `vercel.json` needed for a standard build.
3. Set the one env var the frontend needs:
   ```
   NEXT_PUBLIC_API_URL=https://<railway-url-from-step-1>
   ```
   (no trailing slash — `lib/api.ts` appends `/api/v1` itself).
4. Deploy. Vercel assigns a URL like `https://ai-interview-simulator.vercel.app` — copy it.

## 3. Close the loop — update Railway's CORS

Back on Railway, update the backend service's `CORS_ORIGINS` to include the real Vercel URL:
```
CORS_ORIGINS=["https://ai-interview-simulator.vercel.app"]
```
Redeploy/restart the Railway service for the change to take effect.

## 4. Auto-deploy on push

Both services auto-deploy on push to `master` once connected — no extra CI wiring needed for that part. The existing `.github/workflows/frontend-ci.yml` and `ci.yml` (backend) still run type-check/lint/tests on every push; they're independent of the Railway/Vercel auto-deploy hooks.

## 5. Run the E2E smoke test against production

Once both are live:
```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://ai-interview-simulator.vercel.app npm run test:e2e
```
Or trigger the `E2E Smoke Test` GitHub Actions workflow manually (Actions tab → "E2E Smoke Test" → "Run workflow") with the Vercel URL as input — see `.github/workflows/e2e-smoke.yml`.

The test registers a fresh throwaway user (timestamp-based email), uploads a sample resume, creates and completes an interview session (real Claude API calls — expect it to take 30–60s), and checks the analytics page reflects the completed session. It's written to be idempotent and safe to re-run against production at any time.
