#!/bin/sh
# Installs Base TTS solely to isolated Felencho Voice Library. Does not alter venv or studio.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
test -f "tools/voice-library-lab/bob-clone-base.py" || { echo "ERROR: isolated lab absent" >&2; exit 1; }
PY="$HOME/felencho-qwen3-tts-lab/.venv/bin/python"
test -x "$PY" || { echo "ERROR: existing MLX Python absent" >&2; exit 1; }
"$PY" tools/voice-library-lab/bob-clone-base.py --check
export FELENCHO_BASE_PATH="$HOME/Documents/FelenchoMundial/voice-library/models/qwen3-base-1.7b"
"$PY" - <<'PY'
import os
from pathlib import Path
from shutil import disk_usage
from huggingface_hub import snapshot_download
dest = Path(os.environ["FELENCHO_BASE_PATH"])
free = disk_usage(Path.home()).free / 1024**3
if free < 12:
    raise SystemExit("ERROR: less than 12 GiB free; not downloading.")
print("BASE MODEL: mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16")
print("ISOLATED DEST:", dest)
print("FREE SPACE GiB:", round(free, 1))
snapshot_download(
    repo_id="mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16",
    local_dir=str(dest),
    allow_patterns=["*.json", "*.safetensors", "*.txt", "*.model", "*.tiktoken", "*.py", "*.md", "speech_tokenizer/**"],
)
if not (dest / "config.json").is_file() or not list(dest.glob("*.safetensors")):
    raise SystemExit("ERROR: Base model files incomplete.")
print("BASE MODEL READY. No services touched, no audio generated.")
PY
