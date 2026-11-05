#!/usr/bin/env python3
"""Pure EchoMimic frame-count calculation based on verified local infer_flash.py.

Offline only. Never imports engine, starts processes, or uses GPU.
The VAE compression ratio must be verified separately from the active model.
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class FrameAssessment:
    audio_seconds: float
    fps: int
    requested_frames: int
    temporal_compression_ratio: int
    output_frames: int
    output_seconds: float
    preserves_full_audio: bool


def assess(audio_seconds: float, fps: int, requested_frames: int, ratio: int) -> FrameAssessment:
    for value in (audio_seconds,):
        if type(value) not in (int, float) or not 0 < value <= 30:
            raise ValueError("invalid_audio_duration")
    if type(fps) is not int or fps not in (24, 25, 30):
        raise ValueError("invalid_fps")
    if type(requested_frames) is not int or not 1 <= requested_frames <= 751:
        raise ValueError("invalid_requested_frames")
    if type(ratio) is not int or not 1 <= ratio <= 32:
        raise ValueError("vae_ratio_must_be_verified")
    limited = min(int(audio_seconds * fps), requested_frames)
    frames = ((limited - 1) // ratio) * ratio + 1 if limited != 1 else 1
    duration = frames / fps
    return FrameAssessment(audio_seconds, fps, requested_frames, ratio,
                           frames, duration, duration + 1e-9 >= audio_seconds)


def exact_five_seconds(ratio: int) -> FrameAssessment:
    result = assess(5.0, 25, 125, ratio)
    if not result.preserves_full_audio or result.output_frames != 125:
        raise ValueError("vae_ratio_not_compatible_with_exact_five_seconds")
    return result
