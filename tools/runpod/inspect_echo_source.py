#!/usr/bin/env python3
"""Read-only static inspection of the local EchoMimic entrypoint.

No imports from the engine, no subprocess, no file writes, no GPU. Parse AST
of one fixed file and read known requirements filenames only.
"""
from __future__ import annotations
import ast
import hashlib
import json
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
SCRIPT = ROOT / "experiments/echomimic_v3/infer_flash.py"
REQUIREMENT_FILES = (
    ROOT / "experiments/echomimic_v3/requirements.txt",
    ROOT / "requirements.txt",
    ROOT / "experiments/echomimic_v3/pyproject.toml",
)
MAX_SCRIPT = 300_000
MAX_REQ = 100_000
MAX_ITEMS = 80


def literal_text(node):
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def inspect() -> dict:
    report = {
        "status": "echo_source_static_inspection_only",
        "inference_executed": False,
        "engine_imported": False,
        "files_written": False,
    }
    if SCRIPT.is_symlink() or not SCRIPT.is_file() or SCRIPT.stat().st_size > MAX_SCRIPT:
        return {**report, "error": "script_missing_or_unsafe"}
    raw = SCRIPT.read_bytes()
    try:
        tree = ast.parse(raw, filename=SCRIPT.name)
    except (SyntaxError, UnicodeDecodeError) as exc:
        return {**report, "error": "source_parse_failed", "error_type": type(exc).__name__}
    imported = set()
    flags = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if node.func.attr == "add_argument":
                flags.update(value for arg in node.args[:4] if (value := literal_text(arg)) and value.startswith("-"))
    requirements = {}
    for path in REQUIREMENT_FILES:
        rel = str(path.relative_to(ROOT))
        if not path.is_symlink() and path.is_file() and path.stat().st_size <= MAX_REQ:
            # Report requirement lines only when they are package-like. No URLs, credentials, source code or comments.
            entries = []
            for line in path.read_text(errors="replace").splitlines():
                token = line.strip()
                if not token or token.startswith(("#", "-", "git+", "http:", "https:")):
                    continue
                if len(token) <= 120 and all(c.isalnum() or c in "._-<>=!~[]; ,+" for c in token):
                    entries.append(token)
            requirements[rel] = {"present": True, "package_lines": entries[:MAX_ITEMS]}
        else:
            requirements[rel] = {"present": False}
    return {
        **report,
        "script_sha256": hashlib.sha256(raw).hexdigest(),
        "source_size_bytes": len(raw),
        "top_level_import_names": sorted(imported)[:MAX_ITEMS],
        "cli_argument_flags": sorted(flags)[:MAX_ITEMS],
        "requirements": requirements,
        "warning": "Static source analysis does not verify runtime dependencies or real CLI behavior.",
    }


if __name__ == "__main__":
    print(json.dumps(inspect(), indent=2))
