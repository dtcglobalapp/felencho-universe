#!/usr/bin/env python3
"""Read-only installed distribution metadata check for the EchoMimic local venv.

No third-party imports, subprocesses, model loading, GPU or writes.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3")
DISTRIBUTIONS = ("librosa", "decord", "moviepy", "accelerate", "opencv-python",
                 "Pillow", "einops", "imageio", "pyloudnorm")
NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$")
VERSION = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.+!_~-]{0,95}$")


def normalize(value):
    return re.sub(r"[-_.]+", "-", value).lower()


def inventory(root=ROOT):
    report = {"status": "metadata_inspection_blocked", "third_party_imported": False,
              "gpu_inference_executed": False, "files_written": False, "distributions": {}}
    lib = root / "venv/lib"
    if not lib.is_dir() or lib.is_symlink():
        return {**report, "reason": "venv_lib_missing"}
    dirs = [p for p in lib.iterdir() if p.is_dir() and not p.is_symlink()
            and re.fullmatch(r"python3\.[0-9]{1,2}", p.name)]
    if len(dirs) != 1:
        return {**report, "reason": "python_version_ambiguous"}
    packages = dirs[0] / "site-packages"
    if not packages.is_dir() or packages.is_symlink():
        return {**report, "reason": "site_packages_missing"}
    found = {}
    allowed = {normalize(n) for n in DISTRIBUTIONS}
    for entry in packages.iterdir():
        if not entry.is_dir() or entry.is_symlink() or not entry.name.endswith(".dist-info"):
            continue
        if len(entry.name) > 180:
            continue
        metadata = entry / "METADATA"
        if not metadata.is_file() or metadata.is_symlink() or metadata.stat().st_size > 262144:
            continue
        try:
            with metadata.open("r", encoding="utf-8") as fh:
                lines = [fh.readline().rstrip("\r\n") for _ in range(100)]
        except (OSError, UnicodeError):
            continue
        names = [line[6:].strip() for line in lines if line.startswith("Name: ")]
        versions = [line[9:].strip() for line in lines if line.startswith("Version: ")]
        if (len(names) != 1 or len(versions) != 1
                or not NAME.fullmatch(names[0]) or not VERSION.fullmatch(versions[0])):
            continue
        key = normalize(names[0])
        if key in allowed:
            found.setdefault(key, []).append(versions[0])
    for name in DISTRIBUTIONS:
        versions = found.get(normalize(name), [])
        report["distributions"][name] = {
            "installed_metadata": len(versions) == 1,
            "version": versions[0] if len(versions) == 1 else None,
            "ambiguous": len(versions) > 1,
        }
    report["status"] = ("metadata_complete" if all(v["installed_metadata"]
                        for v in report["distributions"].values()) else "metadata_incomplete")
    report["note"] = "Distribution metadata does not prove successful runtime imports."
    return report


if __name__ == "__main__":
    print(json.dumps(inventory(), sort_keys=True, indent=2))
