"""Private output directory creation for future, separately authorized Lina jobs.

Not connected to Bridge or inference. Never touches the avatar engine tree.
Production callers must validate their trusted workspace path and ownership
before calling. Existing job directories are NEVER reused.
"""
from __future__ import annotations

import os
import re
import stat
from pathlib import Path

JOB_NAME = re.compile(r"job-[0-9]{10}\Z", re.ASCII)
DIR_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC


class PrivateOutputRejected(ValueError):
    pass


def _open_trusted_dir(path: Path) -> int:
    if path.is_symlink():
        raise PrivateOutputRejected("workspace_symlink_forbidden")
    try:
        fd = os.open(path, DIR_FLAGS)
    except OSError as exc:
        raise PrivateOutputRejected("workspace_unavailable") from exc
    info = os.fstat(fd)
    if (not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid()
            or stat.S_IMODE(info.st_mode) != 0o700):
        os.close(fd)
        raise PrivateOutputRejected("workspace_owner_or_permissions_invalid")
    return fd


def _make_and_open(parent_fd: int, name: str) -> int:
    try:
        os.mkdir(name, mode=0o700, dir_fd=parent_fd)
    except FileExistsError as exc:
        raise PrivateOutputRejected("directory_already_exists") from exc
    except OSError as exc:
        raise PrivateOutputRejected("directory_creation_failed") from exc
    try:
        fd = os.open(name, DIR_FLAGS, dir_fd=parent_fd)
        os.fchmod(fd, 0o700)
        info = os.fstat(fd)
        if (not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid()
                or stat.S_IMODE(info.st_mode) != 0o700):
            raise PrivateOutputRejected("private_directory_not_secure")
        return fd
    except BaseException:
        if "fd" in locals():
            os.close(fd)
        raise


def create_private_job_directory(workspace: Path, job_name: str) -> Path:
    """Create outputs/job-NNNNNNNNNN with mode 0700 under trusted workspace.

    Fail closed if workspace, outputs or job directory exists incorrectly.
    Does not place, read or upload any video.
    """
    if type(job_name) is not str or not JOB_NAME.fullmatch(job_name):
        raise PrivateOutputRejected("invalid_job_name")
    root_fd = _open_trusted_dir(workspace)
    try:
        try:
            os.mkdir("outputs", mode=0o700, dir_fd=root_fd)
        except FileExistsError:
            pass
        try:
            output_fd = os.open("outputs", DIR_FLAGS, dir_fd=root_fd)
        except OSError as exc:
            raise PrivateOutputRejected("outputs_directory_unsafe") from exc
        try:
            info = os.fstat(output_fd)
            if (not stat.S_ISDIR(info.st_mode) or
                    info.st_uid != os.geteuid() or
                    stat.S_IMODE(info.st_mode) != 0o700):
                raise PrivateOutputRejected("outputs_permissions_unsafe")
            job_fd = _make_and_open(output_fd, job_name)
            os.close(job_fd)
        finally:
            os.close(output_fd)
    finally:
        os.close(root_fd)
    return workspace / "outputs" / job_name
