#!/usr/bin/env python3
"""FAE phase 2B: safe, read-only preflight for fixed five-second Lina presets.

No model imports, GPU inference, shell execution, writes, or remote downloads.
This file is intentionally NOT connected to the GitHub Issue bridge.
"""
from __future__ import annotations

import argparse
import json
import shutil
import wave
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
INPUTS = {
    "musetalk": (
        "scripts/realtime_inference.py",
        "experiments/lina-musetalk-test/realtime.yaml",
        "experiments/lina-musetalk-test/audio-5sec.wav",
        "models/musetalkV15/unet.pth",
    ),
    "echomimic": (
        "experiments/echomimic_v3/infer_flash.py",
        "assets/lina/lina-2x3.jpg",
        "experiments/lina-musetalk-test/audio-5sec.wav",
        "experiments/echomimic_v3/flash/transformer/diffusion_pytorch_model.safetensors",
    ),
}
AUDIO = ROOT / "experiments/lina-musetalk-test/audio-5sec.wav"
EXPECTED_SECONDS = 5.0
DURATION_TOLERANCE = 0.25


def inspect(engine: str) -> dict:
    files = {}
    for relative in INPUTS[engine]:
        path = ROOT / relative
        # stat only; never show file content or reveal unrelated local paths.
        files[relative] = {"exists": path.is_file(), "bytes": path.stat().st_size if path.is_file() else None}
    audio = {"valid_wav": False, "duration_seconds": None, "error": None}
    try:
        with wave.open(str(AUDIO), "rb") as wav:
            frames, sample_rate = wav.getnframes(), wav.getframerate()
            if sample_rate <= 0:
                raise ValueError("Invalid sample rate")
            audio["valid_wav"] = True
            audio["duration_seconds"] = round(frames / sample_rate, 3)
    except (OSError, EOFError, ValueError, wave.Error) as exc:
        audio["error"] = type(exc).__name__
    checks = {
        "all_required_files_present": all(v["exists"] and v["bytes"] > 0 for v in files.values()),
        "audio_is_five_seconds": bool(audio["valid_wav"] and abs(audio["duration_seconds"] - EXPECTED_SECONDS) <= DURATION_TOLERANCE),
        "ffmpeg_available": shutil.which("ffmpeg") is not None,
    }
    return {
        "status": "preflight_pass" if all(checks.values()) else "preflight_blocked",
        "engine": engine,
        "preset": "lina_5s",
        "inference_executed": False,
        "checks": checks,
        "audio": audio,
        "files": files,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only Lina five-second preset validation")
    parser.add_argument("--engine", choices=sorted(INPUTS), required=True)
    args = parser.parse_args()
    report = inspect(args.engine)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report["status"] == "preflight_pass" else 2)


if __name__ == "__main__":
    main()
