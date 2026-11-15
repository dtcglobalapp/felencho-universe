#!/bin/sh
# Starts ONLY Studio Control in the background. All lab services are then
# managed from http://127.0.0.1:7892 without extra Terminal sessions.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
LOGDIR="$HOME/Library/Logs/FelenchoStudioLab"
mkdir -p "$LOGDIR"
if /usr/bin/curl --max-time 2 -fsS "http://127.0.0.1:7892/api/status" >/dev/null 2>&1; then
  echo "Studio Control ya responde en http://127.0.0.1:7892"
  echo "Si es la version antigua, detiene primero ese panel y vuelve a ejecutar."
  exit 0
fi
if /usr/sbin/lsof -nP -iTCP:7892 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Puerto 7892 ocupado por otro proceso. No se ha detenido ni reemplazado."
  exit 1
fi
cd "$ROOT"
nohup /opt/homebrew/bin/node tools/studio-local-lab/studio-control.mjs </dev/null >> "$LOGDIR/studio-control.log" 2>&1 &
sleep 1
if /usr/bin/curl --max-time 3 -fsS "http://127.0.0.1:7892/api/status" >/dev/null 2>&1; then
  echo "Studio Control funcionando en http://127.0.0.1:7892"
  echo "Ya puedes cerrar esta Terminal. Los servicios del laboratorio se controlan desde la pagina."
else
  echo "No fue posible verificar el arranque. Revisa $LOGDIR/studio-control.log"
  exit 1
fi
