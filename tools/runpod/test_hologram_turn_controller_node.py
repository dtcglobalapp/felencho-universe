"""Exercise the isolated hologram turn controller through Node's built-in test runner."""
from pathlib import Path
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
TEST_FILE = ROOT / "tools/runpod/demo/hologram_turn_controller.test.mjs"

class HologramTurnControllerNodeTests(unittest.TestCase):
    def test_abortable_turn_controller(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node not installed in this offline environment")
        completed = subprocess.run(
            [node, "--test", str(TEST_FILE)],
            cwd=str(ROOT),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=20,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout[-6000:])

if __name__ == "__main__":
    unittest.main()
