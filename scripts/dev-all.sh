#!/bin/bash
set -e
SCRIPT_DIR="$(dirname "$0")"

echo "🚀 Starting full development environment..."
echo ""
echo "1. DB:       localhost:5444"
echo "2. Backend:  localhost:8040"
echo "3. Mobile:   localhost:3034"
echo "4. Admin:    localhost:3033"
echo ""

$SCRIPT_DIR/dev-db.sh up

echo ""
echo "✅ DB started. Now run in separate terminals:"
echo ""
echo "  ./scripts/dev-backend.sh"
echo "  ./scripts/dev-frontend.sh mobile"
echo "  ./scripts/dev-frontend.sh admin  (optional)"
