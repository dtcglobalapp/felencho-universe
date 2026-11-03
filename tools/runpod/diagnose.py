#!/usr/bin/env python3
"""Read-only diagnostic snapshot for Felencho Actor Engine on RunPod."""
import json
from datetime import datetime, timezone
from pathlib import Path
import subprocess

ROOT = Path("/workspace/felencho-avatar-engine")
ALLOWED_LOGS = {
    "lina_musetalk": ROOT / "experiments/lina-musetalk-test/inference.log",
    "lina_echomimic": ROOT / "experiments/echomimic_v3/outputs/lina-test-01/inference.log",
}
ALLOWED_OUTPUTS = {
    "lina_musetalk": ROOT / "results/v15/avatars/lina/vid_output",
    "lina_echomimic": ROOT / "experiments/echomimic_v3/outputs/lina-test-01",
}

def gpu():
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.used,memory.total,utilization.gpu",
             "--format=csv,noheader"], capture_output=True, text=True, timeout=5)
        return result.stdout.strip() if result.returncode == 0 else result.stderr.strip()
    except (OSError, subprocess.TimeoutExpired) as error:
        return str(error)

def snapshot():
    output = {"timestamp_utc": datetime.now(timezone.utc).isoformat(), "gpu": gpu(), "engines": {}}
    for key, path in ALLOWED_LOGS.items():
        lines = path.read_text(errors="replace").splitlines()[-20:] if path.is_file() else []
        video_dir = ALLOWED_OUTPUTS[key]
        videos = []
        if video_dir.is_dir():
            for video in sorted(video_dir.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)[:5]:
                videos.append({"name": video.name, "bytes": video.stat().st_size})
        output["engines"][key] = {"log_lines": lines, "videos": videos}
    return output

if __name__ == "__main__":
    print(json.dumps(snapshot(), indent=2, ensure_ascii=False))
