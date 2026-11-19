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
    "A mature male radio host in his late fifties, with a rich, low baritone "
    "and warm chest resonance. Natural Latin American Spanish spoken by a "
    "long-time bilingual New York broadcaster: clear neutral Latin American "
    "pronunciation, no Castilian ceceo or distincion of z/c before e/i, "
    "no youthful or theatrical tone. Confident, thoughtful, relaxed but not slow, "
    "direct onset, no humming, no filler sounds, no exaggerated intonation. "
    "Natural conversational pacing, articulate consonants and calm authority."
)
SAMPLES = (
    ("01-presentacion", "Felencho, bienvenidos a Felencho Mundial. Aquí escuchamos, analizamos y conversamos con respeto."),
    ("02-conversacion", "Lina, tengo una pregunta sobre lo que sucede en nuestra ciudad. Escuchemos primero a Felencho."),
    ("03-ritmo", "Nueva York no se detiene. Pero una buena conversación también necesita claridad y buen ritmo."),
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
    from huggingface_hub import snapshot_download
    try:
        model_dir = snapshot_download(repo_id=MODEL_ID, local_files_only=True)
    except Exception as exc:
        print("ERROR: VoiceDesign model is not cached; download was NOT attempted.", file=sys.stderr)
        print(str(exc), file=sys.stderr)
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
    model = load_model(model_dir)
    sample_rate = int(getattr(model, "sample_rate", 24000))
    for name, words in SAMPLES:
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
