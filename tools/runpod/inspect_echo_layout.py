#!/usr/bin/env python3
"""Bounded, read-only inventory of likely EchoMimic config/model locations.

No imports from engine, file content reading, downloads, writes or GPU.
Only whitelisted root directories, depth and entry limits.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
SCOPES = ("config", "experiments/echomimic_v3", "models", "pretrained_models")
MAX_DEPTH = 3
MAX_ENTRIES = 450
MAX_MATCHES = 65
CONFIG_SUFFIXES = (".yaml", ".yml", ".json")
TOKENS = ("wan", "echo", "flash", "wav2vec", "audio", "config", "vae")


def inventory():
    result = {
        "status": "echo_layout_inventory_only", "inference_executed": False,
        "files_written": False, "engine_imported": False, "scopes": {},
    }
    for scope in SCOPES:
        base = ROOT / scope
        data = {"exists": base.is_dir() and not base.is_symlink(),
                "matches": [], "inspected_entries": 0, "truncated": False}
        if not data["exists"]:
            result["scopes"][scope] = data
            continue
        queue = [(base, 0)]
        while queue and data["inspected_entries"] < MAX_ENTRIES and len(data["matches"]) < MAX_MATCHES:
            directory, depth = queue.pop(0)
            try:
                with os.scandir(directory) as scan:
                    entries = sorted(scan, key=lambda entry: entry.name)[:MAX_ENTRIES]
            except OSError:
                continue
            for entry in entries:
                data["inspected_entries"] += 1
                if data["inspected_entries"] > MAX_ENTRIES:
                    data["truncated"] = True
                    break
                try:
                    if entry.is_symlink():
                        continue
                    relative = str(Path(entry.path).relative_to(ROOT))
                    name = entry.name.lower()
                    is_directory = entry.is_dir(follow_symlinks=False)
                    selected = any(token in name for token in TOKENS)
                    if is_directory:
                        if selected:
                            data["matches"].append({"relative_path": relative, "kind": "directory"})
                        if depth < MAX_DEPTH:
                            queue.append((Path(entry.path), depth + 1))
                    elif entry.is_file(follow_symlinks=False) and (name.endswith(CONFIG_SUFFIXES) or selected):
                        if name.endswith(CONFIG_SUFFIXES) or any(token in name for token in ("wav2vec", "config")):
                            data["matches"].append({"relative_path": relative, "kind": "file"})
                    if len(data["matches"]) >= MAX_MATCHES:
                        data["truncated"] = True
                        break
                except OSError:
                    continue
        if queue or data["inspected_entries"] >= MAX_ENTRIES:
            data["truncated"] = True
        result["scopes"][scope] = data
    result["note"] = "Names only. No config contents, CLI execution, model loading, or GPU use."
    return result


if __name__ == "__main__":
    print(json.dumps(inventory(), ensure_ascii=False, indent=2))
