#!/usr/bin/env python3
"""RunPod -> GitHub Issues bridge, phase 1: read-only diagnostics.

Only nine hardcoded read-only actions are supported; no inference. No arbitrary commands,
shell, model execution, file download, or Pod lifecycle operations.
"""
from __future__ import annotations

import argparse
import getpass
import json
import os
import secrets
import signal
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPO = "dtcglobalapp/felencho-universe"
ISSUES_URL = "https://api.github.com/repos/" + REPO + "/issues"
JOB_TITLE = "[FAE-RUNPOD] diagnose"
JOB_BODY = "FAE_RUNPOD_JOB_V1\naction=diagnose"
INSPECT_TITLE = "[FAE-RUNPOD] inspect"
INSPECT_BODY = "FAE_RUNPOD_JOB_V1\naction=inspect"
PREFLIGHT_TITLE = "[FAE-RUNPOD] preflight"
PREFLIGHT_BODY = "FAE_RUNPOD_JOB_V1\naction=preflight"
MEDIA_TITLE = "[FAE-RUNPOD] media-inspect"
MEDIA_BODY = "FAE_RUNPOD_JOB_V1\naction=media-inspect"
ENV_TITLE = "[FAE-RUNPOD] inference-env-inspect"
ENV_BODY = "FAE_RUNPOD_JOB_V1\naction=inference-env-inspect"
ECHO_SOURCE_TITLE = "[FAE-RUNPOD] echo-source-inspect"
ECHO_SOURCE_BODY = "FAE_RUNPOD_JOB_V1\naction=echo-source-inspect"
ECHO_CLI_TITLE = "[FAE-RUNPOD] echo-cli-inspect"
ECHO_CLI_BODY = "FAE_RUNPOD_JOB_V1\naction=echo-cli-inspect"
ECHO_CONFIG_TITLE = "[FAE-RUNPOD] echo-config-inspect"
ECHO_CONFIG_BODY = "FAE_RUNPOD_JOB_V1\naction=echo-config-inspect"
ECHO_LAYOUT_TITLE = "[FAE-RUNPOD] echo-layout-inspect"
ECHO_LAYOUT_BODY = "FAE_RUNPOD_JOB_V1\naction=echo-layout-inspect"
RESULT_TAG = "FAE_RUNPOD_RESULT_V1"
ROOT = Path("/workspace/felencho-avatar-engine")
SECRETS_FILE = Path.home() / ".config/felencho-runpod/bridge-token"  # never commit
DIAG_SCRIPT = Path(__file__).resolve().with_name("diagnose.py")
INSPECT_SCRIPT = Path(__file__).resolve().with_name("inspect_presets.py")
PREFLIGHT_SCRIPT = Path(__file__).resolve().with_name("preflight_5s.py")
MEDIA_SCRIPT = Path(__file__).resolve().with_name("inspect_media_tools.py")
ENV_SCRIPT = Path(__file__).resolve().with_name("inspect_inference_env.py")
ECHO_SOURCE_SCRIPT = Path(__file__).resolve().with_name("inspect_echo_source.py")
ECHO_CLI_SCRIPT = Path(__file__).resolve().with_name("inspect_echo_cli.py")
ECHO_CONFIG_SCRIPT = Path(__file__).resolve().with_name("inspect_echo_config.py")
ECHO_LAYOUT_SCRIPT = Path(__file__).resolve().with_name("inspect_echo_layout.py")

class GithubError(RuntimeError):
    pass

def api(path: str, token: str, method: str = "GET", body: dict | None = None):
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    req = Request(
        "https://api.github.com" + path, data=payload, method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Felencho-RunPod-Bridge/1",
            **({"Content-Type": "application/json"} if payload else {}),
        },
    )
    try:
        with urlopen(req, timeout=15) as resp:
            raw = resp.read(1_000_000)
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        raise GithubError(f"GitHub HTTP {exc.code} for {method} {path}") from exc
    except (URLError, TimeoutError) as exc:
        raise GithubError("GitHub connection failed") from exc

def load_token() -> str:
    if not SECRETS_FILE.is_file():
        raise SystemExit("Bridge not configured. Run --setup.")
    token = SECRETS_FILE.read_text().strip()
    if len(token) < 20:
        raise SystemExit("Invalid bridge token.")
    return token

