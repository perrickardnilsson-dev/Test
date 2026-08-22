# Deploy ERP (always-on demo)

This guide gets you a **stable HTTPS URL** that stays up without a Cursor agent or temporary Cloudflare tunnel.

Supported targets:

- **Railway** — easiest (app + Postgres in one project)
- **Fly.io** — good if you already use Fly

Both use the `Dockerfile` in this folder and run SQL migrations automatically on startup.

---

## Prerequisites

- GitHub repo with `/erp` (this monorepo)
- A strong `BETTER_AUTH_SECRET` (e.g. `openssl rand -base64 32`)

---

## Option A — Railway (recommended)

### 1. Create project

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select this repository
3. Open the new service → **Settings** → set **Root Directory** to `erp`

### 2. Add Postgres

1. In the same project: **+ New** → **Database** → **PostgreSQL**
2. Open the **app** service → **Variables** → **Add Reference** → `DATABASE_URL` from Postgres

### 3. Set auth variables

After the first deploy, Railway gives you a public domain like `https://your-app.up.railway.app`.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Reference from Postgres plugin |
| `BETTER_AUTH_SECRET` | Long random string |
| `BETTER_AUTH_URL` | `https://your-app.up.railway.app` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Same URL (optional but fine) |

Redeploy after setting `BETTER_AUTH_URL`.

### 4. Open the app

- Login: `https://your-app.up.railway.app/logga-in`
- Register → create organisation → seed pitch data on **Översikt**
- Mobile: `https://your-app.up.railway.app/{orgSlug}/mobilt`

Railway keeps the service running. Free tier may sleep on inactivity; paid hobby tier stays warmer.

---

## Option B — Fly.io

### 1. Install CLI and launch

```bash
cd erp
fly auth login
fly launch --no-deploy
```

- Choose a unique app name (edit `app` in `fly.toml` if needed)
- Pick region `arn` (Stockholm) or closest to testers
- **Do not** add a Postgres yet when prompted — we'll attach one next

### 2. Postgres

```bash
fly postgres create --name nordic-erp-db --region arn
fly postgres attach nordic-erp-db
```

This sets `DATABASE_URL` on the app.

### 3. Secrets

```bash
fly secrets set \
  BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  BETTER_AUTH_URL="https://YOUR-APP-NAME.fly.dev"
```

Replace `YOUR-APP-NAME` with your Fly app name.

### 4. Deploy

```bash
fly deploy
fly open /logga-in
```

`fly.toml` sets `min_machines_running = 1` so the demo stays up.

---

## How it works

| Step | What happens |
|---|---|
| **Build** | `npm run build` → Next.js standalone output |
| **Start** | `scripts/start.mjs` runs `scripts/migrate.mjs`, then `node server.js` |
| **Migrations** | All `core/db/migrations/*.sql` applied once, tracked in `schema_migrations` |

Skip migrations on start (e.g. separate CI job):

```env
SKIP_MIGRATIONS=1
```

Run migrations manually:

```bash
npm run db:migrate:deploy
```

---

## Local production smoke test

```bash
cd erp
npm install
npm run db:up
npm run db:migrate:deploy
npm run build
BETTER_AUTH_URL=http://localhost:3001 npm run start:prod
```

Or with Docker:

```bash
cd erp
docker build -t nordic-erp .
docker run --rm -p 3001:3001 \
  -e DATABASE_URL=postgresql://erp:erp@host.docker.internal:5432/erp \
  -e BETTER_AUTH_SECRET=local-test-secret \
  -e BETTER_AUTH_URL=http://localhost:3001 \
  nordic-erp
```

On Linux use your host IP instead of `host.docker.internal`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Login redirects fail | `BETTER_AUTH_URL` must exactly match public HTTPS URL |
| `Invalid origin` | Add URL to `BETTER_AUTH_TRUSTED_ORIGINS` |
| DB connection errors | Check `DATABASE_URL`; wait for Postgres to be ready |
| Migrations fail | Check deploy logs; fix DB permissions; re-run `db:migrate:deploy` |
| Camera on phone | HTTPS is required — both Railway and Fly provide it |

---

## Cost ballpark

- **Railway**: hobby ~$5/mo + small Postgres usage
- **Fly.io**: small VM + Postgres volume, often similar for a demo

Both beat temporary tunnels for sharing with friends over days or weeks.
