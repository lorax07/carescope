#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

TAG="${CARESCOPE_IMAGE_TAG:-latest}"
OUT_DIR="${1:-"$ROOT/dist/intrasite-package"}"
STAMP="$(date -u +%Y%m%d)"
ARCHIVE="$ROOT/dist/carescope-intrasite-fde-${STAMP}.tar.gz"

mkdir -p "$OUT_DIR" "$ROOT/dist"

echo "Building production images…"
docker compose -f docker-compose.prod.yml build

echo "Saving images…"
docker save \
  "carescope/intrasite-web:${TAG}" \
  "carescope/intrasite-api:${TAG}" \
  postgres:16-alpine \
  | gzip > "$OUT_DIR/images.tar.gz"

cp docker-compose.prod.yml "$OUT_DIR/"
cp .env.example "$OUT_DIR/"
cp deploy/README.md "$OUT_DIR/"
cp deploy/scripts/up.sh "$OUT_DIR/"
cp deploy/scripts/load.sh "$OUT_DIR/"
chmod +x "$OUT_DIR/up.sh" "$OUT_DIR/load.sh"

mkdir -p "$OUT_DIR/deploy/docker" "$OUT_DIR/deploy/nginx"
cp deploy/docker/Dockerfile.api "$OUT_DIR/deploy/docker/"
cp deploy/docker/Dockerfile.web "$OUT_DIR/deploy/docker/"
cp deploy/nginx/nginx.conf "$OUT_DIR/deploy/nginx/"

tar -C "$OUT_DIR" -czf "$ARCHIVE" .
echo "FDE package written to $ARCHIVE"
echo "Contents staged in $OUT_DIR"
