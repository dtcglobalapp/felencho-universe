#!/usr/bin/env python3
"""Felencho Voice Library: standalone, non-playing, offline VoiceDesign audition.
Not part of the active studio API. Does not publish to LiveKit or modify Serena.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import platform
import shutil
import sys
import time

MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16"
PROMPT = (
    "A native-born Latin American Spanish-speaking man in his late fifties. "
    "Spanish is his FIRST LANGUAGE and mother tongue, learned from birth in a "
    "Latin American Spanish-speaking family and community. He lives in "
    "New York City, but his Spanish has a fully native Latin American accent, "
    "NOT a US English accent, NOT English-influenced Spanish, NOT a foreign "
    "language learner, and NOT European Spanish. Natural Latin American "
    "seseo: Spanish z, ce and ci are pronounced with the same s sound as s, "
    "never the European Spanish th sound. Natural vowels, authentic Latino "
    "cadence and fluent connected speech. A deep, mature, warm male baritone "
    "with calm radio-host authority, clear articulation, confident yet "
    "conversational pacing, not excessively slow, no exaggerated acting, "
    "no filler noises, no humming and no grunting. The voice MUST sound like "
    "an authentic native Spanish-speaking Latino radio veteran, not an "
    "American English speaker speaking Spanish."
)
SAMPLES = (
    ("01-seseo-latino", "Felencho, desde Nueva York conversamos con cinco vecinos sobre la situación de la ciudad. Gracias por comenzar esta conversación."),
    ("02-presentacion", "Bienvenidos a Felencho Mundial. Aquí escuchamos, analizamos y conversamos con respeto."),
)

PACKAGES = ("mlx", "mlx_audio", "soundfile", "huggingface_hub")


def preflight():
    free_gb = shutil.disk_usage(Path.home()).free / (1024 ** 3)
    details = {
        "project": "Felencho Voice Library / Bob prototype",
        "macOS": platform.system() == "Darwin",
        "apple_silicon": platform.machine() == "arm64",
        "python": sys.executable,
        "dependencies": {name: importlib.util.find_spec(name) is not None for name in PACKAGES},
        "free_disk_GiB": round(free_gb, 1),
        "model": MODEL_ID,
        "download_in_this_step": False,
        "studio_active_untouched": True,
    }
    print(json.dumps(details, ensure_ascii=False, indent=2))
    return details


def main():
    parser = argparse.ArgumentParser(description="Bob voice design - isolated offline lab")
    parser.add_argument("--preflight", action="store_true", help="Only inspect environment; no downloads/audio")
    parser.add_argument("--generate", action="store_true", help="Generate WAV files only from already-cached model")
    args = parser.parse_args()
    if args.preflight == args.generate:
        parser.error("Select exactly one of --preflight or --generate")
    checks = preflight()
    if args.preflight:
        return 0
    if not checks["macOS"] or not checks["apple_silicon"]:
        print("ERROR: requires Apple Silicon macOS", file=sys.stderr)
        return 2
    if not all(checks["dependencies"].values()):
        print("ERROR: dependencies missing. No automatic installation.", file=sys.stderr)
        return 2

    # IMPORTANT: do not download large model weights without producer approval.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    model_dir = Path.home() / "Documents" / "FelenchoMundial" / "voice-library" / "models" / "qwen3-voice-design-1.7b"
    if not (model_dir / "config.json").is_file() or not list(model_dir.glob("*.safetensors")):
        print("ERROR: VoiceDesign model not installed in isolated Voice Library. No download attempted.", file=sys.stderr)
        return 3

    from mlx_audio.tts.utils import load_model
    import mlx.core as mx
    import soundfile as sf
    import numpy as np

    home = Path.home() / "Documents" / "FelenchoMundial" / "voice-library" / "bob"
    dest = home / time.strftime("%Y%m%d-%H%M%S")
    dest.mkdir(parents=True, exist_ok=False)
    (dest / "voice-spec.json").write_text(
        json.dumps({"model": MODEL_ID, "instruction": PROMPT, "samples": SAMPLES}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("Loading VoiceDesign model from local cache...")
    model = load_model(str(model_dir))
    sample_rate = int(getattr(model, "sample_rate", 24000))
    for name, words in SAMPLES[:1]:  # First audition is an accent-specific test.
        start = time.monotonic()
        results = list(model.generate_voice_design(text=words, language="Spanish", instruct=PROMPT))
        if not results:
            raise RuntimeError(f"No audio generated: {name}")
        audio = results[0].audio
        mx.eval(audio)
        file = dest / (name + ".wav")
        sf.write(str(file), np.asarray(audio).reshape(-1), sample_rate)
        print(f"{name}: {time.monotonic()-start:.2f} s | {file}")
    print("Audition only: files were never played or sent to LiveKit.")
    print(f"Output: {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
