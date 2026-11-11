#!/usr/bin/env bash
set -euo pipefail
LAB="${HOME}/felencho-qwen3-tts-lab"
CLI="$LAB/.venv/bin/mlx_audio.tts.generate"
MODEL='mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit'
[[ -x "$CLI" ]] || { echo 'Primero ejecuta setup-mac.sh.' >&2; exit 1; }
mkdir -p "$LAB/output"
printf 'Probando LINA en espanol neutro.\n'
"$CLI" --model "$MODEL" --text 'Hola, soy Lina. Bienvenidos a Felencho Mundial. Aqui conversamos con respeto, inteligencia y libertad.' --voice Serena --lang_code Spanish --output_path "$LAB/output/lina-es"
printf 'Probando BOB en espanol neutro.\n'
"$CLI" --model "$MODEL" --text 'Hola, soy Bob. Me alegra acompanarlos en una conversacion sin fronteras. Felencho, de que hablaremos hoy?' --voice Uncle_Fu --lang_code Spanish --output_path "$LAB/output/bob-es"
printf 'Probando LINA en ingles.\n'
"$CLI" --model "$MODEL" --text 'Hello, I am Lina. Welcome to Felencho Mundial, where everyone has a voice.' --voice Serena --lang_code English --output_path "$LAB/output/lina-en"
printf '\nTerminado. Abre %s/output\n' "$LAB"
