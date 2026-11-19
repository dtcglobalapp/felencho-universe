#!/usr/bin/env python3
"""Archive the exact, producer-approved Bob WAV by SHA-256, no network or playback."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import shutil
import wave

EXPECTED_SHA256 = "ded8765793829fc49b9ab85ebf1566cff11d97c848b746a509082ccde4a81477"
EXPECTED_BYTES = 422444
REFERENCE_TEXT = (
    "Felencho, desde Nueva York conversamos con cinco vecinos sobre la "
    "situación de la ciudad. Gracias por comenzar esta conversación."
)
HOME = Path.home()
LIBRARY = HOME / "Documents/FelenchoMundial/voice-library"
DEST = LIBRARY / "approved/bob/2026-11-19"
TARGET = DEST / "bob-voice-reference-approved.wav"
MANIFEST = DEST / "manifest.json"

def sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()

def approved_source():
    candidates = (
        [HOME / "Downloads/BOB-VOZ-OFICIAL-APROBADA-2026-11-19.wav"]
        + sorted((LIBRARY / "bob").glob("*/01-seseo-latino.wav"))
        + sorted((LIBRARY / "bob").glob("*/01-seseo-latino(1).wav"))
        + [HOME / "Downloads/01-seseo-latino(1).wav"]
    )
    for path in candidates:
        if path.is_file() and path.stat().st_size == EXPECTED_BYTES and sha(path) == EXPECTED_SHA256:
            return path
    return None

def main():
    source = approved_source()
    if TARGET.exists():
        if sha(TARGET) != EXPECTED_SHA256:
            raise SystemExit("ERROR: official destination contains a different file. No changes made.")
        print("Approved Bob WAV already archived:", TARGET)
    elif source is None:
        raise SystemExit(
            "APPROVED WAV NOT FOUND. Download the official approved WAV from chat "
            "into Downloads, then run this command again. No files were modified."
        )
    else:
        DEST.mkdir(parents=True, exist_ok=True)
        with source.open("rb") as src, TARGET.open("xb") as dst:
            shutil.copyfileobj(src, dst)
        if sha(TARGET) != EXPECTED_SHA256:
            TARGET.unlink(missing_ok=True)
            raise SystemExit("ERROR: hash verification failed; incomplete copy discarded.")
        TARGET.chmod(0o444)
        print("Archived exact approved file from:", source)
    with wave.open(str(TARGET), "rb") as wav:
        media = dict(rate_hz=wav.getframerate(), channels=wav.getnchannels(),
                     frames=wav.getnframes(), duration_sec=wav.getnframes()/wav.getframerate())
    record = {
        "persona": "Bob",
        "approval": "Felencho approval 2026-11-19",
        "model_origin": "Qwen3-TTS VoiceDesign 1.7B, offline audition",
        "source_file_name": "01-seseo-latino(1).wav",
        "reference_text": REFERENCE_TEXT,
        "sha256": EXPECTED_SHA256,
        "size_bytes": EXPECTED_BYTES,
        "audio": media,
        "use": "Approved reference; not yet integrated into active studio",
        "note": "A generated VoiceDesign sample, NOT proof of reproducible voice identity.",
    }
    if MANIFEST.exists():
        old = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if old.get("sha256") != EXPECTED_SHA256:
            raise SystemExit("ERROR: official manifest differs; preserving existing file.")
    else:
        with MANIFEST.open("x", encoding="utf-8") as stream:
            json.dump(record, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        MANIFEST.chmod(0o444)
    print("SHA256:", sha(TARGET))
    print("Manifest:", MANIFEST)
    print("No studio, model, Serena, LiveKit, or hologram services touched.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
