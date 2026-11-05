"""Offline checks for RunPod cold-start readiness: no GPU, network or secrets."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

FILE = Path(__file__).with_name("cold_start_readiness.py")
spec = importlib.util.spec_from_file_location("fae_cold_start", FILE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ColdStartReadinessTests(unittest.TestCase):
    def test_missing_secret_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / "bridge.py").touch()
            (path / "engine").mkdir()
            result = module.inspect({}, path / "bridge.py", path / "engine")
            self.assertEqual(result["status"], "blocked")
            self.assertFalse(result["checks"]["secret_injected"])
            self.assertFalse(result["gpu_touched"])

    def test_unresolved_reference_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / "bridge.py").touch()
            (path / "engine").mkdir()
            result = module.inspect({module.SECRET_ENV: "{{ RUNPOD_SECRET_FELENCHO_GITHUB }}"}, path / "bridge.py", path / "engine")
            self.assertEqual(result["status"], "blocked")

    def test_ready_safely_redacts_secret(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / "bridge.py").touch()
            (path / "engine").mkdir()
            secret = "test-secret-string-not-a-real-token-12345"
            result = module.inspect({module.SECRET_ENV: secret}, path / "bridge.py", path / "engine")
            self.assertEqual(result["status"], "ready_for_read_only_bridge")
            self.assertNotIn(secret, repr(result))
            self.assertFalse(result["inference_enabled"])

    def test_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path / "real-bridge.py").touch()
            (path / "bridge.py").symlink_to(path / "real-bridge.py")
            (path / "engine").mkdir()
            result = module.inspect({module.SECRET_ENV: "a" * 32}, path / "bridge.py", path / "engine")
            self.assertEqual(result["status"], "blocked")

if __name__ == "__main__":
    unittest.main()
