#!/usr/bin/env bash
# Long-running Felencho RunPod bridge launcher; only starts authorized read-only jobs.
# Intended for execution by a container startup hook AFTER a RunPod Account Secret
# is injected into FELENCHO_RUNPOD_GITHUB_TOKEN.
set -euo pipefail
BASE=/workspace/felencho-runpod-bridge
if [[ -z "${FELENCHO_RUNPOD_GITHUB_TOKEN:-}" || "${FELENCHO_RUNPOD_GITHUB_TOKEN}" == '{{'* ]]; then
  echo 'Felencho Bridge: RunPod account secret is not available; refusing to start.' >&2
  exit 2
fi
if [[ ! -f "$BASE/tools/runpod/bridge.py" ]]; then
  echo 'Felencho Bridge: code checkout unavailable; refusing to start.' >&2
  exit 3
fi
cd "$BASE"
# flock ensures at most one polling bridge per container.
exec flock -n /tmp/felencho-runpod-bridge.lock python3 -u tools/runpod/bridge.py --interval 30
