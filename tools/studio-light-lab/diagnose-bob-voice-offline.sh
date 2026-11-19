#!/bin/sh
# Isolated offline, controlled Bob vocal-quality comparison.
# Does not start services, call the studio route, or play audio automatically.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
test -f "vendor/felencho-light/src/presence/Scene.tsx" || { echo "ERROR: solo laboratorio aislado" >&2; exit 1; }
PY="$HOME/felencho-qwen3-tts-lab/.venv/bin/python"
test -x "$PY" || { echo "ERROR: no existe entorno MLX local" >&2; exit 1; }
OUT="$HOME/Documents/FelenchoMundial/bob-voice-diagnostic-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$OUT"
MODEL="mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
printf 'Diagnostico de voz Bob (Ryan vs Dylan), mismas frases, audio offline.\n' > "$OUT/README.txt"
printf 'Cada par es comparativo, no prueba sincronizacion ni calidad subjetiva.\n' >> "$OUT/README.txt"
printf 'Escuchar por separado en Finder/QuickTime; no reproducir en pantallas.\n' >> "$OUT/README.txt"
run() {
  VOICE="$1"; INDEX="$2"; PHRASE="$3"
  DEST="$OUT/$VOICE-$INDEX"
  mkdir -p "$DEST"
  printf '\n%s / frase %s\n' "$VOICE" "$INDEX"
  BEGIN=$(date +%s)
  (
    export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1
    unset OPENAI_API_KEY OPENAI_ADMIN_KEY
    "$PY" -m mlx_audio.tts.generate \
      --model "$MODEL" --text "$PHRASE" --voice "$VOICE" \
      --lang_code Spanish --output_path "$DEST"
  ) >> "$OUT/run.log" 2>&1 || { echo "ERROR en $VOICE-$INDEX: $OUT/run.log" >&2; exit 1; }
  test -s "$DEST/audio_000.wav" || { echo "ERROR: WAV inexistente" >&2; exit 1; }
  printf '%s-%s: %s s\n' "$VOICE" "$INDEX" "$(($(date +%s)-BEGIN))" | tee -a "$OUT/timing.txt"
}
# Same exact input text and synthesis settings across voices.
A="Felencho, la iluminación del estudio tiene buen equilibrio y favorece una conversación clara."
B="Me parece una propuesta interesante. Podemos mejorarla sin cambiar la identidad del programa."
printf 'Frase A: %s\nFrase B: %s\n' "$A" "$B" >> "$OUT/README.txt"
run Ryan A "$A"
run Dylan A "$A"
run Ryan B "$B"
run Dylan B "$B"
printf '\nArchivos: %s\n' "$OUT"
printf 'Primero escuchar Ryan-A y Dylan-A; luego Ryan-B y Dylan-B.\n'
printf 'Anotar murmullos al inicio y si aparecen en ambas voces.\n'
