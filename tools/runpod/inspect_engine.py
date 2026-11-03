#!/usr/bin/env python3
"""Inspect fixed avatar-engine inputs without importing or executing model code."""
from __future__ import annotations

import ast
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
V3 = ROOT / "experiments/echomimic_v3"
SCRIPTS = {
    "echomimic_infer_flash": V3 / "infer_flash.py",
    "musetalk_realtime": ROOT / "scripts/realtime_inference.py",
}
INPUTS = {
    "lina_image": ROOT / "assets/lina/lina-2x3.jpg",
    "echomimic_demo_voice": Path("/tmp/felencho-v3-5sec.wav"),
    "musetalk_demo_voice": ROOT / "experiments/lina-musetalk-test/audio-5sec.wav",
    "echomimic_weights": V3 / "flash/transformer/diffusion_pytorch_model.safetensors",
    "musetalk_weights": ROOT / "models/musetalkV15/unet.pth",
    "musetalk_whisper": ROOT / "models/whisper/config.json",
}
# Never report contents of secrets, auth files, .env or arbitrary paths.

def parse_flags(source: str) -> list[str]:
    tree = ast.parse(source)
    flags: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "add_argument":
            for arg in node.args:
                if isinstance(arg, ast.Constant) and isinstance(arg.value, str) and arg.value.startswith("--"):
                    flags.add(arg.value)
    return sorted(flags)

def scan_script(path: Path) -> dict:
    if not path.is_file():
        return {"present": False}
    source = path.read_text(encoding="utf-8", errors="replace")
    try:
        flags = parse_flags(source)
        issue = None
    except SyntaxError as exc:
        flags, issue = [], f"syntax error on line {exc.lineno}"
    # Cap output; never return source code wholesale.
    return {"present": True, "size_bytes": path.stat().st_size, "cli_flags": flags[:100], "parse_error": issue}

def inspect() -> dict:
    return {
        "phase": "phase2-preflight-read-only",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "scripts": {name: scan_script(path) for name, path in SCRIPTS.items()},
        "inputs": {name: {"exists": p.is_file(), "bytes": p.stat().st_size if p.is_file() else 0}
                   for name, p in INPUTS.items()},
    }

if __name__ == "__main__":
    print(json.dumps(inspect(), indent=2, ensure_ascii=False))
