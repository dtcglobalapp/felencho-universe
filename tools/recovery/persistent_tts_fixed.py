#!/usr/bin/env python3
"""Persistent local Qwen3-TTS, with one dedicated MLX/GPU thread.

All MLX operations (including model loading) run in the SAME thread.
HTTP /health remains responsive during synthesis; no changes to endpoint contract.
"""
import io
import json
import os
import queue
import struct
import threading
import time
import wave
from concurrent.futures import Future
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

MODEL = "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
HOST = "127.0.0.1"
PORT = 7894
VOICES = ("Eric", "Aiden", "Dylan", "Ryan", "Serena")
jobs = queue.Queue(maxsize=2)
ready = threading.Event()
load_error = None


def gpu_worker():
    global load_error
    try:
        print("[Felencho TTS] Loading cached model in GPU worker thread...", flush=True)
        import mlx.core as mx
        from mlx_audio.tts.utils import load_model
        model = load_model(MODEL)
        ready.set()
        print("[Felencho TTS] Model ready; GPU worker active", flush=True)
    except Exception as exc:
        load_error = str(exc)[:200]
        print("[Felencho TTS] Model failed to load: " + load_error, flush=True)
        return

    while True:
        text, voice, future = jobs.get()
        try:
            start = time.monotonic()
            chunks = []
            for result in model.generate_custom_voice(text, speaker=voice, language="Spanish"):
                audio = result.audio
                mx.eval(audio)
                chunks.append(audio)
            if not chunks:
                raise RuntimeError("No audio was generated")
            samples = mx.concatenate(chunks).reshape((-1,)).astype(mx.float32)
            mx.eval(samples)
            sample_rate = int(model.sample_rate)
            data = samples.tolist()
            pcm = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, float(v))) * 32767)) for v in data)
            output = io.BytesIO()
            with wave.open(output, "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(sample_rate)
                wav.writeframes(pcm)
            elapsed_ms = round((time.monotonic() - start) * 1000)
            future.set_result((output.getvalue(), elapsed_ms))
        except Exception as exc:
            print("[Felencho TTS] Synthesis error: " + str(exc), flush=True)
            future.set_exception(exc)
        finally:
            jobs.task_done()


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

    def error(self, status, message):
        self.respond(status, json.dumps({"error": message}).encode())

    def do_GET(self):
        if self.path != "/health":
            self.error(404, "Not found")
            return
        self.respond(200 if ready.is_set() else 503, json.dumps({
            "ok": ready.is_set(), "model": MODEL, "voices": list(VOICES),
            "loading": not ready.is_set() and load_error is None,
            "queued": jobs.qsize(), "error": load_error,
        }).encode())

    def do_POST(self):
        if self.path != "/synthesize":
            self.error(404, "Not found")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except (TypeError, ValueError):
            self.error(400, "Invalid Content-Length")
            return
        if length < 2 or length > 4000:
            self.error(413, "Request too large")
            return
        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.error(400, "Invalid JSON")
            return
        if not isinstance(payload, dict):
            self.error(400, "Invalid JSON body")
            return
        text, voice = payload.get("text", ""), payload.get("voice", "")
        if (not isinstance(text, str) or len(text.strip()) < 3 or
                len(text) > 350 or voice not in VOICES):
            self.error(400, "Invalid voice or text")
            return
        if not ready.is_set():
            self.error(503, "TTS model unavailable" if load_error else "TTS model loading")
            return
        future = Future()
        try:
            jobs.put_nowait((text.strip(), voice, future))
        except queue.Full:
            self.error(503, "TTS queue busy; retry shortly")
            return
        try:
            audio, elapsed_ms = future.result(timeout=180)
            self.respond(200, audio, "audio/wav", {
                "X-TTS-Ms": elapsed_ms, "X-Voice": voice,
                "X-TTS-Engine": "Qwen3-Persistent",
            })
        except TimeoutError:
            self.error(504, "TTS synthesis timeout")
        except Exception as exc:
            self.error(500, str(exc)[:200])


class Server(ThreadingHTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    threading.Thread(target=gpu_worker, name="felencho-gpu-worker", daemon=True).start()
    print("[Felencho TTS] Listening on http://%s:%d" % (HOST, PORT), flush=True)
    Server((HOST, PORT), Handler).serve_forever()
