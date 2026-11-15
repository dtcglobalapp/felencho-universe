#!/bin/sh
# Starts ONLY Studio Control in the background. All lab services are then
# managed from http://127.0.0.1:7892 without extra Terminal sessions.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
LOGDIR="$HOME/Library/Logs/FelenchoStudioLab"
mkdir -p "$LOGDIR"
if /usr/bin/curl --max-time 2 -fsS "http://127.0.0.1:7892/" >/dev/null 2>&1; then
  echo "Studio Control ya responde en http://127.0.0.1:7892"
  echo "Si es la version antigua, detiene primero ese panel y vuelve a ejecutar."
  exit 0
fi
if /usr/sbin/lsof -nP -iTCP:7892 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Puerto 7892 ocupado por otro proceso. No se ha detenido ni reemplazado."
  exit 1
fi
cd "$ROOT"
# Resolve the installed Node instead of assuming Homebrew's Apple Silicon path.
# The Mac may use nvm, fnm, Volta, asdf or a different Homebrew prefix.
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "Node.js no encontrado en PATH. Comprueba con: command -v node"
  exit 1
fi
echo "Usando Node.js: $NODE_BIN"
nohup "$NODE_BIN" tools/studio-local-lab/studio-control.mjs </dev/null >> "$LOGDIR/studio-control.log" 2>&1 &
# Check the lightweight root page, not /api/status: the latter probes all
# ports serially and can take seconds while other services are offline.
READY=0
ATTEMPT=0
while [ "$ATTEMPT" -lt 20 ]; do
  if /usr/bin/curl --connect-timeout 1 --max-time 2 -fsS "http://127.0.0.1:7892/" >/dev/null 2>&1; then
    READY=1
    break
  fi
  ATTEMPT=$((ATTEMPT+1))
  sleep 1
done
if [ "$READY" -eq 1 ]; then
  echo "Studio Control funcionando en http://127.0.0.1:7892"
  echo "Ya puedes cerrar esta Terminal. Administra los servicios desde el panel."
else
  echo "Studio Control no responde en 7892. Ultimas lineas del registro:"
  /usr/bin/tail -n 18 "$LOGDIR/studio-control.log" 2>/dev/null || true
  exit 1
fi
