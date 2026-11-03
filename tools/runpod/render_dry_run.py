#!/usr/bin/env python3
"""Offline, fail-closed Phase 2C dry-run contract. NEVER launches inference.

Not registered as a bridge action. No subprocesses, GPU, files, or writes.
A real runner requires durable atomic claims/locks and separate security review.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass

PRESET = "lina_echomimic_5s"
ENGINE = "echomimic_v3_flash"
DURATION_SECONDS = 5
MAX_RUNTIME_SECONDS = 240
MAX_MP4_BYTES = 60 * 1024 * 1024
OUTPUT_PREFIX = "/workspace/felencho-runpod-bridge/outputs"
ALLOWED_ISSUE_TITLE = "[FAE-RUNPOD] render-lina-5s"
ALLOWED_ISSUE_BODY = "FAE_RUNPOD_JOB_V1\naction=render-lina-5s"
ALLOWED_AUTHOR = "dtcglobalapp"
REQUEST_PATTERN = re.compile(r"^[1-9][0-9]{0,9}$")


@dataclass(frozen=True)
class RenderPlan:
    request_id: int
    preset: str
    engine: str
    duration_seconds: int
    max_runtime_seconds: int
    max_mp4_bytes: int
    relative_output: str
    fingerprint: str


def validate_request(issue: dict, claimed_ids: frozenset[int] = frozenset()) -> RenderPlan:
    """Pure validation only. The returned plan is NOT permission to run a GPU."""
    if type(issue) is not dict or set(issue) != {"number", "title", "body", "state", "user"}:
        raise ValueError("invalid_issue_schema")
    if (issue["title"] != ALLOWED_ISSUE_TITLE or issue["body"] != ALLOWED_ISSUE_BODY
            or issue["state"] != "open"):
        raise ValueError("request_not_allowlisted")
    user = issue["user"]
    if type(user) is not dict or user.get("login") != ALLOWED_AUTHOR:
        raise ValueError("unauthorized_author")
    number = issue["number"]
    if type(number) is not int or not REQUEST_PATTERN.fullmatch(str(number)):
        raise ValueError("invalid_issue_number")
    if number in claimed_ids:
        raise ValueError("duplicate_request")
    fingerprint = hashlib.sha256(
        f"{number}:{PRESET}:{ENGINE}:{DURATION_SECONDS}".encode("ascii")
    ).hexdigest()
    return RenderPlan(
        request_id=number,
        preset=PRESET,
        engine=ENGINE,
        duration_seconds=DURATION_SECONDS,
        max_runtime_seconds=MAX_RUNTIME_SECONDS,
        max_mp4_bytes=MAX_MP4_BYTES,
        relative_output=f"job-{number:010d}/{PRESET}.mp4",
        fingerprint=fingerprint,
    )


def simulate(issue_number: int) -> dict:
    issue = {
        "number": issue_number,
        "title": ALLOWED_ISSUE_TITLE,
        "body": ALLOWED_ISSUE_BODY,
        "state": "open",
        "user": {"login": ALLOWED_AUTHOR},
    }
    plan = validate_request(issue)
    try:
        validate_request(issue, frozenset({issue_number}))
    except ValueError as exc:
        duplicate_rejected = str(exc) == "duplicate_request"
    else:
        duplicate_rejected = False
    return {
        "status": "offline_dry_run_only",
        "gpu_executed": False,
        "subprocess_executed": False,
        "files_written": False,
        "issue_bridge_enabled": False,
        "duplicate_rejected": duplicate_rejected,
        "plan": {
            "preset": plan.preset,
            "engine": plan.engine,
            "duration_seconds": plan.duration_seconds,
            "max_runtime_seconds": plan.max_runtime_seconds,
            "max_mp4_bytes": plan.max_mp4_bytes,
            "relative_output": plan.relative_output,
            "fingerprint": plan.fingerprint,
        },
        "blocked_until": [
            "verified_echo_dependencies_and_exact_local_inference_arguments",
            "atomic_persistent_lock_and_claim_registry",
            "process_group_timeout_and_cancellation_tests",
            "private_output_and_ffprobe_validation",
            "explicit_first_render_authorization",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline-only Lina rendering contract demo")
    parser.add_argument("--issue-number", type=int, default=100)
    args = parser.parse_args()
    print(json.dumps(simulate(args.issue_number), indent=2))


if __name__ == "__main__":
    main()
