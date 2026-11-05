#!/usr/bin/env python3
"""No-GPU readiness check for a cold start of Felencho RunPod Bridge.

Never prints secret values, imports ML libraries, opens sockets, or modifies
files. Exit 0 only when read-only bridge can be launched with a Pod secret.
"""
from __future__ import annotations
import json
import os
from pathlib import Path

BRIDGE = Path("/workspace/felencho-runpod-bridge/tools/runpod/bridge.py")
ENGINE = Path("/workspace/felencho-avatar-engine")
SECRET_ENV = "FELENCHO_RUNPOD_GITHUB_TOKEN"

def inspect(environ=None, bridge_path=BRIDGE, engine_path=ENGINE):
    env = os.environ if environ is None else environ
    raw = env.get(SECRET_ENV, "")
    secret_ok = isinstance(raw, str) and len(raw.strip()) >= 20 and not raw.lstrip().startswith("{{")
    checks = {
        "secret_injected": bool(secret_ok),
        "bridge_checkout_present": bridge_path.is_file() and not bridge_path.is_symlink(),
        "engine_directory_present": engine_path.is_dir() and not engine_path.is_symlink(),
    }
    return {
        "status": "ready_for_read_only_bridge" if all(checks.values()) else "blocked",
        "checks": checks,
        "gpu_touched": False,
        "inference_enabled": False,
        "secret_value_reported": False,
        "next_step": "launch_via_reviewed_startup_hook" if all(checks.values())
                     else "correct_template_or_secret_without_starting_inference",
    }

if __name__ == "__main__":
    result = inspect()
    print(json.dumps(result, sort_keys=True))
    raise SystemExit(0 if result["status"] == "ready_for_read_only_bridge" else 2)
