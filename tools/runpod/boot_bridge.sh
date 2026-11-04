#!/usr/bin/env bash
# RunPod Bridge bootstrap: safe preflight and one read-only worker.
# Run *after* existing SSH/Jupyter services, via an explicitly reviewed Pod hook.
set -euo pipefail
BASE=/workspace/felencho-runpod-bridge
case "${1:-}" in
  --check) MODE=check ;;
  "") MODE=start ;;
  *) echo 'Usage: boot_bridge.sh [--check]' >&2; exit 64 ;;
esac
if [[ ! -f "$BASE/tools/runpod/cold_start_readiness.py" ]]; then
  echo 'Felencho Bridge: missing readiness checker.' >&2
  exit 3
fi
# This script only emits redacted booleans, never the secret value.
python3 "$BASE/tools/runpod/cold_start_readiness.py"
if [[ "$MODE" == check ]]; then
  echo 'Felencho Bridge: preflight OK. No daemon started.'
  exit 0
fi
# Do not git pull or modify the ML engine here. The Pod's reviewed startup
# hook should spawn this as a *separate* service, without replacing PID 1.
cd "$BASE"
exec flock -n /tmp/felencho-runpod-bridge.lock python3 -u tools/runpod/bridge.py --interval 30
