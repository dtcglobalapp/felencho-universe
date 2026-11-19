#!/bin/sh
# Install VoiceDesign model ONLY under Felencho Voice Library.
# No pip, no services, no modifications to the existing Serena environment.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
test -f "vendor/felencho-light/src/presence/Scene.tsx" || { echo "ERROR: isolated lab required" >&2; exit 1; }
PY="$HOME/felencho-qwen3-tts-lab/.venv/bin/python"
test -x "$PY" || { echo "ERROR: MLX Python not found" >&2; exit 1; }
OUT="$HOME/Documents/FelenchoMundial/voice-library/models/qwen3-voice-design-1.7b"
export FELENCHO_VOICE_MODEL_DIR="$OUT"
"$PY" - <<'PY'
from pathlib import Path
from shutil import disk_usage
from os import environ
import importlib
import sys

root=Path(environ["FELENCHO_VOICE_MODEL_DIR"]).resolve()
free=disk_usage(root.parent if root.parent.exists() else Path.home()).free
if free < 12*1024**3:
    raise SystemExit("ERROR: menos de 12 GiB libres; no descargar")
try:
    from huggingface_hub import snapshot_download
except ImportError:
    raise SystemExit("ERROR: falta huggingface_hub; no se instalan paquetes")
print("Instalacion exclusiva en:",root)
print("Espacio libre GiB:",round(free/1024**3,1))
print("Fuente: mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16")
print("Descargando modelo a biblioteca independiente; esto puede usar aproximadamente 4.5 GB.")
snapshot_download(
    repo_id="mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16",
    local_dir=str(root),
    allow_patterns=["*.json","*.safetensors","*.txt","*.model","*.tiktoken","*.py","*.md","speech_tokenizer/**"],
)
if not (root/"config.json").exists() or not list(root.glob("*.safetensors")):
    raise SystemExit("ERROR: modelo incompleto")
print("Modelo descargado en:",root)
print("No se inicio ningun servidor ni se reprodujo audio.")
PY
