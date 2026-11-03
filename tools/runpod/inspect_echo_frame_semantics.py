#!/usr/bin/env python3
"""Bounded read-only AST inspection of EchoMimic frame-length semantics.

Does not import EchoMimic, parse untrusted YAML, run commands, load models,
write files, or use GPU. Only fixed local source files are inspected.
"""
from __future__ import annotations
import ast
import hashlib
import json
from pathlib import Path

ROOT = Path("/workspace/felencho-avatar-engine/experiments/echomimic_v3")
FILES = (
    ROOT / "infer_flash.py",
    ROOT / "src" / "pipeline_wan_fun_inpaint.py",
)
MAX_BYTES = 250_000
MAX_MATCHES = 24
MAX_TEXT = 170

def references_length(node):
    return any(isinstance(item, ast.Name) and item.id in ("video_length", "fps", "num_frames", "frames")
               or isinstance(item, ast.Attribute) and item.attr in ("video_length", "fps", "num_frames")
               for item in ast.walk(node))

def simple_expression(node):
    if isinstance(node, ast.Constant):
        return node.value if type(node.value) in (int, float, bool, type(None)) else "[literal]"
    if isinstance(node, ast.Name):
        return node.id[:40]
    if isinstance(node, ast.Attribute):
        return str(simple_expression(node.value)) + "." + node.attr[:35]
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod)):
        op = {ast.Add:"+", ast.Sub:"-", ast.Mult:"*", ast.Div:"/", ast.FloorDiv:"//", ast.Mod:"%"}[type(node.op)]
        return f"({simple_expression(node.left)} {op} {simple_expression(node.right)})"[:MAX_TEXT]
    if isinstance(node, ast.Compare):
        pieces = [str(simple_expression(node.left))]
        for op, value in zip(node.ops, node.comparators):
            pieces.extend([type(op).__name__, str(simple_expression(value))])
        return " ".join(pieces)[:MAX_TEXT]
    if isinstance(node, ast.Call):
        fn = simple_expression(node.func)
        return (str(fn) + "(...)")[:MAX_TEXT]
    if isinstance(node, (ast.Tuple, ast.List)):
        return "[" + ", ".join(str(simple_expression(x)) for x in node.elts[:4]) + "]"
    return "[complex_expression]"

def inspect():
    report = {"status": "echo_frame_semantics_static_only", "inference_executed": False,
              "engine_imported": False, "files_written": False, "sources": {}}
    for path in FILES:
        key = str(path.relative_to(ROOT))
        if not path.is_file() or path.is_symlink() or path.stat().st_size > MAX_BYTES:
            report["sources"][key] = {"present": False}
            continue
        raw = path.read_bytes()
        try:
            tree = ast.parse(raw, filename=path.name)
        except (SyntaxError, UnicodeDecodeError):
            report["sources"][key] = {"present": True, "parse": "failed"}
            continue
        found = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign) and references_length(node):
                found.append({"line": node.lineno, "kind": "assign",
                              "target": simple_expression(node.targets[0]), "value": simple_expression(node.value)})
            elif isinstance(node, ast.If) and references_length(node.test):
                found.append({"line": node.lineno, "kind": "conditional", "condition": simple_expression(node.test)})
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr in ("generate", "__call__") and references_length(node):
                found.append({"line": node.lineno, "kind": "call", "function": simple_expression(node.func),
                              "frame_args": sorted([k.arg for k in node.keywords if k.arg and references_length(k.value)])})
        report["sources"][key] = {"present": True, "sha256": hashlib.sha256(raw).hexdigest(),
                                  "matches": found[:MAX_MATCHES], "truncated": len(found) > MAX_MATCHES}
    report["note"] = "Static hints only; runtime frame count and valid length remain unverified."
    return report

if __name__ == "__main__":
    print(json.dumps(inspect(), indent=2))
