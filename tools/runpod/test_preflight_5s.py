#!/usr/bin/env python3
"""Offline checks for five-second Lina preflight; requires no GPU or model files."""
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

import preflight_5s as p


class PreflightTests(unittest.TestCase):
    def test_missing_inputs_blocks(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(p, "ROOT", Path(folder)), patch.object(p, "AUDIO", Path(folder) / "absent.wav"):
                self.assertEqual(p.inspect("musetalk")["status"], "preflight_blocked")

    def test_valid_five_second_wav(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for relative in p.INPUTS["musetalk"]:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"x")
            audio = root / "experiments/lina-musetalk-test/audio-5sec.wav"
            with wave.open(str(audio), "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(8000)
                wav.writeframes(b"\x00\x00" * 40000)
            with patch.object(p, "ROOT", root), patch.object(p, "AUDIO", audio), patch.object(p.shutil, "which", return_value="/usr/bin/ffmpeg"):
                result = p.inspect("musetalk")
            self.assertEqual(result["status"], "preflight_pass")
            self.assertEqual(result["audio"]["duration_seconds"], 5.0)
            self.assertFalse(result["inference_executed"])

    def test_duration_outside_tolerance_blocks(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for relative in p.INPUTS["echomimic"]:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"x")
            audio = root / "experiments/lina-musetalk-test/audio-5sec.wav"
            with wave.open(str(audio), "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(8000)
                wav.writeframes(b"\x00\x00" * 24000)
            with patch.object(p, "ROOT", root), patch.object(p, "AUDIO", audio), patch.object(p.shutil, "which", return_value="/usr/bin/ffmpeg"):
                self.assertEqual(p.inspect("echomimic")["status"], "preflight_blocked")


if __name__ == "__main__":
    unittest.main()
