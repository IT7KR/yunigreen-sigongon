#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../backend"
if [[ -x ".venv/bin/python" ]]; then
  .venv/bin/python scripts/run_harness.py "$@"
else
  python3 scripts/run_harness.py "$@"
fi
