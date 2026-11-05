"""Boot wrapper contract checks (never starts a worker or needs secrets)."""
from pathlib import Path
import subprocess
import unittest

SCRIPT = Path(__file__).with_name("boot_bridge.sh")

class BridgeBootTests(unittest.TestCase):
    def test_valid_bash(self):
        p = subprocess.run(["bash", "-n", str(SCRIPT)], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)

    def test_requires_secret_and_has_duplicate_guard(self):
        source = SCRIPT.read_text()
        readiness = Path(__file__).with_name("cold_start_readiness.py").read_text()
        self.assertIn("FELENCHO_RUNPOD_GITHUB_TOKEN", readiness)
        self.assertIn("flock -n", source)
        self.assertIn("--check", source)
        self.assertIn("cold_start_readiness.py", source)
        self.assertIn("preflight OK. No daemon started.", source)
        self.assertNotIn("git pull", source)
        self.assertNotIn("curl ", source)
        self.assertNotIn("echo ${FELENCHO_RUNPOD_GITHUB_TOKEN}", source)

if __name__ == "__main__":
    unittest.main()
