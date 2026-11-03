"""End-to-end *offline rehearsal* for the proposed one-shot Lina job.

Never runs EchoMimic, creates MP4, calls GPU, connects to the Bridge or
exposes an Issue action. Only a hardcoded Python no-op/timeout fixture may
be spawned. All filesystem changes are restricted to a caller-owned, private
scratch workspace; never pass the actual avatar engine tree.
"""
from __future__ import annotations

import os
from pathlib import Path

from job_claims_offline import ClaimRejected, claim, finish
from private_output_sandbox import (
    PrivateOutputRejected,
    _open_trusted_dir,
    create_private_job_directory,
)
from process_timeout_rehearsal import rehearse
from render_dry_run import validate_request

# Deliberately cannot select model executables, image paths, shell args or FFmpeg.
_ALLOWED_CASES = frozenset(("quick", "timeout"))


def rehearse_lina_job(issue: dict, workspace: Path, *, fixture: str = "quick") -> dict:
    """Exercise validation -> persistent claim -> private output -> fixture -> close.

    Not a production runner. All callers must explicitly supply a trusted
    scratch workspace; no default, no CLI, no Bridge registration.
    """
    if type(workspace) is not Path:
        raise ValueError("workspace_must_be_path")
    if type(fixture) is not str or fixture not in _ALLOWED_CASES:
        raise ValueError("only_fixed_test_fixtures")
    plan = validate_request(issue)

    # Ensure owner and mode of the workspace BEFORE opening the SQLite file.
    workspace_fd = _open_trusted_dir(workspace)
    os.close(workspace_fd)
    database = workspace / "claims.sqlite3"
    if database.is_symlink():
        raise ValueError("registry_symlink_forbidden")

    # Atomic, permanent claim: the same Issue is never retried automatically.
    claim(database, plan.request_id, plan.fingerprint)
    state = "failed"
    outcome = "fixture_failed"
    try:
        folder = create_private_job_directory(
            workspace, "job-" + f"{plan.request_id:010d}"
        )
        # No payload ever written to the private job folder.
        result = rehearse(
            fixture, timeout_seconds=0.15 if fixture == "timeout" else 1.0
        )
        if result.status == "exited" and result.returncode == 0:
            state = "complete"
            outcome = "rehearsal_complete_no_media"
        elif result.timed_out:
            state = "interrupted"
            outcome = "fixture_timeout"
        else:
            outcome = "fixture_failed"
    except (PrivateOutputRejected, OSError, RuntimeError, ValueError):
        outcome = "setup_or_fixture_failed"
    finally:
        # The job remains claimed if this write fails, forcing manual review.
        finish(database, plan.request_id, plan.fingerprint, state)

    return {
        "status": outcome,
        "job_state": state,
        "request_id": plan.request_id,
        "folder_reserved": outcome in (
            "rehearsal_complete_no_media", "fixture_timeout", "fixture_failed"
        ),
        "duplicate_retries_blocked": True,
        "media_created": False,
        "mp4_validation": "not_applicable_no_mp4",
        "engine_imported": False,
        "gpu_inference_executed": False,
        "bridge_render_enabled": False,
        "note": "This is a process-fixture exercise, not real rendering readiness.",
    }
