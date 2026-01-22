#!/bin/bash
set -e
cd "$(dirname "$0")/../backend"

if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

if [ ! -f "venv/.installed" ]; then
  echo "Installing dependencies..."
  pip install -r requirements.txt
  touch venv/.installed
fi

export $(cat .env.dev | xargs)

case "${1:-run}" in
  run)
    echo "🚀 Starting backend (port 8040)..."
    uvicorn app.main:app --reload --port 8040 --host 0.0.0.0
    ;;
  migrate)
    echo "🔄 Running migrations..."
    alembic upgrade head
    ;;
  seed)
    echo "🌱 Seeding database..."
    python -m app.scripts.seed
    ;;
  *)
    echo "Usage: $0 {run|migrate|seed}"
    exit 1
    ;;
esac
