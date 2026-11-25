# Orbit — Daily Task & Productivity Tracker

A customizable task manager: Django REST backend, React + Tailwind + Motion frontend, any SQL database via `DATABASE_URL`.

```
backend/                 Django 5 + Django REST Framework
  config/                settings (env-driven), urls, error handler
  accounts/              auth (session + CSRF), UserPreference model, starter workflow
  tasks/                 Task, Status, Priority, Category, Project + stats API + tests
frontend/                Vite + React 19 + Tailwind v4 + Motion
  src/store/             app state, optimistic updates, API sync
  src/components/        ui kit, layout shell, task views (list / grid / kanban), editor
  src/pages/             Dashboard, Tasks, Insights, Settings, Auth
```

## Setup

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL` — your connection string, e.g. `postgres://USER:PASSWORD@HOST:5432/DBNAME`.
  Empty = local SQLite (development only). Set `DB_SSL_REQUIRE=true` for hosted Postgres that needs TLS.
- `DJANGO_SECRET_KEY` — a long random string (`python -c "import secrets;print(secrets.token_urlsafe(50))"`).

```powershell
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver
```

### 2. Frontend (dev, with hot reload)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — `/api` is proxied to Django on port 8000.

### Production build

```powershell
cd frontend
npm run build
```

Django then serves the built app itself at http://localhost:8000 (assets under `/static/`). For deployment set
`DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `DATABASE_URL`, optionally
`DJANGO_SSL_REDIRECT=true` and `DJANGO_HSTS_SECONDS`, then run `python manage.py collectstatic` and serve
`config.wsgi` with a WSGI server (gunicorn / waitress).

### Deploy the backend to Render

Create a **Web Service** from this repo with:

- **Build command:** `pip install -r backend/requirements.txt && python backend/manage.py collectstatic --noinput`
- **Start command:** `cd backend && python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- **Environment:** `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY` (long random string), `DATABASE_URL` (your Postgres URL, e.g. from Neon),
  `DB_SSL_REQUIRE=true`, `DJANGO_ALLOWED_HOSTS=<service>.onrender.com`, `DJANGO_CSRF_TRUSTED_ORIGINS=https://<your-worker>.workers.dev`.

The start command exits immediately if `DATABASE_URL` is missing or the database can't be reached.

### Deploy the frontend to Cloudflare Workers (free plan)

The repo deploys from GitHub with Cloudflare **Workers Builds** (Workers & Pages → Create → Import a repository).
Config lives in `wrangler.toml`, `package.json` and `.node-version`:

- **Project name:** `orbit` (must match `name` in `wrangler.toml`) · **Build command:** leave empty · **Deploy command:** `npx wrangler deploy` (the default) · **Root directory:** `/`.
  `wrangler deploy` builds the React app itself (`[build]` in `wrangler.toml`) and uploads `frontend/dist` as static assets.
- **Variable:** in the Worker's Settings → Variables and Secrets, add `BACKEND_URL` = the public URL of your deployed Django backend
  (e.g. `https://orbit-api.example.com`). Cloudflare can't run Django, so host the backend elsewhere (Render, Railway, a VPS…).
  `cloudflare/worker.js` proxies `/api/*`, `/admin/*` and `/static/*` to it, so the app stays same-origin and session + CSRF cookies keep working.
  Without `BACKEND_URL` the app loads but every API call returns 503.
- On the backend, add your Worker URL to `DJANGO_CSRF_TRUSTED_ORIGINS` (e.g. `https://orbit.<your-subdomain>.workers.dev`) and the backend's own host to `DJANGO_ALLOWED_HOSTS`.
- Local check: `npm install` at the repo root, then `npm run dev` (Worker on http://localhost:8787) or `npm run deploy`.

### Tests

```powershell
cd backend
.venv\Scripts\python.exe manage.py test
```

## Features

- Tasks with status, priority, category, project, due date + time, reminders; optimistic create / edit / complete / delete (with undo).
- Views: List (drag to reorder, grouped by day in Upcoming, overdue split in Today), Grid, Kanban (drag between status columns).
- Search, filters (status / priority / category), sorting, show/hide completed.
- Dashboard widgets (daily goal ring, overview, up next, this week chart, overdue, next 7 days, categories, priorities) — reorder and toggle, saved to your account.
- Insights: completions per day (week / month / 30 days), goal days hit, streaks, status split, category and priority breakdowns — computed server-side in your time zone.
- Settings (all persisted): profile, daily goal, week start, default view, theme (dark / light / system), accent color (presets or custom), density, reduced motion, custom statuses (each mapped to Open / Active / Done), priorities (rename, recolor, reorder), categories (icon + color), projects (category, description, archive), dashboard layout, reminders (default lead time, sound, system notifications, overdue nudge), password change, account deletion.
- Keyboard: `N` new task, `Ctrl+Enter` save in the editor.

## Security notes

Session cookies (HttpOnly, SameSite=Lax) + CSRF on every write, per-user query scoping on every endpoint, related
objects validated to belong to the requesting user, Django password validators, throttled auth endpoints, secrets
only from environment variables.

Reminders fire while the app is open in a browser tab (there is no background push service).
