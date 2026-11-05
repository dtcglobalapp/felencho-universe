"""Static, NON-EXECUTABLE EchoMimic Lina argument manifest for review.

No model imports, subprocess, GPU, video output or Bridge registration.
Flag presence is checked against a pinned AST entrypoint, not by invocation.
This is a candidate for source review, not an approved rendering command.
"""
from __future__ import annotations

import ast
import hashlib
from pathlib import Path

from lina_pinned_preset_offline import ENGINE, ECHO, FILES, SCRIPT_SHA

# User-facing prompts are fixed code, never taken from a GitHub Issue.
PROMPT = "A natural, attentive woman speaking to camera in a studio."
# Flags were identified by RunPod read-only Issue #17.
PROPOSED = (
    ("--config_path", str(ENGINE / FILES["config"][0])),
    ("--model_name", str(ECHO / "flash/Wan2.1-Fun-V1.1-1.3B-InP")),
    ("--transformer_path", str(ECHO / "flash/transformer")),
    ("--vae_path", str(ECHO / "flash/Wan2.1-Fun-V1.1-1.3B-InP/Wan2.1_VAE.pth")),
    ("--wav2vec_model_dir", str(ECHO / "flash/chinese-wav2vec2-base")),
    ("--image_path", str(ENGINE / FILES["image"][0])),
    ("--audio_path", str(ENGINE / FILES["audio"][0])),
    ("--prompt", PROMPT),
    ("--video_length", "125"),
    ("--fps", "25"),
    ("--num_inference_steps", "25"),
    ("--GPU_memory_mode", "sequential_cpu_offload"),
    ("--weight_dtype", "bfloat16"),
)
REQUIRED_FLAGS = frozenset(key for key, _ in PROPOSED)


def review(root: Path = ENGINE) -> dict:
    result = {
        "status": "render_blocked_source_review",
        "gpu_inference_executed": False,
        "process_started": False,
        "output_written": False,
        "bridge_render_enabled": False,
        "candidate_flags": [name for name, _ in PROPOSED],
    }
    source = root / FILES["entrypoint"][0]
    if not source.is_file() or source.is_symlink() or source.stat().st_size > 300000:
        return {**result, "reason": "unsafe_or_missing_entrypoint"}
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SCRIPT_SHA:
        return {**result, "reason": "entrypoint_sha_changed"}
    try:
        tree = ast.parse(raw)
    except (SyntaxError, UnicodeDecodeError):
        return {**result, "reason": "entrypoint_parse_failed"}
    flags = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "add_argument":
            flags.update(arg.value for arg in node.args
                         if isinstance(arg, ast.Constant) and type(arg.value) is str
                         and arg.value.startswith("--"))
    missing = sorted(REQUIRED_FLAGS - flags)
    return {
        **result,
        "status": "flags_present_but_render_blocked" if not missing else "render_blocked_missing_flags",
        "missing_flags": missing,
        "candidate_pinned_config": str(root / FILES["config"][0]),
        "candidate_fps": 25,
        "candidate_frames": 125,
        "blocking_reviews": [
            "verify_transformer_path_and_vae_path_semantics",
            "verify_model_name_loads_all_required_auxiliary_weights",
            "verify_save_path_behavior_and_private_output_directory",
            "verify_full_import_graph_and_gpu_memory_requirements",
            "verify_supervisor_crash_cleanup_and_mp4_validation",
            "obtain_explicit_gpu_authorization",
        ],
        "note": "CLI argument existence alone does not validate runtime values or enable inference.",
    }
