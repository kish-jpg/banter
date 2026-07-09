#!/usr/bin/env bash
# Deploys the coaching function to Supabase CLOUD (not the gitignored self-hosted
# stack - see smoke-coaching.sh for that). Backend/functions/coaching stays the
# tracked source of truth; supabase/functions/coaching is a sync target only.
#
# Prereqs (one-time):
#   supabase login                     # or SUPABASE_ACCESS_TOKEN env
#   supabase link --project-ref <ref>  # after creating the cloud project
#   supabase secrets set GEMINI_API_KEY=<key>
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE="$REPO_ROOT/Backend/functions/coaching"
DEST="$REPO_ROOT/supabase/functions/coaching"

mkdir -p "$DEST"
rm -rf "$DEST"
cp -r "$SOURCE" "$DEST"

cd "$REPO_ROOT"
supabase functions deploy coaching

echo "deploy-cloud.sh: deployed. Smoke test:"
echo '  curl -X POST "https://<ref>.supabase.co/functions/v1/coaching" \'
echo '    -H "Authorization: Bearer <anon key>" -H "Content-Type: application/json" \'
echo '    -d "{\"messages\":[{\"speaker\":\"match\",\"text\":\"hey\",\"order\":0}]}"'
