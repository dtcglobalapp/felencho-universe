#!/usr/bin/env python3
"""Offline process supervision rehearsal, disconnected from RunPod Bridge.

Only runs fixed Python no-op / sleep snippets chosen by this file.
No GPU, model imports, user-provided commands, paths, or network.
This is NOT an inference runner, and has no CLI entrypoint.
"""
from __future__ import annotations

import os
import signal
import subprocess
import sys
from dataclasses import dataclass

_FIXTURES = {
    "quick": "pass",
    "timeout": "import time; time.sleep(30)",
}


@dataclass(frozen=True)
class RehearsalResult:
    status: str
    timed_out: bool
    returncode: int | None


def rehearse(case: str, timeout_seconds: float = 1.0) -> RehearsalResult:
    if type(case) is not str or case not in _FIXTURES:
        raise ValueError("unsupported_rehearsal_case")
    if type(timeout_seconds) not in (int, float) or not 0.05 <= timeout_seconds <= 3.0:
        raise ValueError("invalid_test_timeout")
    # No shell or user-supplied executable; start a separate process group.
    proc = subprocess.Popen(
        [sys.executable, "-c", _FIXTURES[case]],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        close_fds=True,
    )
    try:
        rc = proc.wait(timeout=timeout_seconds)
        return RehearsalResult("exited" if rc == 0 else "failed", False, rc)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            proc.wait(timeout=0.5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            proc.wait(timeout=1.0)
        return RehearsalResult("timed_out", True, proc.returncode)
