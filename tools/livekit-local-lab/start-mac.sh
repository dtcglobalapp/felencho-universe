#!/usr/bin/env bash
set -euo pipefail
LAB="$HOME/felencho-livekit-local-lab"
mkdir -p "$LAB"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: solo laboratorio Mac." >&2; exit 1
fi
if ! command -v livekit-server >/dev/null 2>&1; then
  echo "ERROR: falta LiveKit Server. Instala con: brew install livekit" >&2; exit 1
fi
if lsof -nP -iTCP:7880 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "PARADO: ya hay un servicio escuchando en TCP 7880. No se iniciara otro." >&2
  lsof -nP -iTCP:7880 -sTCP:LISTEN || true
  exit 1
fi
echo "LiveKit local (SOLO localhost:7880). Ctrl+C para detener."
echo "Clave de desarrollo de LiveKit: devkey / secret. NUNCA usar en Internet o produccion."
echo "No modifica .env.local ni crea sesiones de Cloud."
livekit-server --dev 2>&1 | tee "$LAB/server.log"
