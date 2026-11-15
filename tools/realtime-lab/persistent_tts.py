#!/usr/bin/env python3
"""Local, single-worker persistent Qwen3-TTS service for Felencho's Mac.
No external paid APIs. Loads the already cached MLX model once at startup.
Run with: ~/felencho-qwen3-tts-lab/.venv/bin/python tools/realtime-lab/persistent_tts.py
"""
import io
import json
import math
import os
import struct
import time
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

MODEL = "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
HOST = "127.0.0.1"
PORT = 7894
print("[Felencho TTS] Loading cached model once...", flush=True)
from mlx_audio.tts.utils import load_model
model = load_model(MODEL)
model_lock = Lock()
print("[Felencho TTS] Ready on http://%s:%d" % (HOST, PORT), flush=True)

class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, fmt, *args):
        print("[Felencho TTS] " + fmt % args, flush=True)

    def respond(self, code, data, mime="application/json", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if extra:
            for name, value in extra.items():
                self.send_header(name, str(value))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path != "/health":
            self.respond(404, b'{"error":"Not found"}')
            return
        self.respond(200, json.dumps({"ok": True, "model": MODEL, "voices": ["Eric", "Aiden", "Dylan", "Ryan", "Serena"]}).encode())

    def do_POST(self):
        if self.path != "/synthesize":
            self.respond(404, b'{"error":"Not found"}')
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length < 2 or length > 4000:
            self.respond(413, b'{"error":"Request too large"}')
            return
        try:
            payload = json.loads(self.rfile.read(length))
            text = payload.get("text", "")
            voice = payload.get("voice", "")
            if not isinstance(text, str) or len(text.strip()) < 3 or len(text) > 350 or voice not in ("Eric", "Aiden", "Dylan", "Ryan", "Serena"):
                self.respond(400, b'{"error":"Invalid voice or text"}')
                return
            begin = time.monotonic()
            # Single HTTPServer worker serializes jobs; no competing GPU jobs.
            import mlx.core as mx
            # Multiple health checks must not block behind synthesis.
            # Only one request at a time may use the MLX model/GPU.
            with model_lock:
                results = model.generate_custom_voice(text.strip(), speaker=voice, language="Spanish")
                chunks = []
                for result in results:
                    audio = result.audio
                    mx.eval(audio)
                    chunks.append(audio)
                if not chunks:
                    raise RuntimeError("No audio was generated")
                samples = mx.concatenate(chunks).reshape((-1,)).astype(mx.float32)
                mx.eval(samples)
            # Use the library's sample rate, avoiding an invented rate.
            sample_rate = int(model.sample_rate)
            # 16-bit PCM WAV, no additional library dependency.
            data = samples.tolist()
            pcm = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, float(v))) * 32767)) for v in data)
            output = io.BytesIO()
            with wave.open(output, "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(sample_rate)
                wav.writeframes(pcm)
            millis = round((time.monotonic() - begin) * 1000)
            self.respond(200, output.getvalue(), "audio/wav", {"X-TTS-Ms": millis, "X-Voice": voice, "X-TTS-Engine": "Qwen3-Persistent"})
        except Exception as error:
            print("[Felencho TTS] Error:", str(error), flush=True)
            self.respond(500, json.dumps({"error": str(error)[:200]}).encode())

class Server(ThreadingHTTPServer):
    daemon_threads = True

print("[Felencho TTS] Binding server on %s:%d" % (HOST, PORT), flush=True)
Server((HOST, PORT), Handler).serve_forever()
