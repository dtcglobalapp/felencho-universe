#!/usr/bin/env python3
"""Read-only bounded inspection of VAE configuration wiring in local EchoMimic.

No engine import, no torch, no GPU, no network, no subprocess, no writes.
Reports only structural AST references and allowlisted configuration fields.
"""
from __future__ import annotations

import ast
import hashlib
import json
import re
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3")
SCRIPT = ROOT / "infer_flash.py"
CONFIG = ROOT / "config/config.yaml"
MAX_SCRIPT_BYTES = 300_000
MAX_CONFIG_BYTES = 16_384
MAX_MATCHES = 35
MAX_EXPR = 240


def safe_expr(node):
    if isinstance(node, ast.Constant):
        if type(node.value) in (int, float, bool, type(None)):
            return repr(node.value)
        return "[literal]"
    if isinstance(node, ast.Name):
        return node.id[:60]
    if isinstance(node, ast.Attribute):
        return (safe_expr(node.value) + "." + node.attr)[:MAX_EXPR]
    if isinstance(node, ast.Call):
        args = ", ".join(safe_expr(arg) for arg in node.args[:3])
        kwargs = ", ".join(k.arg + "=" + safe_expr(k.value) for k in node.keywords[:5] if k.arg)
        return (safe_expr(node.func) + "(" + ", ".join(x for x in (args, kwargs) if x) + ")")[:MAX_EXPR]
    if isinstance(node, ast.Subscript):
        return (safe_expr(node.value) + "[...]")[:MAX_EXPR]
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Div, ast.Mult, ast.Add)):
        return (safe_expr(node.left) + type(node.op).__name__ + safe_expr(node.right))[:MAX_EXPR]
    return "[expression]"


def inspect():
    result = {"status": "echo_vae_wiring_static_only", "engine_imported": False,
              "inference_executed": False, "files_written": False}
    for path, max_bytes in ((SCRIPT, MAX_SCRIPT_BYTES), (CONFIG, MAX_CONFIG_BYTES)):
        if not path.is_file() or path.is_symlink() or path.stat().st_size > max_bytes:
            return {**result, "error": "required_source_missing_or_unsafe"}
    raw_script = SCRIPT.read_bytes()
    raw_config = CONFIG.read_bytes()
    try:
        tree = ast.parse(raw_script, filename="infer_flash.py")
        config_text = raw_config.decode("utf-8")
    except (UnicodeDecodeError, SyntaxError):
        return {**result, "error": "parse_failed"}
    mentions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            names = [x.id for target in targets for x in ast.walk(target) if isinstance(x, ast.Name)]
            if any("vae" in name.lower() or "config" in name.lower() for name in names):
                mentions.append({"line": node.lineno, "kind": "assignment",
                                 "targets": names[:5], "expression": safe_expr(node.value)})
        elif isinstance(node, ast.Call):
            reference = safe_expr(node.func)
            if any(term in reference.lower() for term in ("vae", "config", "wan", "from_pretrained")):
                mentions.append({"line": node.lineno, "kind": "call", "expression": safe_expr(node)})
    values = []
    for index, line in enumerate(config_text.splitlines(), 1):
        match = re.fullmatch(r"\s*temporal_compression_ratio\s*:\s*([0-9]{1,3})\s*(?:#.*)?", line)
        if match:
            values.append({"line": index, "ratio": int(match.group(1))})
    return {**result,
            "script_sha256": hashlib.sha256(raw_script).hexdigest(),
            "config_sha256": hashlib.sha256(raw_config).hexdigest(),
            "config_ratio_literals": values[:3],
            "vae_config_references": sorted(mentions, key=lambda item: item["line"])[:MAX_MATCHES],
            "truncated": len(mentions) > MAX_MATCHES,
            "note": "Static wiring hints only. Does not prove runtime VAE ratio or inference compatibility."}


if __name__ == "__main__":
    print(json.dumps(inspect(), ensure_ascii=False, indent=2))