def setup() -> None:
    print("Fine-grained GitHub token: repo " + REPO + ", Issues read/write only.")
    token = getpass.getpass("Paste token (hidden): ").strip()
    if len(token) < 20:
        raise SystemExit("Token too short; nothing saved.")
    me = api("/user", token)
    if not me.get("login"):
        raise SystemExit("GitHub credential validation failed.")
    SECRETS_FILE.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    SECRETS_FILE.parent.chmod(0o700)
    fd = os.open(str(SECRETS_FILE), os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w") as fh:
        fh.write(token + "\n")
    SECRETS_FILE.chmod(0o600)
    print("Connected to GitHub as", me["login"], "Token stored locally (0600).")

def read_only_job(action: str) -> str:
    scripts = {"diagnose": DIAG_SCRIPT, "inspect": INSPECT_SCRIPT, "preflight": PREFLIGHT_SCRIPT, "media-inspect": MEDIA_SCRIPT, "inference-env-inspect": ENV_SCRIPT, "echo-source-inspect": ECHO_SOURCE_SCRIPT, "echo-cli-inspect": ECHO_CLI_SCRIPT, "echo-config-inspect": ECHO_CONFIG_SCRIPT, "echo-layout-inspect": ECHO_LAYOUT_SCRIPT}
    if action not in scripts:
        raise ValueError("Unknown action")
    script = scripts[action]
    args = [sys.executable, str(script)]
    if action == "preflight":
        args.extend(["--engine", "both"])
    if not script.is_file():
        return "Read-only script absent: " + str(script)
    proc = subprocess.run(
        args,
        cwd=str(ROOT), capture_output=True, text=True, timeout=25,
    )
    text = proc.stdout if proc.returncode == 0 else "Read-only job returned nonzero status:\n" + (proc.stdout or proc.stderr)
    # GitHub comment limited in size; always bound output
    return text[-12000:]

def requested_action(issue: dict) -> str | None:
    title = issue.get("title")
    body = (issue.get("body") or "").strip()
    if title == JOB_TITLE and body == JOB_BODY:
        return "diagnose"
    if title == INSPECT_TITLE and body == INSPECT_BODY:
        return "inspect"
    if title == PREFLIGHT_TITLE and body == PREFLIGHT_BODY:
        return "preflight"
    if title == MEDIA_TITLE and body == MEDIA_BODY:
        return "media-inspect"
    if title == ENV_TITLE and body == ENV_BODY:
        return "inference-env-inspect"
    if title == ECHO_SOURCE_TITLE and body == ECHO_SOURCE_BODY:
        return "echo-source-inspect"
    if title == ECHO_CLI_TITLE and body == ECHO_CLI_BODY:
        return "echo-cli-inspect"
    if title == ECHO_CONFIG_TITLE and body == ECHO_CONFIG_BODY:
        return "echo-config-inspect"
    if title == ECHO_LAYOUT_TITLE and body == ECHO_LAYOUT_BODY:
        return "echo-layout-inspect"
    return None

def diagnostic() -> str:
    """Backward-compatible function retained for existing unit tests."""
    return read_only_job("diagnose")

def approved(issue: dict, allowed_author: str) -> bool:
    return (
        issue.get("state") == "open"
        and "pull_request" not in issue
        and requested_action(issue) is not None
        and issue.get("user", {}).get("login", "").lower() == allowed_author.lower()
        and isinstance(issue.get("number"), int)
    )

def process_one(token: str, issue: dict, allowed_author: str) -> bool:
    if not approved(issue, allowed_author):
        return False
    number = issue["number"]
    base = "/repos/" + REPO + "/issues/" + str(number)
    # A matching result comment indicates job was already processed if close failed.
    comments = api(base + "/comments?per_page=100", token)
    if any(RESULT_TAG in (c.get("body") or "") for c in comments):
        api(base, token, "PATCH", {"state": "closed"})
        return True
    action = requested_action(issue)
    result = diagnostic() if action == "diagnose" else read_only_job(action)
    body = RESULT_TAG + "\n\nRead-only RunPod action: " + action + " (no GPU inference triggered):\n\n```json\n" + result + "\n```"
    api(base + "/comments", token, "POST", {"body": body})
    api(base, token, "PATCH", {"state": "closed"})
    print("Completed diagnostic job #" + str(number), flush=True)
    return True

def poll(token: str, allowed_author: str) -> int:
    entries = api("/repos/" + REPO + "/issues?state=open&per_page=50&sort=created&direction=desc", token)
    count = 0
    for issue in entries:
        if process_one(token, issue, allowed_author):
            count += 1
    return count

def main():
    parser = argparse.ArgumentParser(description="Felencho RunPod Bridge (read-only diagnostics and preflight)")
    parser.add_argument("--setup", action="store_true", help="Safely save scoped GitHub token")
    parser.add_argument("--once", action="store_true", help="Check pending jobs once and exit")
    parser.add_argument("--interval", type=int, default=30, help="Polling interval, seconds")
    parser.add_argument("--allowed-author", default="dtcglobalapp", help="Only accept jobs by this GitHub login")
    args = parser.parse_args()
    if args.setup:
        setup()
        return
    if not 15 <= args.interval <= 600:
        raise SystemExit("Polling interval must be 15-600 seconds.")
    token = load_token()
    print("RunPod bridge started: READ-ONLY DIAGNOSE/INSPECT/PREFLIGHT/MEDIA-INSPECT/INFERENCE-ENV-INSPECT/ECHO-SOURCE-INSPECT/ECHO-CLI-INSPECT/ECHO-CONFIG-INSPECT/ECHO-LAYOUT-INSPECT; author", args.allowed_author, flush=True)
    while True:
        try:
            poll(token, args.allowed_author)
        except GithubError as exc:
            print("Transient GitHub error:", exc, flush=True)
        if args.once:
            return
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
