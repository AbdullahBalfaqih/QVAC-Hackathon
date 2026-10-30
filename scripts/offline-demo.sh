#!/usr/bin/env bash
# Linux-only proof. Requires user/network namespaces, iproute2, Python Playwright and Chromium.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export MODEL_PATH="${MODEL_PATH:-$ROOT/models/Qwen2.5-1.5B-Instruct.Q4_K_M.gguf}"
[ -f "$MODEL_PATH" ] || { echo 'Model not found. Download it first or set MODEL_PATH.' >&2; exit 1; }
for c in node unshare ip python; do command -v "$c" >/dev/null || { echo "Missing command: $c" >&2; exit 1; }; done
unshare -Urn bash -c '
  set -euo pipefail
  ip link set lo up
  export HOST=127.0.0.1 PORT=4174 ATHAR_PREVIEW=0
  node server.mjs > evidence/offline-server.log 2>&1 & server=$!
  export ATHAR_SERVER_PID="$server"
  trap "kill $server 2>/dev/null || true; wait $server 2>/dev/null || true" EXIT
  python scripts/record-offline-demo.py
'
