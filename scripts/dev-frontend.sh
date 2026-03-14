#!/bin/bash
set -e
cd "$(dirname "$0")/../frontend"

echo "🖥️  Starting frontend (port 3033)..."
pnpm dev
