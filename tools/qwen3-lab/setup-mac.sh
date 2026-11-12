#!/usr/bin/env bash
set -euo pipefail
LAB="${HOME}/felencho-qwen3-tts-lab"
if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  echo "ERROR: Este laboratorio es solo para Apple Silicon (M1/M2/M3/M4)." >&2
  exit 1
fi
if ! command -v python3.12 >/dev/null 2>&1; then
  echo "Se necesita Python 3.12. Instala con: brew install python@3.12" >&2
  exit 1
fi
mkdir -p "$LAB/output"
python3.12 -m venv "$LAB/.venv"
"$LAB/.venv/bin/python" -m pip install --upgrade pip
"$LAB/.venv/bin/python" -m pip install 'mlx-audio==0.3.1' soundfile
cat > "$LAB/INSTRUCCIONES.txt" <<'TEXT'
Laboratorio aislado. No altera felencho-hologram-check ni LiveKit.
Primer modelo: mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit
El modelo se descarga durante el primer uso y queda en la cache de Hugging Face.
Escucha los archivos WAV en ~/felencho-qwen3-tts-lab/output.
TEXT
printf '\nListo. Ejecuta el generador de muestras.\n'
