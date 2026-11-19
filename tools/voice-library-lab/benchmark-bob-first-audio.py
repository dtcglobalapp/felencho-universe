#!/usr/bin/env python3
"""Offline warm/cold and first-yield benchmark. Does NOT connect to studio."""
import argparse
import hashlib
import json
import os
import platform
from pathlib import Path
import resource
import shutil
import time
import wave

REFERENCE_SHA = "ded8765793829fc49b9ab85ebf1566cff11d97c848b746a509082ccde4a81477"
REFERENCE_TEXT = (
    "Felencho, desde Nueva York conversamos con cinco vecinos sobre la "
    "situación de la ciudad. Gracias por comenzar esta conversación."
)
TEXT = "Hola, Felencho. Me alegra acompañarte hoy en Felencho Mundial."
ROOT = Path.home() / "Documents" / "FelenchoMundial" / "voice-library"
REF = ROOT / "approved" / "bob" / "2026-11-19" / "bob-voice-reference-approved.wav"
MODEL = ROOT / "models" / "qwen3-base-1.7b"
OUTROOT = ROOT / "auditions" / "bob-base-benchmark"

def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def preflight():
    if not REF.is_file() or sha256(REF) != REFERENCE_SHA:
        raise SystemExit("ERROR: Bob's exact approved reference SHA-256 not found. No audio generated.")
    with wave.open(str(REF), "rb") as w:
        if w.getnchannels() != 1 or w.getframerate() != 24000:
            raise SystemExit("ERROR: unexpected reference WAV format.")
    if not (MODEL / "config.json").is_file() or not list(MODEL.glob("*.safetensors")):
        raise SystemExit("ERROR: offline Base model is incomplete.")
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise SystemExit("ERROR: macOS Apple Silicon only.")
    print("Reference SHA256 verified:", REFERENCE_SHA)
    print("Offline Base model found:", MODEL)
    print("Free disk GiB:", round(shutil.disk_usage(Path.home()).free / (1024**3), 1))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="Read-only preflight, no model load")
    ap.add_argument("--run", action="store_true", help="Two sequential, identical-text trials")
    args = ap.parse_args()
    if args.check == args.run:
        ap.error("Choose exactly one of --check or --run")
    preflight()
    if args.check:
        print("Preflight complete: zero synthesis and no changes.")
        return 0

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model

    print("Loading isolated model (no download)...", flush=True)
    started = time.perf_counter()
    model = load_model(str(MODEL))
    load_seconds = time.perf_counter() - started
    sample_rate = int(getattr(model, "sample_rate", 24000))
    output = OUTROOT / time.strftime("%Y%m%d-%H%M%S")
    output.mkdir(parents=True, exist_ok=False)
    report = {
        "mode": "offline / sequential / no studio connection",
        "reference_sha256": REFERENCE_SHA,
        "model_path": str(MODEL),
        "sample_rate": sample_rate,
        "load_seconds": round(load_seconds, 3),
        "text": TEXT,
        "note": "time_to_first_yield is NOT guaranteed time-to-playable audio; some implementations yield only full utterances.",
        "trials": [],
    }
    try:
        for number in (1, 2):
            print(f"Trial {number}/2, same text; first run may include MLX warm-up.", flush=True)
            start = time.perf_counter()
            iterator = iter(model.generate(
                text=TEXT, ref_audio=str(REF),
                ref_text=REFERENCE_TEXT, lang_code="Spanish"
            ))
            first_yield = None
            chunks = []
            yields = 0
            for result in iterator:
                if first_yield is None:
                    first_yield = time.perf_counter() - start
                audio = result.audio
                mx.eval(audio)
                chunk = np.asarray(audio).reshape(-1)
                if len(chunk):
                    chunks.append(chunk)
                yields += 1
            if not chunks:
                raise RuntimeError(f"Trial {number}: generator produced no audio")
            samples = np.concatenate(chunks)
            duration = len(samples) / sample_rate
            total = time.perf_counter() - start
            filename = output / f"{number:02d}-{'initial' if number == 1 else 'warm'}-bob.wav"
            sf.write(str(filename), samples, sample_rate)
            info = {
                "trial": number,
                "time_to_first_yield_seconds": round(first_yield, 3),
                "total_generation_seconds": round(total, 3),
                "audio_duration_seconds": round(duration, 3),
                "real_time_factor": round(total / duration, 3),
                "generator_yield_count": yields,
                "first_yield_is_playable_unknown": True,
                "wav": str(filename),
                "wav_sha256": sha256(filename),
                "process_max_rss_raw_macos_bytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
            }
            report["trials"].append(info)
            print(json.dumps(info, ensure_ascii=False, indent=2), flush=True)
    finally:
        (output / "results.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print("Results:", output / "results.json", flush=True)
    print("Finished. No changes to Serena, studio, LiveKit, or hologram services.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
