#!/usr/bin/env python3
"""Collect only Realtime Lab source needed for producer-turn integration.

No changes to running services or source. Does NOT scan .env, databases or private
libraries. ZIP is local, requires the owner to review/share it.
"""
from pathlib import Path
import sys
import zipfile

root = Path.home() / "Documents" / "felencho-realtime-lab"
out = Path.home() / "Desktop" / "Felencho-Realtime-Turnos-Codigo.zip"
candidates = [
    "app/studio-realtime-lab/page.tsx",
    "app/studio-realtime-lab/RealtimeLabClient.tsx",
    "app/api/studio-realtime-speech/route.ts",
    "app/api/studio-realtime-transcribe/route.ts",
    "app/api/studio-realtime-tts/route.ts",
    "app/api/realtime/route.ts",
    "tools/realtime-lab/README.md",
]
if not root.is_dir():
    raise SystemExit("No encuentro el proyecto Realtime Lab; no hice cambios.")
files = []
for name in candidates:
    f = root / name
    if f.is_file() and not f.is_symlink() and f.stat().st_size <= 500_000:
        files.append((name, f))
if not files:
    raise SystemExit("No reconozco los archivos del laboratorio; no hice cambios.")
if out.exists():
    raise SystemExit("Ya existe el ZIP en el Escritorio; no lo sobrescribí.")
with zipfile.ZipFile(out, "x", compression=zipfile.ZIP_DEFLATED) as z:
    for name, f in files:
        z.write(f, arcname=name)
print("DIAGNOSTICO PREPARADO:", out.name)
print("Archivos incluidos:")
for name, _ in files:
    print(" -", name)
print("No se copiaron archivos .env, claves, modelos, recuerdos ni registros.")
print("Ningun servicio fue detenido. Revisa el ZIP antes de compartirlo.")
