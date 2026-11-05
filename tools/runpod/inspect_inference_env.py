#!/usr/bin/env python3
"""Phase 2C-1: bounded read-only inference environment inventory.

Does not import torch, load weights, run FFmpeg, create files, or use the GPU.
Only executable file stat checks and Python distribution metadata inspection.
"""
from __future__ import annotations

import importlib.metadata
import json
import os
import shutil
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
EXECUTABLES = {
    "system_python": "/usr/bin/python3",
    "engine_venv": "/workspace/felencho-avatar-engine/venv/bin/python",
    "engine_dotvenv": "/workspace/felencho-avatar-engine/.venv/bin/python",
    "engine_conda": "/opt/conda/bin/python",
}
ENGINE_PATHS = {
    "echo_entrypoint": "experiments/echomimic_v3/infer_flash.py",
    "musetalk_entrypoint": "scripts/realtime_inference.py",
    "echo_weights": "experiments/echomimic_v3/flash/transformer/diffusion_pytorch_model.safetensors",
    "musetalk_weights": "models/musetalkV15/unet.pth",
}
PACKAGES = ("torch", "torchaudio", "torchvision", "diffusers", "transformers",
            "accelerate", "opencv-python", "numpy", "safetensors", "librosa",
            "imageio", "imageio-ffmpeg")


def collect() -> dict:
    candidates = {
        label: {"exists": Path(path).is_file(), "executable": Path(path).is_file() and os.access(path, os.X_OK)}
        for label, path in EXECUTABLES.items()
    }
    packages = {}
    for name in PACKAGES:
        try:
            packages[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            packages[name] = None
        except Exception:
            packages[name] = "metadata_unavailable"
    files = {}
    for label, rel in ENGINE_PATHS.items():
        path = ROOT / rel
        files[label] = {"exists": path.is_file(), "symlink": path.is_symlink()}
    return {
        "status": "inference_env_inspection_only",
        "model_loaded": False,
        "inference_executed": False,
        "python_candidates": candidates,
        "system_python_package_metadata": packages,
        "engine_files": files,
        "tools_in_bridge_path": {
            "nvidia_smi": shutil.which("nvidia-smi") is not None,
            "ffmpeg": shutil.which("ffmpeg") is not None,
            "ffprobe": shutil.which("ffprobe") is not None,
        },
        "limitations": [
            "Package versions are for the bridge Python environment only.",
            "No Python interpreter or GPU executable was invoked.",
            "CUDA compatibility and model inference remain unverified.",
        ],
    }


if __name__ == "__main__":
    print(json.dumps(collect(), ensure_ascii=False, indent=2))
