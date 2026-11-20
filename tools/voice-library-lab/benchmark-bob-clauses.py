#!/usr/bin/env python3
"""Offline Bob Base TTS clause benchmark. No studio or network connections."""
import argparse
import hashlib
import json
import os
import platform
from pathlib import Path
import shutil
import time
import wave

REF_SHA = "ded8765793829fc49b9ab85ebf1566cff11d97c848b746a509082ccde4a81477"
REF_TEXT = (
    "Felencho, desde Nueva York conversamos con cinco vecinos sobre la "
    "situación de la ciudad. Gracias por comenzar esta conversación."
)
ROOT = Path.home() / "Documents" / "FelenchoMundial" / "voice-library"
REFERENCE = ROOT / "approved" / "bob" / "2026-11-19" / "bob-voice-reference-approved.wav"
MODEL = ROOT / "models" / "qwen3-base-1.7b"
OUT_ROOT = ROOT / "auditions" / "bob-clauses"
CLAUSES = (
    ("01-apertura", "Felencho, te explico."),
    ("02-contexto", "Primero debemos escuchar los hechos y comprender su contexto."),
    ("03-cierre", "Después, Lina y yo podremos ofrecer un análisis responsable."),
)

def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def preflight():
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise SystemExit("ERROR: This experiment requires macOS Apple Silicon.")
    if not REFERENCE.is_file() or sha(REFERENCE) != REF_SHA:
        raise SystemExit("ERROR: official Bob reference SHA-256 mismatch or file missing.")
    with wave.open(str(REFERENCE), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getframerate() != 24000:
            raise SystemExit("ERROR: unexpected official Bob WAV format.")
    if not (MODEL / "config.json").is_file() or not list(MODEL.glob("*.safetensors")):
        raise SystemExit("ERROR: offline Qwen3 Base model not present.")
    print("Verified approved Bob reference:", REF_SHA)
    print("Offline Base model:", MODEL)
    print("Available disk GiB:", round(shutil.disk_usage(Path.home()).free / 1024**3, 1))

def run():
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model

    started = time.perf_counter()
    model = load_model(str(MODEL))
    load_seconds = time.perf_counter() - started
    sr = int(getattr(model, "sample_rate", 24000))
    folder = OUT_ROOT / time.strftime("%Y%m%d-%H%M%S")
    folder.mkdir(parents=True, exist_ok=False)
    report = {
        "mode": "offline; same producer-approved Bob reference; no service changes",
        "model": "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16",
        "reference_sha256": REF_SHA,
        "model_load_seconds": round(load_seconds, 3),
        "sample_rate_hz": sr,
        "timing_note": "Time until first finished WAV; not streaming TTS nor speech onset.",
        "join_note": "Raw joined audio includes only original generated chunks, no audio processing.",
        "clauses": [],
    }
    segments = []
    total_start = time.perf_counter()
    try:
        for i, (name, text) in enumerate(CLAUSES, start=1):
            print(f"Generating clause {i}/{len(CLAUSES)}: {text}", flush=True)
            t0 = time.perf_counter()
            pieces = []
            count = 0
            first_yield = None
            for result in model.generate(
                text=text, ref_audio=str(REFERENCE),
                ref_text=REF_TEXT, lang_code="Spanish",
            ):
                if first_yield is None:
                    first_yield = time.perf_counter() - t0
                audio = result.audio
                mx.eval(audio)
                chunk = np.asarray(audio).reshape(-1)
                if len(chunk):
                    pieces.append(chunk)
                count += 1
            if not pieces:
                raise RuntimeError(f"No audio for {name}")
            wav = np.concatenate(pieces).astype(np.float32)
            completed_seconds = time.perf_counter() - t0
            duration_seconds = len(wav) / sr
            file = folder / (name + ".wav")
            sf.write(str(file), wav, sr)
            segments.append(wav)
            entry = {
                "name": name, "text": text,
                "first_yield_seconds": round(first_yield, 3),
                "wav_ready_seconds": round(completed_seconds, 3),
                "audio_duration_seconds": round(duration_seconds, 3),
                "real_time_factor": round(completed_seconds / duration_seconds, 3),
                "generator_yield_count": count,
                "wav": str(file),
                "wav_sha256": sha(file),
            }
            report["clauses"].append(entry)
            if i == 1:
                report["time_to_first_playable_wav_seconds"] = round(
                    time.perf_counter() - total_start, 3
                )
            print(json.dumps(entry, ensure_ascii=False), flush=True)

        combined = np.concatenate(segments)
        joined = folder / "00-bob-concatenado-sin-procesar.wav"
        sf.write(str(joined), combined, sr)
        report["joined_wav"] = str(joined)
        report["joined_sha256"] = sha(joined)
        report["joined_duration_seconds"] = round(len(combined)/sr, 3)
        report["total_generation_and_file_seconds"] = round(
            time.perf_counter() - total_start, 3
        )
        report["join_has_no_crossfade_or_inserted_silence"] = True
        print("Joined without crossfade or silence insertion:", joined, flush=True)
    finally:
        (folder / "results.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print("Report:", folder / "results.json", flush=True)
    print("No studio, Serena, LiveKit or hologram connections were made.")
    return 0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--run", action="store_true")
    args = ap.parse_args()
    if args.check == args.run:
        ap.error("Choose exactly one of --check or --run")
    preflight()
    if args.check:
        print("Read-only preflight passed; no model loaded or audio generated.")
        return 0
    return run()

if __name__ == "__main__":
    raise SystemExit(main())
