#!/usr/bin/env python3
"""Felencho Mundial: metadata-only, non-invasive Mac inventory.

No service startup/shutdown, no API calls, no reads of user file contents,
no secret values, no subprocess shell, no writes except an explicit --output.
Standard library only. Designed for Mac Apple Silicon.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys

PORTS = (7892, 3002, 7894)
SECRET_NAMES = (".env", ".env.local", ".env.production", ".env.development",
                ".npmrc", ".pypirc", "id_rsa", "id_ed25519",
                "credentials.json", "service-account.json")
ROOTS = {
    "qwen_tts_lab": "~/felencho-qwen3-tts-lab",
    "hf_cache": "~/.cache/huggingface/hub",
    "mlx_cache": "~/.cache/mlx",
    "whisper_cache": "~/.cache/whisper",
    "ollama_models": "~/.ollama/models",
    "project_memory": "project-memory",
    "local_library": "~/Documents",
    "desktop": "~/Desktop",
    "external_volumes": "/Volumes",
}
TOOLS = ("git", "python3", "python3.12", "node", "npm", "brew",
         "ffmpeg", "docker", "ollama", "supabase", "lsof")

def run(*args, cwd=None, timeout=6):
    try:
        p = subprocess.run(args, cwd=cwd, capture_output=True, text=True,
                           timeout=timeout, check=False, env={
                               "PATH": os.environ.get("PATH", "/usr/bin:/bin:/usr/sbin:/sbin"),
                               "HOME": str(Path.home()), "LC_ALL": "C",
                           })
        return p.stdout.strip() if p.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None

def safe_count(path, maximum=10000):
    """Count immediate children only; never follow symlinks or open content."""
    counts = {"files": 0, "directories": 0, "symlinks": 0,
              "total_immediate_bytes": 0, "truncated": False}
    try:
        with os.scandir(path) as entries:
            for i, item in enumerate(entries):
                if i >= maximum:
                    counts["truncated"] = True
                    break
                if item.is_symlink():
                    counts["symlinks"] += 1
                elif item.is_dir(follow_symlinks=False):
                    counts["directories"] += 1
                elif item.is_file(follow_symlinks=False):
                    counts["files"] += 1
                    try:
                        counts["total_immediate_bytes"] += item.stat(follow_symlinks=False).st_size
                    except OSError:
                        pass
    except (OSError, PermissionError):
        counts["unreadable"] = True
    return counts

def root_info(path):
    try:
        s = path.lstat()
        return {"exists": True, "kind": "symlink" if path.is_symlink()
                else "directory" if path.is_dir() else "file",
                "metadata": safe_count(path) if path.is_dir() and not path.is_symlink() else {},
                "modified_utc": dt.datetime.fromtimestamp(s.st_mtime, dt.timezone.utc).isoformat()}
    except OSError:
        return {"exists": False}

def git_info(repo):
    if not (repo / ".git").exists():
        return {"git_checkout": False}
    commit = run("git", "rev-parse", "HEAD", cwd=repo)
    branch = run("git", "branch", "--show-current", cwd=repo)
    statuses = run("git", "status", "--porcelain=v1", "-uno", cwd=repo)
    tracked = run("git", "ls-files", cwd=repo)
    untracked = run("git", "ls-files", "--others", "--exclude-standard", cwd=repo)
    # Paths and remote URLs might contain user/private names or credentials.
    return {"git_checkout": True, "branch": branch, "head_sha": commit,
            "tracked_count": len(tracked.splitlines()) if tracked is not None else None,
            "untracked_count": len(untracked.splitlines()) if untracked is not None else None,
            "modified_tracked_count": len(statuses.splitlines()) if statuses is not None else None,
            "remote_configured": bool(run("git", "remote", cwd=repo)),
            "expected_branches": {
                n: bool(run("git", "show-ref", "--verify", "--quiet",
                            "refs/heads/" + n, cwd=repo) is not None)
                for n in ()
            }}

def ports_info():
    result = {}
    for port in PORTS:
        # pid and COMMAND only; avoid command arguments, env and open file paths
        output = run("lsof", "-nP", "-iTCP:" + str(port), "-sTCP:LISTEN", "-Fpc")
        if output is None:
            result[str(port)] = {"listener_observed": False, "method": "lsof", "reliable": False}
            continue
        lines = output.splitlines()
        pids = sorted(set(x[1:] for x in lines if x.startswith("p") and x[1:].isdigit()))
        names = sorted(set(x[1:] for x in lines if x.startswith("c") and x[1:]))
        result[str(port)] = {"listener_observed": bool(pids), "pids": pids,
                             "process_names": names, "method": "lsof"}
    return result

def versions():
    data = {}
    for name in TOOLS:
        exe = shutil.which(name)
        data[name] = {"installed": bool(exe)}
    for name, cmd in {
        "python": ("python3", "--version"),
        "node": ("node", "--version"),
        "npm": ("npm", "--version"),
        "brew": ("brew", "--version"),
    }.items():
        v = run(*cmd)
        if v:
            data[name]["version"] = v.splitlines()[0][:90]
    return data

def drive_info():
    # Disk names and mount paths are intentionally not recorded.
    mounts = Path("/Volumes")
    result = {"mount_count": 0, "readable": False}
    try:
        result["mount_count"] = sum(1 for item in mounts.iterdir()
                                    if item.is_dir() and not item.is_symlink())
        result["readable"] = True
    except OSError:
        pass
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", help="Local Git checkout")
    parser.add_argument("--output", help="Optional local JSON report; never upload to GitHub")
    args = parser.parse_args()
    repo = Path(args.repo).expanduser().resolve()
    roots = {}
    for name, raw in ROOTS.items():
        path = (repo / raw) if not raw.startswith(("~", "/")) else Path(raw).expanduser()
        roots[name] = root_info(path)
    # Name of secret files is not output; only existence counts.
    secret_count = 0
    for parent in (repo, repo / "tools", Path.home()):
        for name in SECRET_NAMES:
            try:
                secret_count += int((parent / name).exists())
            except OSError:
                pass
    report = {
        "schema": "felencho-readonly-inventory/v1",
        "collected_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "mode": "read_only_metadata_only",
        "note": "Not a backup. No model weights, databases, secrets, logs or files were copied.",
        "system": {"os": platform.system(), "release": platform.release(),
                   "architecture": platform.machine(), "python": platform.python_version()},
        "services": ports_info(),
        "tools": versions(),
        "git": git_info(repo),
        "known_storage_locations": roots,
        "external_storage": drive_info(),
        "possible_secret_file_count_in_limited_locations": secret_count,
        "external_database_memory": {
            "status": "not_inspected",
            "tables_to_verify": ["felencho_memories", "felencho_memory_inbox",
                                 "lumina_shared_memory", "lumina_user_memory",
                                 "lumina_brain_memory"],
        },
        "not_inspected": ["actual model weights and hashes", "database rows",
                          "volume encryption", "backup freshness", "restoration",
                          "audio device routing", "Keychain contents", "credentials"],
    }
    data = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        dest = Path(args.output).expanduser().resolve()
        if dest.exists():
            parser.error("Output already exists: refusing to overwrite")
        if not dest.parent.is_dir():
            parser.error("Output directory does not exist")
        # Permission-restricted file; do not allow file overwrite.
        fd = os.open(dest, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(data)
        print("Report saved locally. Do not publish it.")
    else:
        print(data, end="")
    return 0

if __name__ == "__main__":
    sys.exit(main())
