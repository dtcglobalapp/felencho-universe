#!/bin/sh
# Compile ONLY the isolated Felencho Light worktree with nonfunctional
# placeholder Supabase values. No keys are read, created, or written to disk.
# Do NOT use this build for deployment or for real Felencho Brain API calls.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
if [ ! -f "vendor/felencho-light/src/presence/Scene.tsx" ]; then
  echo "Not the Felencho Light worktree" >&2
  exit 1
fi
echo "Felencho Light isolated compile: nonfunctional .invalid Supabase configuration."
echo "No database connection is expected or authorized."
# Avoid overriding real credentials from an existing shell. Supply explicit
# dummy values only for this build subprocess; never write a .env file.
NEXT_PUBLIC_SUPABASE_URL="https://felencho-light-build.invalid" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="local-build-only-no-access" \
SUPABASE_SERVICE_ROLE_KEY="local-build-only-no-access" \
npm run build
