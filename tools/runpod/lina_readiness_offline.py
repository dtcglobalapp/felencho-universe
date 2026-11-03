"""Offline, fail-closed readiness decision for the Lina EchoMimic experiment.

No GPU, engine import, networking, file IO, subprocesses or renderer wiring.
A valid mathematical frame budget is necessary but never sufficient to render.
"""
from __future__ import annotations
from dataclasses import dataclass
from frame_budget_offline import exact_five_seconds

EXPECTED_SCRIPT_SHA = "59cb489d5d661d4c518c0e185cb74c83c3e87cd06f4da6fdcce14d900c2d9bcd"
EXPECTED_CONFIG_SHA = "21fe4409b664385a1c1cc5c23d92506ffb05ef3c374a18de9df67b715dca07e9"
PRESET = "lina_echomimic_5s"
FRAME_COUNT = 125
FPS = 25

@dataclass(frozen=True)
class Evidence:
    script_sha256: str
    config_sha256: str
    config_ratio: int
    effective_config_verified: bool
    local_import_smoke_passed: bool
    process_safety_passed: bool
    private_output_passed: bool
    explicit_gpu_authorization: bool

def evaluate(evidence: Evidence) -> dict:
    if type(evidence) is not Evidence:
        raise ValueError("invalid_evidence")
    reasons = []
    if evidence.script_sha256 != EXPECTED_SCRIPT_SHA:
        reasons.append("script_identity_not_verified")
    if evidence.config_sha256 != EXPECTED_CONFIG_SHA:
        reasons.append("config_identity_not_verified")
    if type(evidence.config_ratio) is not int:
        reasons.append("invalid_vae_ratio")
    else:
        try:
            exact_five_seconds(evidence.config_ratio)
        except ValueError:
            reasons.append("five_second_frame_budget_not_verified")
    for field, reason in (
        ("effective_config_verified", "effective_runtime_config_unverified"),
        ("local_import_smoke_passed", "isolated_import_smoke_pending"),
        ("process_safety_passed", "real_process_safety_pending"),
        ("private_output_passed", "private_output_validation_pending"),
        ("explicit_gpu_authorization", "explicit_gpu_authorization_missing"),
    ):
        if getattr(evidence, field) is not True:
            reasons.append(reason)
    return {
        "status": "ready_for_separate_review" if not reasons else "blocked",
        "preset": PRESET,
        "fps": FPS,
        "frames": FRAME_COUNT,
        "GPU_executed": False,
        "bridge_render_enabled": False,
        "blocking_reasons": reasons,
        "note": "Even ready_for_separate_review does not start or enable inference.",
    }
