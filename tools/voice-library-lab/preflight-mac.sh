#!/bin/sh
# Safe preflight. No downloads, no server restarts, no recordings.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
test -f "vendor/felencho-light/src/presence/Scene.tsx" || { echo "ERROR: outside isolated lab" >&2; exit 1; }
PY="$HOME/felencho-qwen3-tts-lab/.venv/bin/python"
test -x "$PY" || { echo "ERROR: expected existing Qwen3-TTS MLX venv not found" >&2; exit 1; }
"$PY" tools/voice-library-lab/bob-voice-design.py --preflight
printf '\nNo model download, installation, synthesis, or audio playback occurred.\n'
