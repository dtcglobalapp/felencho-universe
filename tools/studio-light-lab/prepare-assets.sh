#!/bin/sh
# Felencho Mundial: copy ONLY the three approved original portrait binaries
# into the isolated Next.js laboratory public asset directory.
# This never touches a running server, branch, package.json, or source image.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
SRC="$ROOT/vendor/felencho-light/src/assets"
DEST="$ROOT/public/studio-light/assets"
NAMES="bob-v1-portrait.jpg lina-v2-portrait.jpg lina-v2-sleep.webp"
EXPECTED="5c73bc82973dfde3dfa635934841047657bdc4e11210f82a3c35922056adb287 d9f7f71bc1ddbf4b1302b58e015adb4ce34000aafa2a0d91c5747e463cbc0d42 d0aae08d666a8f9a9c81ab878fa52fdf42d92c3cd6d9c25556c6645de8f4a1dc"
set -- $EXPECTED
for name in $NAMES; do
  [ -f "$SRC/$name" ] || { echo "FALTA: $SRC/$name"; exit 1; }
  got=$(shasum -a 256 "$SRC/$name" | awk '{print $1}')
  [ "$got" = "$1" ] || { echo "HASH INCORRECTO: $name"; exit 1; }
  shift
done
mkdir -p "$DEST"
for name in $NAMES; do
  if [ -e "$DEST/$name" ]; then
    if cmp -s "$SRC/$name" "$DEST/$name"; then
      echo "YA EXISTE IDENTICO: $name"
    else
      echo "CONFLICTO (no se sobrescribe): $DEST/$name"
      exit 1
    fi
  else
    cp -p "$SRC/$name" "$DEST/$name"
    echo "COPIADO: $name"
  fi
done
echo "LISTO: 3 texturas verificadas en public/studio-light/assets/"
echo "Solo laboratorio; no se ha iniciado ni reiniciado ningun servicio."
