#!/usr/bin/env python3
"""Fixed offline import smoke test for EchoMimic's own virtualenv.

Runs a short, bounded child Python interpreter with CUDA hidden and network-
related library offline flags. Does not import the EchoMimic source, load weights,
write video, install packages, or expose arbitrary commands from GitHub Issues.
This is NOT a GPU compatibility or inference test.
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3")
PYTHON = ROOT / "venv/bin/python"
MODULES = ("torch", "diffusers", "transformers", "safetensors", "omegaconf")
CHILD_SOURCE = """
import importlib
import json
mods = ("torch", "diffusers", "transformers", "safetensors", "omegaconf")
checks = {}
for name in mods:
    try:
        importlib.import_module(name)
        checks[name] = "ok"
    except Exception as exc:
        checks[name] = "error:" + type(exc).__name__
print("FAE_IMPORT_RESULTS_V1=" + json.dumps(checks, sort_keys=True))
"""


def run() -> dict:
    report = {
        "status": "import_smoke_blocked",
        "gpu_inference_executed": False,
        "weights_loaded": False,
        "engine_imported": False,
        "modules_requested": list(MODULES),
    }
    if (PYTHON.is_symlink() or not PYTHON.is_file() or
            not os.access(PYTHON, os.X_OK) or not ROOT.is_dir()):
        return {**report, "error": "python_venv_unavailable"}
    env = os.environ.copy()
    env.update({
        "CUDA_VISIBLE_DEVICES": "-1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "HF_HUB_OFFLINE": "1",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_DATASETS_OFFLINE": "1",
        "TOKENIZERS_PARALLELISM": "false",
        "OMP_NUM_THREADS": "1",
        "MKL_NUM_THREADS": "1",
        "PYTHONNOUSERSITE": "1",
    })
    try:
        process = subprocess.run(
            [str(PYTHON), "-B", "-c", CHILD_SOURCE],
            cwd=str(ROOT),
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=18,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {**report, "error": type(exc).__name__}
    marker = "FAE_IMPORT_RESULTS_V1="
    records = [line[len(marker):] for line in process.stdout.splitlines()
               if line.startswith(marker)]
    if process.returncode != 0 or len(records) != 1 or len(records[0]) > 3000:
        return {**report, "error": "child_import_failed_or_invalid_response"}
    try:
        checks = json.loads(records[0])
    except (ValueError, TypeError):
        return {**report, "error": "invalid_import_results"}
    if set(checks) != set(MODULES) or any(
        not isinstance(value, str) or (value != "ok" and not value.startswith("error:"))
        for value in checks.values()
    ):
        return {**report, "error": "invalid_module_results"}
    return {
        **report,
        "status": "import_smoke_pass" if all(value == "ok" for value in checks.values())
                  else "import_smoke_partial",
        "module_results": checks,
        "note": "No model/weights imported; GPU runtime compatibility and inference unverified.",
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
