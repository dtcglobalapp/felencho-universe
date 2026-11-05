#!/usr/bin/env python3
"""Fixed offline import smoke test for EchoMimic's own virtualenv.

Runs a bounded Python subprocess with CUDA hidden and offline library flags.
Does not import EchoMimic, load models, install packages, or execute GPU inference.
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3")
PYTHON = ROOT / "venv/bin/python"
MODULES = ("torch", "diffusers", "transformers", "safetensors", "omegaconf")
PROGRESS_MARKER = "FAE_IMPORT_PROGRESS_V1="
RESULT_MARKER = "FAE_IMPORT_RESULTS_V1="
CHILD_SOURCE = """
import importlib
import json

modules = ("torch", "diffusers", "transformers", "safetensors", "omegaconf")
checks = {}
for name in modules:
    print("FAE_IMPORT_PROGRESS_V1=started:" + name, flush=True)
    try:
        importlib.import_module(name)
        checks[name] = "ok"
    except Exception as exc:
        checks[name] = "error:" + type(exc).__name__
    print("FAE_IMPORT_PROGRESS_V1=finished:" + name + ":" + checks[name], flush=True)
print("FAE_IMPORT_RESULTS_V1=" + json.dumps(checks, sort_keys=True), flush=True)
"""


def _progress(stdout: str | bytes | None) -> dict:
    if isinstance(stdout, bytes):
        stdout = stdout.decode("utf-8", errors="replace")
    lines = (stdout or "").splitlines()
    events = []
    for line in lines:
        if not line.startswith(PROGRESS_MARKER):
            continue
        entry = line[len(PROGRESS_MARKER):]
        parts = entry.split(":")
        if len(parts) == 2 and parts[0] == "started" and parts[1] in MODULES:
            events.append(entry)
        elif (len(parts) == 3 and parts[0] == "finished"
              and parts[1] in MODULES
              and parts[2] == "ok"):
            events.append(entry)
        elif (len(parts) == 4 and parts[0] == "finished"
              and parts[1] in MODULES and parts[2] == "error"
              and parts[3].isidentifier() and len(parts[3]) <= 48):
            events.append(entry)
    return {"import_progress": events[:15]}


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
    except subprocess.TimeoutExpired as exc:
        return {
            **report, "error": "TimeoutExpired",
            **_progress(exc.stdout),
            "note": "Partial import progress only; timeout does not prove a missing package.",
        }
    except OSError as exc:
        return {**report, "error": type(exc).__name__}

    records = [
        line[len(RESULT_MARKER):]
        for line in process.stdout.splitlines()
        if line.startswith(RESULT_MARKER)
    ]
    if process.returncode != 0 or len(records) != 1 or len(records[0]) > 3000:
        return {
            **report, "error": "child_import_failed_or_invalid_response",
            **_progress(process.stdout),
        }
    try:
        checks = json.loads(records[0])
    except (ValueError, TypeError):
        return {**report, "error": "invalid_import_results",
                **_progress(process.stdout)}
    if set(checks) != set(MODULES) or any(
        not isinstance(value, str) or
        (value != "ok" and not value.startswith("error:"))
        for value in checks.values()
    ):
        return {**report, "error": "invalid_module_results",
                **_progress(process.stdout)}
    return {
        **report,
        "status": "import_smoke_pass" if all(v == "ok" for v in checks.values())
                  else "import_smoke_partial",
        "module_results": checks,
        **_progress(process.stdout),
        "note": "No engine/weights loaded; GPU compatibility and inference remain unverified.",
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
