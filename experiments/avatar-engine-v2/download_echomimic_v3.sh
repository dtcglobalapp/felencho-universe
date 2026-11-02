#!/usr/bin/env bash
# Felencho Actor Engine: download EchoMimic V3 CODE only to persistent RunPod storage.
# Does not install dependencies, download multi-GB weights, launch inference, or call LemonSlice.
set -euo pipefail

ROOT="${FELENCHO_VOLUME_ROOT:-/workspace}"
DEST="${ROOT}/felencho-avatar-engine/experiments/echomimic_v3"
REPO="https://github.com/antgroup/echomimic_v3.git"

if [[ ! -d "$ROOT" ]]; then
  echo "ERROR: Storage root not found: $ROOT"; exit 2
fi
if ! mountpoint -q "$ROOT"; then
  echo "ERROR: $ROOT is not a verified mounted volume. Refusing to install into ephemeral disk."
  echo "Verify the RunPod Network Volume is mounted at /workspace."
  exit 2
fi
if [[ ! -x "$(command -v git)" ]]; then
  echo "ERROR: git is not available."; exit 2
fi
if [[ -e "$DEST" ]]; then
  echo "ERROR: Destination already exists, refusing to overwrite: $DEST"
  echo "Inspect manually first; no automatic updates or deletions."
  exit 3
fi
mkdir -p "$(dirname "$DEST")"
echo "Downloading official EchoMimic V3 source code only..."
git clone --depth 1 "$REPO" "$DEST"
git -C "$DEST" rev-parse HEAD | tee "$DEST/FELENCHO_UPSTREAM_COMMIT.txt"
echo "SUCCESS: official V3 code available at $DEST"
echo "No weights installed; LemonSlice/LiveKit production not modified."
