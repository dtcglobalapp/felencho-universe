#!/usr/bin/env python3
"""Read-only inventory of the existing avatar inference entrypoints.

Never imports model modules, starts a GPU job, or prints file contents.
This tells Smart which known presets can be safely implemented next.
"""
from __future__ import annotations

import ast
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
ENTRIES = {
    "musetalk_realtime": ROOT / "scripts/realtime_inference.py",
    "echomimic_flash": ROOT / "experiments/echomimic_v3/infer_flash.py",
    "lina_musetalk_config": ROOT / "experiments/lina-musetalk-test/realtime.yaml",
    "lina_musetalk_audio": ROOT / "experiments/lina-musetalk-test/audio-5sec.wav",
    "lina_echomimic_image": ROOT / "assets/lina/lina-2x3.jpg",
    "echomimic_models": ROOT / "experiments/echomimic_v3/flash/transformer/diffusion_pytorch_model.safetensors",
    "musetalk_models": ROOT / "models/musetalkV15/unet.pth",
}

def arguments_from_source(src: str) -> list[str]:
    """Identify constant argparse option names without executing source."""
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return []
    args = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        if node.func.attr != "add_argument":
            continue
        for arg in node.args:
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                if arg.value.startswith("--") and len(arg.value) <= 80:
                    args.append(arg.value)
    return sorted(set(args))[:70]

def collect() -> dict:
    report = {"status": "inspection_only", "generated_utc": datetime.now(timezone.utc).isoformat(), "paths": {}}
    for label, path in ENTRIES.items():
        item = {"exists": path.is_file()}
        if path.is_file():
            stats = path.stat()
            item["bytes"] = stats.st_size
            if path.suffix == ".py" and stats.st_size <= 250_000:
                content = path.read_bytes()
                item["sha256"] = hashlib.sha256(content).hexdigest()
                item["cli_arguments"] = arguments_from_source(content.decode("utf-8", errors="replace"))
        report["paths"][label] = item
    return report

if __name__ == "__main__":
    print(json.dumps(collect(), ensure_ascii=False, indent=2))
