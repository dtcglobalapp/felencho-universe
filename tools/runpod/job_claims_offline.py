#!/usr/bin/env python3
"""Offline-only durable claim registry for future fixed Lina jobs.

NOT connected to bridge or GPU. Uses SQLite atomic transactions and a single
active-job uniqueness constraint. Never automatically reclaims interrupted jobs.
Only call from isolated unit tests until the render runner is reviewed.
"""
from __future__ import annotations

import sqlite3
import os
import stat
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  issue_number INTEGER PRIMARY KEY CHECK(issue_number > 0),
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('claimed','complete','failed','interrupted')),
  updated_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_lina_job
ON jobs ((1)) WHERE status = 'claimed';
"""

class ClaimRejected(Exception):
    pass


def _validate_private_database(database: Path) -> None:
    """Create mode-0600 file or reject insecure existing paths in private workspace.

    The directory must be owned and mode 0700. This offline sandbox assumes
    no untrusted process shares the same UID; it is not an fd-based SQLite VFS.
    """
    if not isinstance(database, Path) or database.name in ("", ".", ".."):
        raise ClaimRejected("invalid_database_path")
    parent = database.parent
    if parent.is_symlink() or not parent.is_dir():
        raise ClaimRejected("unsafe_registry_parent")
    pinfo = parent.stat()
    if pinfo.st_uid != os.geteuid() or stat.S_IMODE(pinfo.st_mode) != 0o700:
        raise ClaimRejected("unsafe_registry_parent_permissions")
    flags = os.O_RDWR | os.O_CLOEXEC | os.O_NOFOLLOW
    try:
        try:
            fd = os.open(database, flags | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            fd = os.open(database, flags)
    except OSError as exc:
        raise ClaimRejected("registry_unavailable_or_symlink") from exc
    try:
        info = os.fstat(fd)
        if (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1
                or info.st_uid != os.geteuid()
                or stat.S_IMODE(info.st_mode) != 0o600):
            raise ClaimRejected("unsafe_registry_file")
    finally:
        os.close(fd)

@contextmanager
def connection(database: Path):
    # Caller must choose a private directory. Do not accept a DB path from Issues.
    _validate_private_database(database)
    db = sqlite3.connect(str(database), timeout=5.0, isolation_level=None)
    try:
        db.execute("PRAGMA busy_timeout=5000")
        db.executescript(SCHEMA)
        yield db
    finally:
        db.close()

def claim(database: Path, issue_number: int, fingerprint: str) -> bool:
    if type(issue_number) is not int or not 0 < issue_number <= 9999999999:
        raise ValueError("invalid_issue")
    if (type(fingerprint) is not str or len(fingerprint) != 64
            or any(ch not in "0123456789abcdef" for ch in fingerprint)):
        raise ValueError("invalid_fingerprint")
    with connection(database) as db:
        try:
            db.execute("BEGIN IMMEDIATE")
            db.execute("INSERT INTO jobs(issue_number,fingerprint,status) VALUES (?,?,'claimed')",
                       (issue_number, fingerprint))
            db.execute("COMMIT")
        except sqlite3.IntegrityError as exc:
            db.execute("ROLLBACK")
            raise ClaimRejected("already_claimed_or_another_job_active") from exc
        except BaseException:
            db.execute("ROLLBACK")
            raise
    return True

def finish(database: Path, issue_number: int, fingerprint: str, state: str) -> bool:
    if state not in ("complete", "failed", "interrupted"):
        raise ValueError("invalid_terminal_state")
    with connection(database) as db:
        db.execute("BEGIN IMMEDIATE")
        try:
            changed = db.execute(
                "UPDATE jobs SET status=?, updated_utc=strftime('%Y-%m-%dT%H:%M:%fZ','now') "
                "WHERE issue_number=? AND fingerprint=? AND status='claimed'",
                (state, issue_number, fingerprint)).rowcount
            if changed != 1:
                raise ClaimRejected("claim_not_active_or_mismatch")
            db.execute("COMMIT")
        except BaseException:
            db.execute("ROLLBACK")
            raise
    return True

def get_status(database: Path, issue_number: int) -> str | None:
    with connection(database) as db:
        row = db.execute("SELECT status FROM jobs WHERE issue_number=?", (issue_number,)).fetchone()
        return row[0] if row else None
