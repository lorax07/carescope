# CareScope Intrasite deployment

Intrasite is the authenticated business control plane for CareScope. The landing-page **Intrasite** link (bottom right) opens `/intrasite`.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + Vite (existing designer SPA) |
| Backend | Node.js 22 + Express (`@carescope/workflow-api`) |
| Database | PostgreSQL 16 — **isolated database per client** |
| Authentication | Custom JWT (HMAC-SHA256) in an httpOnly cookie, with `Authorization: Bearer` fallback |

Multi-tenancy: a control-plane database (`POSTGRES_DB`, default `intrasite`) stores users and clients. Creating a client runs `CREATE DATABASE cs_<slug>` on the same Postgres server. Labs are stored only inside that client database.

## Environment variables

Copy `.env.example` to `.env` and set every value. Exact names:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CARESCOPE_IMAGE_TAG` | no | Image tag (`latest` by default) |
| `INTRASITE_PORT` | no | Host port for the web UI (`8080`) |
| `POSTGRES_USER` | yes | Postgres user (must be allowed to `CREATE DATABASE`) |
| `POSTGRES_PASSWORD` | yes | Postgres password |
| `POSTGRES_DB` | yes | Control-plane database name (`intrasite`) |
| `DATABASE_URL` | compose-built | `postgres://USER:PASSWORD@postgres:5432/DB` — set automatically in Compose |
| `INTRASITE_STORE` | yes | `postgres` in production; `memory` for local API-only tests |
| `INTRASITE_JWT_SECRET` | yes | JWT signing secret (use ≥32 random characters) |
| `INTRASITE_JWT_EXPIRES_IN` | no | Token lifetime (`12h`, `7d`, `30m`) |
| `INTRASITE_COOKIE_NAME` | no | Session cookie name (`intrasite_token`) |
| `INTRASITE_COOKIE_SECURE` | no | `true` when serving HTTPS |
| `INTRASITE_TRUST_PROXY` | no | `true` behind Nginx / a load balancer |
| `INTRASITE_CORS_ORIGIN` | no | Comma-separated browser origins if the API is on a different host |
| `INTRASITE_ADMIN_EMAIL` | yes | Bootstrap platform admin email |
| `INTRASITE_ADMIN_PASSWORD` | yes | Bootstrap platform admin password |
| `INTRASITE_ADMIN_NAME` | no | Bootstrap admin display name |
| `INTRASITE_SEED_DEMO` | no | `true` to seed Apex Diagnostics / Harbor Clinical |
| `INTRASITE_TENANT_HEADER` | no | Instance routing header (`x-tenant-id`) |
| `INTRASITE_LAB_HEADER` | no | Lab routing header (`x-lab-id`) |
| `INTRASITE_INSTANCE_HOST_PATTERN` | no | Host template (`{slug}.intrasite.local`) |
| `CARESCOPE_TENANT_ID` | no | Default workflow-engine tenant |
| `CARESCOPE_SYSTEM_USER` | no | Workflow template seed user |
| `PORT` | no | API listen port inside the container (`4000`) |
| `NODE_ENV` | no | `production` in Compose |

Instance routing: after a client is created, API calls for that tenant should send `x-tenant-id: <client-slug>` and `x-lab-id: <lab-slug>` (or use `{slug}.intrasite.local`).

## Web deployment (from this repo)

```bash
# 1. Configure secrets
cp .env.example .env
# edit .env — replace every CHANGE_ME value

# 2. Build images
docker compose -f docker-compose.prod.yml build

# 3. Tag (optional publish)
docker tag carescope/intrasite-web:latest carescope/intrasite-web:1.0.0
docker tag carescope/intrasite-api:latest carescope/intrasite-api:1.0.0

# 4. Run
docker compose -f docker-compose.prod.yml up -d

# 5. Verify
curl -sS http://localhost:8080/api/v1/intrasite/health
# Open http://localhost:8080 → Intrasite (footer, bottom right) → sign in
```

Stop with `docker compose -f docker-compose.prod.yml down`. Add `-v` only if you intend to delete tenant databases.

## Downloadable FDE package

Forward-deployed engineers can run the same stack from a tarball of pre-built images (no source tree required).

```bash
# On a build machine with Docker
chmod +x deploy/scripts/package.sh
./deploy/scripts/package.sh

# Artifact:
#   dist/carescope-intrasite-fde-YYYYMMDD.tar.gz
```

On the destination machine:

```bash
mkdir carescope-intrasite && tar -xzf carescope-intrasite-fde-YYYYMMDD.tar.gz -C carescope-intrasite
cd carescope-intrasite
cp .env.example .env
# edit .env — replace every CHANGE_ME value
chmod +x load.sh up.sh
./up.sh
```

`up.sh` loads `images.tar.gz` (web, api, and Postgres) then starts Compose. Open `http://<host>:8080`, click **Intrasite**, and sign in with `INTRASITE_ADMIN_EMAIL` / `INTRASITE_ADMIN_PASSWORD`.

## Local development (no Docker)

```bash
pnpm install
pnpm dev          # web: http://localhost:5173
pnpm dev:api      # API + in-memory Intrasite store: http://localhost:4000
```

Sign in with `admin@carescope.local` / `password` unless you override `INTRASITE_ADMIN_*`.
