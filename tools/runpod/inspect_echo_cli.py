#!/usr/bin/env python3
"""Read-only AST inventory of EchoMimic CLI defaults and entrypoint structure.

No engine imports, model loads, commands, writes or GPU usage.
Only literals in explicitly allowlisted argparse calls are reported.
"""
from __future__ import annotations
import ast
import hashlib
import json
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine")
SCRIPT = ROOT / "experiments/echomimic_v3/infer_flash.py"
MAX_BYTES = 300_000
MAX_FLAGS = 90

def safe_literal(node):
    if isinstance(node, ast.Constant) and type(node.value) in (str, int, float, bool, type(None)):
        value = node.value
        if isinstance(value, str):
            if len(value) > 100 or any(x in value.lower() for x in ("token", "secret", "password", "/home/", "/root/", "https:", "http:")):
                return "[omitted]"
        return value
    if isinstance(node, (ast.List, ast.Tuple)) and len(node.elts) <= 8:
        vals = [safe_literal(n) for n in node.elts]
        return vals if all(v != "[expression]" for v in vals) else "[expression]"
    return "[expression]"

def inspect() -> dict:
    base = {"status": "echo_cli_static_inspection_only", "inference_executed": False,
            "engine_imported": False, "files_written": False}
    if SCRIPT.is_symlink() or not SCRIPT.is_file():
        return {**base, "error": "unsafe_or_missing_source"}
    if SCRIPT.stat().st_size > MAX_BYTES:
        return {**base, "error": "source_too_large"}
    raw = SCRIPT.read_bytes()
    try:
        tree = ast.parse(raw, filename="infer_flash.py")
    except (SyntaxError, UnicodeDecodeError):
        return {**base, "error": "parse_failed"}
    arguments = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute) or node.func.attr != "add_argument":
            continue
        flags = [arg.value for arg in node.args if isinstance(arg, ast.Constant) and type(arg.value) is str and arg.value.startswith("--")]
        if not flags:
            continue
        settings = {"flags": flags[:4]}
        for kw in node.keywords:
            if kw.arg in ("default", "required", "choices", "nargs", "action"):
                settings[kw.arg] = safe_literal(kw.value)
        arguments.append(settings)
    functions = sorted({n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and not n.name.startswith("_")})
    return {**base, "script_sha256": hashlib.sha256(raw).hexdigest(),
            "argparse_settings": arguments[:MAX_FLAGS],
            "declared_functions": functions[:50],
            "warnings": [
                "Only literal defaults are resolved; expressions are not executed.",
                "No engine dependencies were installed or imported.",
                "CLI options may be altered by runtime config; actual invocation unverified.",
            ]}

if __name__ == "__main__":
    print(json.dumps(inspect(), ensure_ascii=False, indent=2))
