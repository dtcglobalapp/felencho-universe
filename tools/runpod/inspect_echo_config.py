#!/usr/bin/env python3
"""Read-only fixed-path EchoMimic config and model-layout inspection.

No YAML parsing with constructors, no module imports from engine, no shell/GPU,
no directory traversal beyond fixed paths, and no file content is disclosed.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
FILES = {
    "default_wan_config": "config/wan2.1/wan_civitai.yaml",
    "flash_config": "experiments/echomimic_v3/flash/config.json",
    "echo_script": "experiments/echomimic_v3/infer_flash.py",
    "lina_audio": "experiments/lina-musetalk-test/audio-5sec.wav",
    "lina_image": "assets/lina/lina-2x3.jpg",
    "flash_weights": "experiments/echomimic_v3/flash/transformer/diffusion_pytorch_model.safetensors",
}
DIRS = {
    "flash_root": "experiments/echomimic_v3/flash",
    "wav2vec_default": "chinese-wav2vec2-base",
    "wan_models": "models",
}
MAX_CONFIG = 128 * 1024


def inspect():
    result = {"status": "echo_config_inspection_only", "inference_executed": False,
              "engine_imported": False, "files_written": False, "files": {}, "directories": {}}
    for label, rel in FILES.items():
        path = ROOT / rel
        info = {"exists": path.is_file(), "symlink": path.is_symlink()}
        if info["exists"] and not info["symlink"]:
            info["bytes"] = path.stat().st_size
            if path.suffix in (".yaml", ".json") and info["bytes"] <= MAX_CONFIG:
                raw = path.read_bytes()
                info["sha256"] = hashlib.sha256(raw).hexdigest()
                # Report key names only; do not publish config values.
                keys = set()
                for line in raw.decode("utf-8", errors="replace").splitlines():
                    match = re.match(r'^\s*["\x27]?([A-Za-z][A-Za-z0-9_]{0,60})["\x27]?\s*:', line)
                    if match:
                        keys.add(match.group(1))
                info["key_names_only"] = sorted(keys)[:80]
        result["files"][label] = info
    for label, rel in DIRS.items():
        path = ROOT / rel
        result["directories"][label] = {"exists": path.is_dir(), "symlink": path.is_symlink()}
    result["note"] = "Presence and key names only; actual model compatibility and the required frame count remain unverified."
    return result


if __name__ == "__main__":
    print(json.dumps(inspect(), indent=2))
