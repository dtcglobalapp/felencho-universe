"""Unit tests for read-only RunPod diagnostics. Run: python -m unittest discover -s tools/runpod -p 'test_*.py'"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import tempfile

SCRIPT = Path(__file__).with_name("diagnose.py")
spec = importlib.util.spec_from_file_location("runpod_diagnose", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class DiagnoseTests(unittest.TestCase):
    def test_snapshot_handles_missing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            with patch.object(module, "ALLOWED_LOGS", {"test": folder / "missing.log"}), patch.object(
                module, "ALLOWED_OUTPUTS", {"test": folder / "missing-outputs"}
            ), patch.object(module, "gpu", return_value="mock-gpu"):
                result = module.snapshot()
            self.assertEqual(result["gpu"], "mock-gpu")
            self.assertEqual(result["engines"]["test"]["log_lines"], [])
            self.assertEqual(result["engines"]["test"]["videos"], [])

    def test_snapshot_bounds_logs_and_video_listing(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            log = folder / "inference.log"
            log.write_text("\n".join(f"line {i}" for i in range(40)))
            vids = folder / "videos"
            vids.mkdir()
            (vids / "test.mp4").write_bytes(b"test")
            with patch.object(module, "ALLOWED_LOGS", {"test": log}), patch.object(
                module, "ALLOWED_OUTPUTS", {"test": vids}
            ), patch.object(module, "gpu", return_value="mock-gpu"):
                result = module.snapshot()
            self.assertEqual(len(result["engines"]["test"]["log_lines"]), 20)
            self.assertEqual(result["engines"]["test"]["videos"][0]["bytes"], 4)

if __name__ == "__main__":
    unittest.main()
