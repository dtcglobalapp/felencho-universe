#!/usr/bin/env python3
"""Read-only environment audit for Felencho Avatar Engine v2 on RunPod.

Does not launch a GPU instance, install dependencies, download models, contact
LemonSlice, start LiveKit, or change files. Run only after a Pod is already on.
"""
import json
import os
import pathlib
import shutil
import subprocess
import sys

def command(argv, timeout=15):
    try:
        p = subprocess.run(argv, text=True, capture_output=True, timeout=timeout, check=False)
        return {"ok": p.returncode == 0, "exit_code": p.returncode,
                "stdout": p.stdout.strip()[:2500], "stderr": p.stderr.strip()[:300]}
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        return {"ok": False, "error": type(exc).__name__}

def disk(path):
    try:
        d = shutil.disk_usage(path)
        return {"exists": True, "free_gb": round(d.free / 1024**3, 2),
                "total_gb": round(d.total / 1024**3, 2),
                "mountpoint": os.path.ismount(path)}
    except OSError:
        return {"exists": False}

def main():
    data = {
        "purpose": "Felencho Avatar Engine v2 isolated RunPod preflight",
        "python": sys.version.split()[0],
        "gpu": command(["nvidia-smi", "--query-gpu=name,memory.total,memory.free,driver_version",
                        "--format=csv,noheader"]),
        "ffmpeg": command(["ffmpeg", "-version"]),
        "storage": {p: disk(p) for p in
                    ("/workspace", "/runpod-volume", "/workspace/felencho-avatar-engine")},
        "model_candidates": {},
        "torch": None,
        "safety": {"touches_production": False, "starts_paid_sessions": False},
    }
    for p in ("/workspace/felencho-avatar-engine", "/runpod-volume/weights",
              "/runpod-volume/models", "/workspace/MuseTalk"):
        data["model_candidates"][p] = pathlib.Path(p).exists()
    try:
        import torch
        data["torch"] = {"version": torch.__version__,
                         "cuda_available": torch.cuda.is_available(),
                         "cuda_version": torch.version.cuda}
    except ImportError:
        data["torch"] = {"installed": False}
    print(json.dumps(data, indent=2, ensure_ascii=False))
    if not data["gpu"]["ok"]:
        print("WARNING: NVIDIA GPU not available; do not begin avatar benchmark.", file=sys.stderr)
    if not os.path.ismount("/runpod-volume"):
        print("WARNING: /runpod-volume is not a confirmed mount. Verify durable storage BEFORE model downloads.", file=sys.stderr)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
