#!/bin/sh
# Felencho Light isolated offline voice check. No web, microphone, LiveKit,
# studio services, audio playback or production configuration is touched.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
if [ ! -f "vendor/felencho-light/src/presence/Scene.tsx" ]; then
  echo "ERROR: execute only in Felencho Light isolated worktree" >&2
  exit 1
fi
PYTHON="$HOME/felencho-qwen3-tts-lab/.venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  echo "ERROR: Qwen3-TTS MLX environment missing; no installation attempted" >&2
  exit 1
fi

MODEL="mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
OUT="$HOME/Documents/FelenchoMundial/voice-audition-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$OUT"
LOG="$OUT/latency.log"
printf 'Felencho Light voice audition - offline, sequential, no playback\n' > "$LOG"
printf 'Output: %s\n' "$OUT" | tee -a "$LOG"

run_voice() {
  NAME="$1"
  VOICE="$2"
  MESSAGE="$3"
  DEST="$OUT/$NAME"
  mkdir -p "$DEST"
  printf '\n%s (%s)\n' "$NAME" "$VOICE" | tee -a "$LOG"
  BEGIN=$(date +%s)
  if ! (
    export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1
    unset OPENAI_API_KEY OPENAI_ADMIN_KEY
    "$PYTHON" -m mlx_audio.tts.generate \
      --model "$MODEL" --text "$MESSAGE" \
      --voice "$VOICE" --lang_code Spanish --output_path "$DEST"
  ) >> "$LOG" 2>&1; then
    echo "ERROR: $NAME synthesis failed. See $LOG" >&2
    exit 1
  fi
  END=$(date +%s)
  if [ ! -s "$DEST/audio_000.wav" ]; then
    echo "ERROR: $NAME audio missing" >&2
    exit 1
  fi
  printf '%s: generation wall time %s s\n' "$NAME" "$((END-BEGIN))" | tee -a "$LOG"
  printf 'WAV: %s\n' "$DEST/audio_000.wav" | tee -a "$LOG"
}
run_voice bob Dylan "Felencho, la luz del estudio es elegante. Escuchemos la pregunta antes de responder."
run_voice lina Serena "Felencho, estoy lista para conversar. Bob y yo respetaremos tu turno."

printf '\nLISTO. Escuchar cada WAV en Finder o QuickTime, nunca en las TVs.\n' | tee -a "$LOG"
printf 'Las voces NO se reprodujeron ni se enviaron a LiveKit.\n' | tee -a "$LOG"
