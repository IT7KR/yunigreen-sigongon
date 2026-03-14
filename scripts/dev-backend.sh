#!/bin/bash
set -e
cd "$(dirname "$0")/../backend"

if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

PYTHON="$(pwd)/venv/bin/python"

if [ ! -f "venv/.installed" ]; then
  echo "Installing dependencies..."
  venv/bin/pip install -r requirements.txt
  touch venv/.installed
fi

set -a
source .env.dev
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  probe_port() {
    (echo >"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
  }

  if probe_port 5444; then
    export DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5444/sigongcore"
  elif probe_port 5437; then
    export DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5437/sigongcore"
  else
    echo "⚠️  No local PostgreSQL detected on 5444 or 5437. Run ./scripts/dev-db.sh up or docker compose up -d db."
    export DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5444/sigongcore"
  fi
fi

echo "🗄️  Using database: ${DATABASE_URL}"

case "${1:-run}" in
  run)
    echo "🚀 Starting backend (port 8040)..."
    "$PYTHON" -m uvicorn app.main:app --reload --port 8040 --host 0.0.0.0
    ;;
  migrate)
    echo "🔄 Running migrations..."
    "$PYTHON" -m alembic upgrade head
    ;;
  seed)
    echo "🌱 Seeding database..."
    "$PYTHON" -m app.scripts.seed
    ;;
  *)
    echo "Usage: $0 {run|migrate|seed}"
    exit 1
    ;;
esac
