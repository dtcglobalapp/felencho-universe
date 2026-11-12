#!/usr/bin/env bash
set -euo pipefail
LAB="${HOME}/felencho-qwen3-tts-lab"
PYTHON="$LAB/.venv/bin/python"
MODEL="mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
OUT="$LAB/output/languages"
[[ -x "$PYTHON" ]] || { echo "ERROR: primero ejecuta setup-mac.sh." >&2; exit 1; }
mkdir -p "$OUT"
LOG="$OUT/benchmark-tiempos.txt"
printf 'Qwen3-TTS 0.6B CustomVoice: pruebas de 8 idiomas adicionales\nInicio: %s\nModelo: %s\n\n' "$(date)" "$MODEL" > "$LOG"

# Already tested: Spanish and English. These eight complete the advertised 10.
while IFS='|' read -r code voice language line; do
  [[ -n "$code" ]] || continue
  printf '\n[%s] %s - voz %s\n' "$code" "$language" "$voice" | tee -a "$LOG"
  # Keep generation output, warnings and timing together for inspection.
  /usr/bin/time -p "$PYTHON" -m mlx_audio.tts.generate \
    --model "$MODEL" \
    --text "$line" \
    --voice "$voice" \
    --lang_code "$language" \
    --output_path "$OUT/$code" >> "$LOG" 2>&1 || {
      echo "ERROR en $code; consulta $LOG. No continuar." >&2
      exit 1
    }
  echo "Generado: $OUT/$code/audio_000.wav" | tee -a "$LOG"
done <<'LANGUAGES'
pt|Serena|Portuguese|Olá, sou Lina. Bem-vindos ao Felencho Mundial. Aqui todos podem conversar com respeito.
fr|Serena|French|Bonjour, je suis Lina. Bienvenue à Felencho Mundial. Nous écoutons toutes les voix.
de|Uncle_Fu|German|Hallo, ich bin Bob. Willkommen bei Felencho Mundial. Heute sprechen wir gemeinsam.
it|Serena|Italian|Ciao, sono Lina. Benvenuti a Felencho Mundial. Parliamo insieme con rispetto.
zh|Uncle_Fu|Chinese|大家好，我是鲍勃。欢迎来到费伦乔世界。让我们开始今天的对话。
ja|Serena|Japanese|こんにちは、リナです。フェレンチョ・ムンディアルへようこそ。
ko|Serena|Korean|안녕하세요, 저는 리나입니다. 펠렌초 문디알에 오신 것을 환영합니다.
ru|Uncle_Fu|Russian|Здравствуйте, я Боб. Добро пожаловать в Феленчо Мундиаль.
LANGUAGES

printf '\nPruebas terminadas. Audios en: %s\nTiempos: %s\n' "$OUT" "$LOG"
