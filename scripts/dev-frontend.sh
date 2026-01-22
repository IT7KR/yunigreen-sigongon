#!/bin/bash
set -e
cd "$(dirname "$0")/../frontend"

case "${1:-mobile}" in
  mobile)
    echo "📱 Starting mobile app (port 3034)..."
    pnpm dev:mobile
    ;;
  admin)
    echo "🖥️  Starting admin app (port 3033)..."
    pnpm dev:admin
    ;;
  *)
    echo "Usage: $0 {mobile|admin}"
    exit 1
    ;;
esac
