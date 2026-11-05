#!/usr/bin/env python3
"""Read-only fixed-path EchoMimic VAE temporal-ratio inventory.

Never imports engine/torch, executes subprocesses, loads weights, writes files,
or follows symlinks. Reports only numeric ratio settings from approved configs
and AST numeric assignments, not arbitrary configuration content.
"""
from __future__ import annotations
import ast
import hashlib
import json
import re
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3")
CANDIDATES = (
    "config/config.yaml",
    "flash/Wan2.1-Fun-V1.1-1.3B-InP/config.json",
    "flash/Wan2.1-Fun-V1.1-1.3B-InP/configuration.json",
    "flash/Wan2.1-Fun-V1.1-1.3B-InP/vae/config.json",
    "flash/Wan2.1-Fun-V1.1-1.3B-InP/Wan2.1_VAE.pth",
)
MAX_CONFIG_BYTES = 128 * 1024
RATIO_KEY = "temporal_compression_ratio"


def find_json_ratios(obj, prefix="", depth=0):
    if depth > 7:
        return []
    found = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            if not isinstance(key, str):
                continue
            where = f"{prefix}.{key}" if prefix else key
            if key == RATIO_KEY and type(value) is int and 1 <= value <= 128:
                found.append({"key": where, "value": value})
            elif isinstance(value, (dict, list)):
                found.extend(find_json_ratios(value, where, depth + 1))
    elif isinstance(obj, list):
        for i, value in enumerate(obj[:50]):
            found.extend(find_json_ratios(value, f"{prefix}[{i}]", depth + 1))
    return found[:24]


def inspect():
    report = {"status": "echo_vae_ratio_read_only", "inference_executed": False,
              "model_loaded": False, "files_written": False, "configs": {}}
    for rel in CANDIDATES:
        path = ROOT / rel
        info = {"exists": path.is_file(), "symlink": path.is_symlink()}
        if not info["exists"] or info["symlink"]:
            report["configs"][rel] = info
            continue
        size = path.stat().st_size
        info["bytes"] = size
        if path.suffix not in (".yaml", ".json") or size > MAX_CONFIG_BYTES:
            report["configs"][rel] = info
            continue
        raw = path.read_bytes()
        info["sha256"] = hashlib.sha256(raw).hexdigest()
        try:
            if path.suffix == ".json":
                info["ratio_literals"] = find_json_ratios(json.loads(raw))
            else:
                values = []
                for idx, line in enumerate(raw.decode("utf-8").splitlines(), 1):
                    m = re.fullmatch(r"\s*temporal_compression_ratio\s*:\s*([0-9]{1,3})\s*(?:#.*)?", line)
                    if m:
                        v = int(m.group(1))
                        if 1 <= v <= 128:
                            values.append({"line": idx, "value": v})
                info["ratio_literals"] = values[:24]
        except (ValueError, UnicodeError, RecursionError):
            info["parse_error"] = True
        report["configs"][rel] = info
    report["interpretation"] = (
        "Ratio is confirmed only if a config literal is verified as the one used by "
        "the active VAE. Absence does not prove the model ratio."
    )
    return report


if __name__ == "__main__":
    print(json.dumps(inspect(), indent=2))
