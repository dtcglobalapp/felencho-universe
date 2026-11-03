#!/usr/bin/env python3
"""Offline-only MP4 artifact validator, NOT connected to Bridge.

Does not create output files or run inference. ffprobe executes only for an
existing regular .mp4 inside a preapproved private output root.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

MAX_BYTES = 60 * 1024 * 1024
EXPECTED_DURATION = 5.0
MAX_DURATION_ERROR = 0.25
MIN_WIDTH, MAX_WIDTH = 128, 2048
MIN_HEIGHT, MAX_HEIGHT = 128, 2048
MAX_FPS = 60
SAFE_FILENAME = re.compile(r"^job-[0-9]{10}/lina_echomimic_5s[.]mp4$")


class ArtifactRejected(ValueError):
    pass


def _reject_symlinks(root: Path, relative: str) -> Path:
    if type(relative) is not str or not SAFE_FILENAME.fullmatch(relative):
        raise ArtifactRejected("invalid_artifact_name")
    if not root.is_dir() or root.is_symlink():
        raise ArtifactRejected("unsafe_output_root")
    job_folder, filename = relative.split("/")
    folder = root / job_folder
    artifact = folder / filename
    if folder.is_symlink() or artifact.is_symlink():
        raise ArtifactRejected("symlink_not_allowed")
    if not folder.is_dir() or not artifact.is_file():
        raise ArtifactRejected("artifact_not_regular_file")
    if artifact.resolve().parent != root.resolve() / job_folder:
        raise ArtifactRejected("outside_output_root")
    return artifact


def validate_mp4(root: Path, relative: str, ffprobe: str = "/usr/bin/ffprobe") -> dict:
    if ffprobe != "/usr/bin/ffprobe":
        raise ArtifactRejected("ffprobe_not_allowlisted")
    artifact = _reject_symlinks(root, relative)
    size = artifact.stat().st_size
    if not (0 < size <= MAX_BYTES):
        raise ArtifactRejected("artifact_size_out_of_bounds")
    try:
        proc = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries",
             "format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate",
             "-of", "json", str(artifact)],
            stdin=subprocess.DEVNULL, capture_output=True, text=True,
            timeout=10, check=True
        )
        if len(proc.stdout) > 65536:
            raise ArtifactRejected("probe_report_too_large")
        report = json.loads(proc.stdout)
        duration = float(report["format"]["duration"])
        streams = [s for s in report["streams"] if s.get("codec_type") == "video"]
        if len(streams) != 1:
            raise ArtifactRejected("expected_one_video_stream")
        stream = streams[0]
        width, height = int(stream["width"]), int(stream["height"])
        num, den = map(int, stream["avg_frame_rate"].split("/"))
        if den == 0:
            raise ArtifactRejected("invalid_fps")
        fps = num / den
        if (not abs(duration - EXPECTED_DURATION) <= MAX_DURATION_ERROR
                or not MIN_WIDTH <= width <= MAX_WIDTH
                or not MIN_HEIGHT <= height <= MAX_HEIGHT
                or not 1 <= fps <= MAX_FPS):
            raise ArtifactRejected("invalid_video_properties")
    except (OSError, subprocess.SubprocessError, ValueError, KeyError, TypeError, ZeroDivisionError) as exc:
        if isinstance(exc, ArtifactRejected):
            raise
        raise ArtifactRejected("ffprobe_validation_failed") from exc
    digest = hashlib.sha256()
    with artifact.open("rb") as file:
        while True:
            chunk = file.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return {
        "status": "validated_local_artifact",
        "relative_path": relative,
        "size_bytes": size,
        "duration_seconds": duration,
        "width": width,
        "height": height,
        "fps": round(fps, 3),
        "sha256": digest.hexdigest(),
        "note": "No upload, no public URL, no GPU execution.",
    }
