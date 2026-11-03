#!/usr/bin/env python3
"""Read-only metadata inventory for EchoMimic's nested local virtual environment.

Does NOT execute the nested interpreter, import third-party packages, load models,
install packages, run GPU commands, or read model/config contents.
"""
from __future__ import annotations

import importlib.metadata as metadata
import json
import os
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3")
PACKAGES = (
    "torch", "torchvision", "torchaudio", "diffusers", "transformers", "accelerate",
    "safetensors", "librosa", "decord", "einops", "moviepy", "omegaconf",
    "pyloudnorm", "numpy", "Pillow", "opencv-python", "imageio", "mmgp",
)
PATHS = {
    "config_yaml": "config/config.yaml",
    "wan_config_json": "flash/Wan2.1-Fun-V1.1-1.3B-InP/config.json",
    "wan_configuration_json": "flash/Wan2.1-Fun-V1.1-1.3B-InP/configuration.json",
    "wav2vec_config": "flash/chinese-wav2vec2-base/config.json",
    "transformer_config": "flash/transformer/config.json",
}


def inspect():
    base = {"status": "echo_nested_venv_metadata_only", "model_loaded": False,
            "inference_executed": False, "files_written": False}
    venv = ROOT / "venv"
    python = venv / "bin/python"
    sites = sorted(p for p in (venv / "lib").glob("python*/site-packages")
                   if p.is_dir() and not p.is_symlink())[:3]
    installed = {}
    for site in sites:
        try:
            for dist in metadata.distributions(path=[str(site)]):
                name = dist.metadata.get("Name", "").lower().replace("_", "-")
                if name and name not in installed:
                    installed[name] = dist.version
        except (OSError, ValueError):
            continue
    versions = {name: installed.get(name.lower().replace("_", "-")) for name in PACKAGES}
    paths = {}
    for label, relative in PATHS.items():
        p = ROOT / relative
        paths[label] = {"exists": p.is_file() and not p.is_symlink(),
                        "symlink": p.is_symlink()}
    return {**base,
            "nested_python": {"exists": python.is_file(), "executable": os.access(python, os.X_OK),
                              "symlink": python.is_symlink()},
            "site_package_locations_found": len(sites),
            "packages_in_nested_venv": versions,
            "fixed_config_presence": paths,
            "warning": "Metadata only; no executable started or compatibility established."}


if __name__ == "__main__":
    print(json.dumps(inspect(), indent=2))
