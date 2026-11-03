#!/usr/bin/env python3
"""Read-only discovery of FFmpeg executables; no shell, installs or model imports."""
from __future__ import annotations
import json
import os
import shutil
import sys
from pathlib import Path

CANDIDATES = (
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/conda/bin/ffmpeg",
    "/opt/venv/bin/ffmpeg",
    "/workspace/venv/bin/ffmpeg",
    "/workspace/felencho-avatar-engine/venv/bin/ffmpeg",
    "/workspace/felencho-avatar-engine/.venv/bin/ffmpeg",
)
SEARCH_ROOTS = (
    Path("/opt/conda/lib"),
    Path("/usr/local/lib"),
    Path("/workspace/felencho-avatar-engine"),
)


def executable(path: Path) -> bool:
    return path.is_file() and os.access(path, os.X_OK)


def collect() -> dict:
    found = {}
    resolved = shutil.which("ffmpeg")
    if resolved:
        found["current_path"] = str(Path(resolved).resolve())
    for candidate in CANDIDATES:
        path = Path(candidate)
        if executable(path):
            found[candidate] = str(path.resolve())
    # Common pip wheel layout; do not traverse arbitrary directories or read files.
    for root in SEARCH_ROOTS:
        if root.is_dir():
            try:
                for package in root.glob("python*/site-packages/imageio_ffmpeg/binaries/ffmpeg*"):
                    if executable(package):
                        found["imageio_ffmpeg:" + str(package)] = str(package.resolve())
            except (OSError, PermissionError):
                pass
    return {
        "status": "media_tools_inspection_only",
        "inference_executed": False,
        "python_executable": sys.executable,
        "ffmpeg_in_bridge_path": resolved is not None,
        "ffmpeg_candidates": found,
        "ffmpeg_found": bool(found),
        "note": "Discovery is not a video transcode test; no executable was run.",
    }


if __name__ == "__main__":
    print(json.dumps(collect(), indent=2))
