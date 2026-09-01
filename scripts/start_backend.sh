#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.example to .env and set DATABASE_URL." >&2
  exit 1
fi

cd "$PROJECT_ROOT/backend"
exec "$PROJECT_ROOT/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --env-file "$ENV_FILE"
