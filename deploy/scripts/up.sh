#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Edit secrets, then re-run this script." >&2
  exit 1
fi

if ! grep -q "CHANGE_ME" .env; then
  :
else
  echo "Replace every CHANGE_ME value in .env before starting." >&2
  exit 1
fi

if [[ -f images.tar.gz ]]; then
  ./load.sh
fi

docker compose -f docker-compose.prod.yml up -d
echo "Intrasite is starting on http://localhost:${INTRASITE_PORT:-8080}"
echo "Open the site, click Intrasite (bottom right), and sign in with INTRASITE_ADMIN_EMAIL."
