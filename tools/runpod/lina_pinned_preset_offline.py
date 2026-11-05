#!/usr/bin/env python3
"""Read-only validation of pinned paths for the proposed Lina five-second preset.

The manifest is NOT an inference command and is NOT exposed through the Bridge.
No imports from model, GPU access, subprocesses, downloads, or file writes.
Even a successful inspection cannot authorize a renderer.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ENGINE = Path("/workspace/felencho-avatar-engine")
ECHO = ENGINE / "experiments/echomimic_v3"
SCRIPT_SHA = "59cb489d5d661d4c518c0e185cb74c83c3e87cd06f4da6fdcce14d900c2d9bcd"
CONFIG_SHA = "21fe4409b664385a1c1cc5c23d92506ffb05ef3c374a18de9df67b715dca07e9"
FILES = {
    "entrypoint": ("experiments/echomimic_v3/infer_flash.py", SCRIPT_SHA),
    "config": ("experiments/echomimic_v3/config/config.yaml", CONFIG_SHA),
    "image": ("assets/lina/lina-2x3.jpg", None),
    "audio": ("experiments/lina-musetalk-test/audio-5sec.wav", None),
    "vae_weights": ("experiments/echomimic_v3/flash/Wan2.1-Fun-V1.1-1.3B-InP/Wan2.1_VAE.pth", None),
    "transformer_weights": ("experiments/echomimic_v3/flash/transformer/diffusion_pytorch_model.safetensors", None),
}
DIRECTORIES = {
    "wan_model": "experiments/echomimic_v3/flash/Wan2.1-Fun-V1.1-1.3B-InP",
    "wav2vec_model": "experiments/echomimic_v3/flash/chinese-wav2vec2-base",
    "venv": "experiments/echomimic_v3/venv",
}
EXPECTED_SIZES = {"image": 226581, "audio": 160078, "vae_weights": 507609880,
                  "transformer_weights": 3727671120}


def safe_components(root: Path, rel: str) -> bool:
    current = root
    if not root.is_dir() or root.is_symlink():
        return False
    for part in Path(rel).parts:
        if part in ("", ".", "..") or part.startswith("."):
            return False
        current = current / part
        if current.is_symlink():
            return False
    return True


def inspect(root: Path = ENGINE) -> dict:
    checks = {}
    for name, (relative, expected_hash) in FILES.items():
        path = root / relative
        ok = safe_components(root, relative) and path.is_file()
        actual_size = path.stat().st_size if ok else None
        matches_size = actual_size == EXPECTED_SIZES[name] if name in EXPECTED_SIZES else True
        matches_hash = True
        if ok and expected_hash:
            if actual_size > 300000:
                matches_hash = False
            else:
                matches_hash = hashlib.sha256(path.read_bytes()).hexdigest() == expected_hash
        checks[name] = {"present_regular": ok, "size_matches_inventory": matches_size,
                        "sha256_matches_inventory": matches_hash}
    for name, relative in DIRECTORIES.items():
        path = root / relative
        checks[name] = {"present_directory": safe_components(root, relative) and path.is_dir()}
    all_ok = all(all(value is True for value in checks[name].values()) for name in checks)
    return {
        "status": "preset_paths_verified_offline" if all_ok else "preset_paths_blocked",
        "preset": "lina_echomimic_5s",
        "explicit_config_path": str(root / FILES["config"][0]),
        "explicit_image_path": str(root / FILES["image"][0]),
        "explicit_audio_path": str(root / FILES["audio"][0]),
        "fps": 25, "requested_video_length": 125,
        "checks": checks,
        "inference_executed": False,
        "bridge_render_enabled": False,
        "effective_runtime_config_verified": False,
        "note": "This validates pinned file identity/presence only, not runtime VAE wiring or GPU compatibility.",
    }


if __name__ == "__main__":
    print(json.dumps(inspect(), indent=2))
