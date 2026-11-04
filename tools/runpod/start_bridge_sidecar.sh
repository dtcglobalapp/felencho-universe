#!/usr/bin/env bash
# Optional RunPod sidecar hook for a REVIEWED image startup.
# Invoked after SSH/Jupyter initialization. Never replaces PID 1.
# Does not pull Git, modify model files, install packages or read/write tokens.
set -euo pipefail
BASE=/workspace/felencho-runpod-bridge
BOOT="$BASE/tools/runpod/boot_bridge.sh"
LOG=/tmp/felencho-bridge-sidecar.log

if [[ ! -f "$BOOT" || -L "$BOOT" ]]; then
  echo "FAE_BRIDGE_HOOK=missing_boot_script"
  exit 3
fi

# Fail closed before creating any background process.
if ! bash "$BOOT" --check >/dev/null; then
  echo "FAE_BRIDGE_HOOK=preflight_blocked"
  exit 2
fi

# The worker itself enforces exclusive ownership with flock.
# Keep this hook independent of the existing foreground startup.
umask 077
nohup bash "$BOOT" >>"$LOG" 2>&1 </dev/null &
pid=$!
echo "FAE_BRIDGE_HOOK=launched pid=$pid"
echo "FAE_BRIDGE_HOOK=note_process_launch_is_not_authentication_proof"
