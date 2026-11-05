#!/usr/bin/env python3
"""Fixed-target AST report of EchoMimic frame and audio truncation calculations.

Read-only. No engine import, GPU, model load, subprocess or writes.
Reports bounded redacted expression structures rather than source excerpts.
"""
from __future__ import annotations
import ast
import hashlib
import json
from pathlib import Path

SCRIPT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3/infer_flash.py")
TARGETS = {"video_length", "video_length_actual", "fps", "audio_clip"}
MAX_SIZE = 300_000
MAX_EXPR = 280


class Redact(ast.NodeTransformer):
    def visit_Constant(self, node):
        if isinstance(node.value, str):
            return ast.copy_location(ast.Constant(value="[string omitted]"), node)
        if isinstance(node.value, (int, float, bool, type(None))):
            return node
        return ast.copy_location(ast.Constant(value="[literal omitted]"), node)


def safe_expression(node):
    try:
        original = ast.unparse(Redact().visit(ast.fix_missing_locations(ast.parse(
            ast.unparse(node), mode="eval"))))
        return original[:MAX_EXPR]
    except (SyntaxError, ValueError, RecursionError, TypeError):
        return "[expression unavailable]"


def inspect():
    result = {"status": "echo_frame_formula_inspection_only", "inference_executed": False,
              "files_written": False, "model_loaded": False}
    if SCRIPT.is_symlink() or not SCRIPT.is_file() or SCRIPT.stat().st_size > MAX_SIZE:
        return {**result, "error": "script_not_safe_or_missing"}
    raw = SCRIPT.read_bytes()
    try:
        tree = ast.parse(raw, filename="infer_flash.py")
    except (SyntaxError, UnicodeDecodeError):
        return {**result, "error": "parse_failed"}
    matches = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            names = {child.id for t in targets for child in ast.walk(t) if isinstance(child, ast.Name)}
            selected = names & TARGETS
            if selected:
                matches.append({"line": node.lineno, "targets": sorted(selected),
                                "calculation": safe_expression(node.value)})
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if node.func.attr == "subclipped" and 385 <= node.lineno <= 425:
                matches.append({"line": node.lineno, "operation": "audio_subclipped",
                                "arguments": [safe_expression(x) for x in node.args[:3]]})
    return {**result, "sha256": hashlib.sha256(raw).hexdigest(),
            "relevant_calculations": sorted(matches, key=lambda x: x["line"])[:32],
            "truncated": len(matches) > 32,
            "note": "Structural expression inventory only; frame count and working runtime still unverified."}


if __name__ == "__main__":
    print(json.dumps(inspect(), ensure_ascii=False, indent=2))
