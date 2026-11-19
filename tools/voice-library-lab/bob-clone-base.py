#!/usr/bin/env python3
"""Qwen3 Base voice cloning experiment for Bob. Offline. Never modifies active studio."""
import argparse
import hashlib
import json
import os
import platform
from pathlib import Path
import shutil
import sys
import time
import wave

MODEL_ID = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"
SHA256 = "ded8765793829fc49b9ab85ebf1566cff11d97c848b746a509082ccde4a81477"
REFERENCE_TEXT = (
    "Felencho, desde Nueva York conversamos con cinco vecinos sobre la "
    "situación de la ciudad. Gracias por comenzar esta conversación."
)
LIB = Path.home() / "Documents" / "FelenchoMundial" / "voice-library"
REFERENCE = LIB / "approved" / "bob" / "2026-11-19" / "bob-voice-reference-approved.wav"
MODEL = LIB / "models" / "qwen3-base-1.7b"
PHRASES = [
    ("01-saludo", "Hola, Felencho. Me alegra acompañarte hoy en Felencho Mundial."),
    ("02-debate", "Lina, analicemos esta noticia con calma. Lo importante es escuchar a nuestros invitados antes de sacar conclusiones."),
]

def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()

def check_reference():
    if not REFERENCE.is_file():
        raise SystemExit("ERROR: falta el WAV aprobado. No se genero audio.")
    if sha256(REFERENCE) != SHA256:
        raise SystemExit("ERROR: huella del WAV NO coincide. Abortado sin generar audio.")
    with wave.open(str(REFERENCE)) as w:
        if w.getnchannels() != 1 or w.getframerate() != 24000:
            raise SystemExit("ERROR: formato WAV inesperado.")
        return {"sha256": SHA256, "duration_seconds": round(w.getnframes()/w.getframerate(), 3)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--generate", action="store_true")
    parser.add_argument("--studio-text", type=str, default=None)
    parser.add_argument("--studio-output", type=str, default=None)
    args = parser.parse_args()
    modes = int(args.check) + int(args.generate) + int(args.studio_text is not None)
    if modes != 1:
        parser.error("Choose --check, --generate OR --studio-text")
    if (args.studio_text is None) != (args.studio_output is None):
        parser.error("--studio-text requires --studio-output and vice versa")
    ref = check_reference()
    print("BOB REFERENCIA APROBADA:", json.dumps(ref))
    print("Modelo:", MODEL_ID)
    print("Ruta aislada:", MODEL)
    print("Disco disponible GiB:", round(shutil.disk_usage(Path.home()).free / 1024**3, 1))
    if args.check:
        print("Sin descargas, cambios ni audio.")
        return 0

    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise SystemExit("ERROR: este ensayo requiere macOS Apple Silicon.")
    if not (MODEL / "config.json").is_file() or not list(MODEL.glob("*.safetensors")):
        raise SystemExit("ERROR: modelo Base no esta instalado. No se intentara descargar.")
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model

    if args.studio_text is not None:
        text = args.studio_text.strip()
        if not text or len(text) > 500:
            raise SystemExit("ERROR: Bob studio text must be 1-500 characters.")
        output = Path(args.studio_output).expanduser().resolve()
        # The calling route owns a temporary directory under the macOS temp root.
        # Forbid writing audio anywhere else.
        from tempfile import gettempdir
        if not output.is_relative_to(Path(gettempdir()).resolve()) or output.suffix.lower() != ".wav":
            raise SystemExit("ERROR: output must be a temporary WAV file.")
        model = load_model(str(MODEL))
        generated = list(model.generate(text=text, ref_audio=str(REFERENCE),
                                        ref_text=REFERENCE_TEXT, lang_code="Spanish"))
        if not generated:
            raise SystemExit("ERROR: no Bob voice generated.")
        pieces = []
        for item in generated:
            mx.eval(item.audio)
            piece = np.asarray(item.audio).reshape(-1)
            if len(piece):
                pieces.append(piece)
        if not pieces:
            raise SystemExit("ERROR: generated Bob voice is empty.")
        sf.write(str(output), np.concatenate(pieces), int(getattr(model, "sample_rate", 24000)))
        print("BOB_BASE_APPROVED_REFERENCE_OK", sha256(output))
        return 0

    out = LIB / "auditions" / "bob-base" / time.strftime("%Y%m%d-%H%M%S")
    out.mkdir(parents=True, exist_ok=False)
    metadata = {
        "reference_sha256": SHA256, "model": MODEL_ID,
        "reference_transcript": REFERENCE_TEXT,
        "status": "Experimental; not producer approved for live studio",
        "clips": [],
    }
    load_start = time.monotonic()
    model = load_model(str(MODEL))
    metadata["model_load_seconds"] = round(time.monotonic() - load_start, 2)
    sample_rate = int(getattr(model, "sample_rate", 24000))
    try:
        for name, words in PHRASES:
            begin = time.monotonic()
            results = list(model.generate(
                text=words,
                ref_audio=str(REFERENCE),
                ref_text=REFERENCE_TEXT,
                lang_code="Spanish",
            ))
            if not results:
                raise RuntimeError("Sin audio generado: "+name)
            audio = results[0].audio
            mx.eval(audio)
            values = np.asarray(audio).reshape(-1)
            if not len(values):
                raise RuntimeError("Audio vacio: "+name)
            path = out / (name + ".wav")
            sf.write(str(path), values, sample_rate)
            duration = len(values)/sample_rate
            elapsed = time.monotonic()-begin
            metadata["clips"].append({
                "name": name, "text": words, "seconds": round(elapsed, 2),
                "audio_duration_seconds": round(duration, 2),
                "real_time_factor": round(elapsed/duration, 3) if duration else None,
                "wav": str(path), "sha256": sha256(path),
            })
            print(name, "| synth", round(elapsed,2), "s | WAV", round(duration,2), "s")
    finally:
        (out / "results.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    print("Audiciones:", out)
    print("No reproduction, no LiveKit publishing, no studio change.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
