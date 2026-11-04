"""Static tests: opt-in sidecar must not replace the Pod's normal startup."""
from pathlib import Path
import subprocess
import unittest

SIDE = Path(__file__).with_name("start_bridge_sidecar.sh")

class BridgeSidecarTests(unittest.TestCase):
    def test_valid_bash(self):
        result = subprocess.run(["bash", "-n", str(SIDE)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_sidecar_does_not_replace_jupyter_ssh_or_modify_engine(self):
        script = SIDE.read_text()
        self.assertIn('--check', script)
        self.assertIn('nohup bash "$BOOT"', script)
        self.assertIn('FAE_BRIDGE_HOOK=preflight_blocked', script)
        for forbidden in ("docker run", "chmod 777", "chmod 666", "rm -rf",
                          "pkill", "git clone", "pip install", "curl ",
                          "printenv", "FELENCHO_RUNPOD_GITHUB_TOKEN="):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, script)

if __name__ == "__main__":
    unittest.main()
