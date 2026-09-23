#!/usr/bin/env bash
# Start local server + Cloudflare quick tunnel (bypasses Vercel anonymous 403).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-4173}"
mkdir -p /tmp

if [[ ! -x /tmp/cloudflared ]]; then
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
  chmod +x /tmp/cloudflared
fi

if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  npx tsx scripts/local-server.mjs &
  echo $! >/tmp/nexus-server.pid
  for _ in $(seq 1 20); do
    curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null && break
    sleep 0.5
  done
fi

/tmp/cloudflared tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate 2>&1 | tee /tmp/cloudflared.log
