#!/bin/bash
# PostgreSQL 개발 DB 실행/관리

set -e
cd "$(dirname "$0")/.."

case "${1:-up}" in
  up)
    echo "🐘 Starting PostgreSQL (port 5444)..."
    docker compose -f docker-compose.dev.yml up -d
    echo "✅ DB ready at localhost:5444"
    ;;
  down)
    echo "🛑 Stopping PostgreSQL..."
    docker compose -f docker-compose.dev.yml down
    ;;
  reset)
    echo "🗑️  Resetting PostgreSQL data..."
    docker compose -f docker-compose.dev.yml down -v
    docker compose -f docker-compose.dev.yml up -d
    echo "✅ DB reset complete"
    ;;
  logs)
    docker compose -f docker-compose.dev.yml logs -f db
    ;;
  psql)
    docker exec -it sigongcore-db psql -U postgres -d sigongcore
    ;;
  *)
    echo "Usage: $0 {up|down|reset|logs|psql}"
    exit 1
    ;;
esac
