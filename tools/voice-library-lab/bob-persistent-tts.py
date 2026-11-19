#!/usr/bin/env python3
"""Producer-approved Bob voice: one offline model load, local-only serial TTS.

Standalone process on loopback 127.0.0.1:7895. It never modifies studio services,
downloads models, substitutes voices, publishes audio, or connects to the Internet.
"""
import argparse
import hashlib
import io
import json
import os
import platform
import sys
import threading
import time
import wave
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

REFERENCE_TEXT = (
    "Felencho, desde Nueva York conversamos con cinco vecinos sobre la "
    "situación de la ciudad. Gracias por comenzar esta conversación."
)
SHA256 = "ded8765793829fc49b9ab85ebf1566cff11d97c848b746a509082ccde4a81477"
ROOT = Path.home() / "Documents" / "FelenchoMundial" / "voice-library"
REFERENCE = ROOT / "approved" / "bob" / "2026-11-19" / "bob-voice-reference-approved.wav"
MODEL = ROOT / "models" / "qwen3-base-1.7b"
READY_AT = None
MODEL_OBJECT = None
MLX = None
NP = None
SF = None

def verify():
    with REFERENCE.open("rb") as f:
        sha = hashlib.file_digest(f, "sha256").hexdigest()
    if sha != SHA256:
        raise RuntimeError("La huella de la referencia oficial de Bob no coincide")
    with wave.open(str(REFERENCE), "rb") as wav:
        if wav.getframerate() != 24000 or wav.getnchannels() != 1:
            raise RuntimeError("Referencia Bob: WAV no autorizado")
    if not (MODEL / "config.json").is_file() or not list(MODEL.glob("*.safetensors")):
        raise RuntimeError("El modelo Base aprobado no está disponible localmente")
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise RuntimeError("El motor requiere macOS Apple Silicon")

def initialize():
    global MODEL_OBJECT, MLX, NP, SF, READY_AT
    verify()
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    import mlx.core as mx
    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model
    MODEL_OBJECT = load_model(str(MODEL))
    MLX, NP, SF = mx, np, sf
    READY_AT = time.monotonic()
    print("BOB_OFFICIAL_BASE_READY port=7895 sha=" + SHA256,flush=True)

def synthesize(text):
    parts = []
    for item in MODEL_OBJECT.generate(
        text=text, ref_audio=str(REFERENCE),ref_text=REFERENCE_TEXT,lang_code="Spanish"
    ):
        MLX.eval(item.audio)
        audio = NP.asarray(item.audio).reshape(-1)
        if len(audio):
            parts.append(audio)
    if not parts:
        raise RuntimeError("El modelo de Bob devolvió audio vacío")
    buffer = io.BytesIO()
    SF.write(buffer, NP.concatenate(parts),int(getattr(MODEL_OBJECT,"sample_rate",24000)),
             format="WAV",subtype="PCM_16")
    return buffer.getvalue()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Avoid writing user speech into logs.
        print("BOB_TTS "+(format % args),flush=True)

    def respond(self, code, body, mime="application/json"):
        payload = body if isinstance(body,bytes) else json.dumps(body,ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type",mime)
        self.send_header("Cache-Control","no-store")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path!="/health":
            return self.respond(404,{"error":"Ruta desconocida"})
        self.respond(200,{"ready":MODEL_OBJECT is not None,
                          "voice":"Bob Base 1.7B - referencia oficial",
                          "model_loaded":True,
                          "uptime_seconds":round(time.monotonic()-READY_AT,1),
                          "reference_sha256":SHA256})

    def do_POST(self):
        if self.path!="/synthesize":
            return self.respond(404,{"error":"Ruta desconocida"})
        try:
            length=int(self.headers.get("Content-Length","0"))
            if not 0 < length <= 4096:
                return self.respond(413,{"error":"Solicitud demasiado grande"})
            data=json.loads(self.rfile.read(length))
            text=data.get("text")
            if not isinstance(text,str) or not 0 < len(text.strip()) <= 500:
                return self.respond(400,{"error":"Bob requiere texto de 1 a 500 caracteres; sin recortes"})
            start=time.monotonic()
            wav=synthesize(text.strip())
            print("BOB_TTS generation_seconds=%.2f bytes=%d"%
                  (time.monotonic()-start,len(wav)),flush=True)
            return self.respond(200,wav,"audio/wav")
        except Exception as error:
            print("BOB_TTS_ERROR "+repr(error),flush=True)
            self.respond(500,{"error":"Falló la voz oficial de Bob; no se sustituyó."})

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--port",type=int,default=7895)
    args=parser.parse_args()
    if args.port!=7895:
        parser.error("Solo está permitido el puerto dedicado 7895")
    initialize()
    server=HTTPServer(("127.0.0.1",args.port),Handler)
    server.serve_forever(poll_interval=0.2)

if __name__=="__main__":
    main()
