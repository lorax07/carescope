#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -f images.tar.gz ]]; then
  echo "images.tar.gz not found. Run this script from an unpacked FDE package." >&2
  exit 1
fi

echo "Loading Docker images…"
gzip -dc images.tar.gz | docker load
echo "Images loaded."
