#!/usr/bin/env bash
# Developer-run live smoke test for the coaching edge function against the
# self-hosted Supabase stack + real Gemini API. NEVER run in CI (no docker,
# no live GEMINI_API_KEY secret there - see Backend/README.md). Requires:
#   - Docker Desktop running
#   - infra/supabase/docker stack up (this script does not start Postgres/Kong/etc,
#     only restarts the functions container after a code sync)
#   - GEMINI_API_KEY set in infra/supabase/docker/.env (the edge-function env,
#     NOT this script's own shell env)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPABASE_DOCKER="$REPO_ROOT/infra/supabase/docker"
SYNC_TARGET="$SUPABASE_DOCKER/volumes/functions/coaching"

if ! command -v docker &> /dev/null; then
  echo "smoke-coaching.sh: docker not found on PATH. Install/start Docker Desktop, then re-run." >&2
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "smoke-coaching.sh: docker daemon not reachable. Start Docker Desktop, then re-run." >&2
  exit 1
fi

if [ ! -d "$SUPABASE_DOCKER" ]; then
  echo "smoke-coaching.sh: $SUPABASE_DOCKER not found (infra/supabase/ is gitignored - clone/init it first per Backend/README.md)." >&2
  exit 1
fi

echo "Syncing Backend/functions/coaching/ -> $SYNC_TARGET (tracked source is authoritative)"
mkdir -p "$SYNC_TARGET"
cp -r "$REPO_ROOT/Backend/functions/coaching/." "$SYNC_TARGET/"

echo "Restarting functions container to pick up the synced code..."
(cd "$SUPABASE_DOCKER" && docker compose restart functions)

echo "Waiting for functions container to come back up..."
sleep 3

ANON_KEY="$(grep -E '^ANON_KEY=' "$SUPABASE_DOCKER/.env" | cut -d= -f2-)"
if [ -z "$ANON_KEY" ]; then
  echo "smoke-coaching.sh: could not read ANON_KEY from $SUPABASE_DOCKER/.env" >&2
  exit 1
fi

echo "POSTing a sample transcript to http://localhost:8000/functions/v1/coaching ..."
curl -sS -X POST "http://localhost:8000/functions/v1/coaching" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "messages": [
      { "speaker": "match", "text": "hey! how'\''s your week going", "order": 0 },
      { "speaker": "user", "text": "pretty good, just got back from a hike actually", "order": 1 },
      { "speaker": "match", "text": "oh nice, where'\''d you go", "order": 2 }
    ],
    "tone": "playful"
  }'
echo
