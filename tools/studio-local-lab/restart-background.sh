#!/bin/sh
# Restart only the verified Studio Control process on port 7892.
# Other users' processes and unrelated services must never be killed.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "$ROOT"
PIDS="$(/usr/sbin/lsof -nP -t -iTCP:7892 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  for PID in $PIDS; do
    CMD="$(/bin/ps -p "$PID" -o command= 2>/dev/null || true)"
    case "$CMD" in
      *tools/studio-local-lab/studio-control.mjs*)
        echo "Reiniciando solamente Studio Control (PID $PID)"
        /bin/kill -TERM "$PID"
        ;;
      *)
        echo "El puerto 7892 pertenece a otro proceso: $CMD"
        echo "No se detuvo ningun proceso."
        exit 1
        ;;
    esac
  done
  N=0
  while /usr/sbin/lsof -nP -t -iTCP:7892 -sTCP:LISTEN >/dev/null 2>&1; do
    N=$((N+1))
    if [ "$N" -ge 20 ]; then
      echo "El proceso anterior no libero 7892. No se forzo su cierre."
      exit 1
    fi
    sleep 1
  done
fi
exec /bin/sh "$ROOT/tools/studio-local-lab/start-background.sh"
