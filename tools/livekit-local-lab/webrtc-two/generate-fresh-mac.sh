#!/usr/bin/env bash
set -euo pipefail
LAB="$HOME/felencho-qwen3-tts-lab"
PY="$LAB/.venv/bin/python"
MODEL="mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
if [[ $# -ne 2 ]]; then
  echo 'Uso: bash generate-fresh-mac.sh lina "Frase en espanol"' >&2
  echo '     bash generate-fresh-mac.sh bob "Frase en espanol"' >&2
  exit 2
fi
case "$1" in
  lina) VOICE="Serena";;
  bob) VOICE="Uncle_Fu";;
  *) echo 'Selecciona lina o bob.' >&2;exit 2;;
esac
[[ -x "$PY" ]] || { echo 'No se encontro Python de Qwen3 en el laboratorio.' >&2;exit 1; }
[[ -n "${2//[[:space:]]/}" && ${#2} -le 600 ]] || { echo 'Texto vacio o demasiado largo (maximo 600 caracteres).' >&2;exit 2; }
DEST="$LAB/output/livekit-fresh/$1"
mkdir -p "$DEST"
"$PY" -m mlx_audio.tts.generate --model "$MODEL" --text "$2" --voice "$VOICE" --lang_code Spanish --output_path "$DEST"
[[ -s "$DEST/audio_000.wav" ]] || { echo "No aparecio $DEST/audio_000.wav" >&2; exit 1; }
echo "Muestra nueva lista: $DEST/audio_000.wav"
echo 'Se puede transmitir con el boton Frase nueva en el navegador.'
