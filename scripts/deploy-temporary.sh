#!/usr/bin/env bash
# Deploy temporary anonymous Vercel build with Neon/Telegram/Stripe env from .env
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env (see .env.example)" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

: "${DATABASE_URL:?}"
: "${TELEGRAM_BOT_TOKEN:?}"
: "${TELEGRAM_CHAT_ID:?}"

# Strip quotes if present
DATABASE_URL="${DATABASE_URL%\'}"
DATABASE_URL="${DATABASE_URL#\'}"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"

python3 - <<'PY'
import json
from pathlib import Path
import os
cfg = json.loads(Path("vercel.json").read_text())
cfg["env"] = {
  "DATABASE_URL": os.environ["DATABASE_URL"].strip("'").strip('"'),
  "TELEGRAM_BOT_TOKEN": os.environ["TELEGRAM_BOT_TOKEN"],
  "TELEGRAM_CHAT_ID": os.environ["TELEGRAM_CHAT_ID"],
}
for key in ("STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "UZS_PER_USD", "PUBLIC_URL"):
  val = os.environ.get(key, "").strip().strip("'").strip('"')
  if val:
    cfg["env"][key] = val
Path("vercel.json").write_text(json.dumps(cfg, indent=2) + "\n")
print("Injected env into vercel.json for deploy:", sorted(cfg["env"]))
PY

cleanup() {
  python3 - <<'PY'
import json
from pathlib import Path
cfg = json.loads(Path("vercel.json").read_text())
cfg.pop("env", None)
Path("vercel.json").write_text(json.dumps(cfg, indent=2) + "\n")
print("Restored vercel.json without secrets")
PY
}
trap cleanup EXIT

npx vercel deploy --temporary --yes "$@"
