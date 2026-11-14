#!/usr/bin/env bash
set -euo pipefail
echo "Felencho Mundial | Motor conversacional LOCAL (sin servicios de pago)"
if [[ "$(uname -s)" != "Darwin" ]]; then echo "Este instalador se ejecuta solo en La Bestia (macOS)." >&2;exit 1;fi
if ! command -v ollama >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then echo "No se encontro Homebrew. No se cambia el sistema." >&2;exit 1;fi
  echo "Instalando el motor Ollama en la Mac (software local)."
  brew install ollama
fi
if ! curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then
  echo "Iniciando servicio local Ollama."
  if command -v brew >/dev/null 2>&1; then brew services start ollama; else ollama serve >/dev/null 2>&1 & fi
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then break;fi
    sleep 2
  done
fi
if ! curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then
 echo "Ollama no se inicio: no continuar; revisar servicio local." >&2;exit 1
fi
if ! ollama list | grep -iq 'qwen'; then
 echo "Descargando una vez Qwen3 4B Instruct (aprox. 2.5 GB); luego funciona sin Internet."
 ollama pull qwen3:4b-instruct
fi
echo
echo "Modelos locales Qwen instalados:"
ollama list | grep -i qwen || true
echo
echo "Reconocimiento: Whisper local preinstalado"
if ! command -v whisper-cli >/dev/null 2>&1; then echo "ATENCION: falta whisper-cli en PATH."; fi
if [[ ! -f "$HOME/felencho-whisper-lab/models/ggml-small.bin" ]]; then echo "ATENCION: falta modelo Whisper small."; fi
echo "Voces: Qwen3-TTS Serena/Uncle_Fu (si esta el laboratorio); macOS voz offline de respaldo."
if [[ ! -x "$HOME/felencho-qwen3-tts-lab/.venv/bin/python" ]]; then echo "ATENCION: laboratorio Qwen3-TTS no encontrado, usaremos voz macOS."; fi
echo "Listo para abrir http://localhost:3001/studio-conversation-lab (con servicio Hologramas activo)."
