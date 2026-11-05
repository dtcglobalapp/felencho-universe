"""Offline, non-executing manifest tests; do not import EchoMimic."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import lina_argv_preview_offline as preview


SOURCE = """
import argparse
def parse_args():
    parser = argparse.ArgumentParser()
    for flag in (): pass
"""


def create_source(root, flags):
    source = root / preview.FILES["entrypoint"][0]
    source.parent.mkdir(parents=True, exist_ok=True)
    statements = ["import argparse", "def parse_args():",
                  "    parser = argparse.ArgumentParser()"]
    statements.extend("    parser.add_argument(" + repr(flag) + ")" for flag in flags)
    source.write_text("\n".join(statements) + "\n", encoding="utf-8")
    return source


class ArgvPreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_complete_cli_flag_inventory_remains_non_executable(self):
        source = create_source(self.root, preview.REQUIRED_FLAGS)
        import hashlib
        with patch.object(preview, "SCRIPT_SHA", hashlib.sha256(source.read_bytes()).hexdigest()):
            data = preview.review(self.root)
        self.assertEqual(data["status"], "flags_present_but_render_blocked")
        self.assertFalse(data["gpu_inference_executed"])
        self.assertFalse(data["process_started"])
        self.assertFalse(data["bridge_render_enabled"])
        self.assertEqual(data["missing_flags"], [])

    def test_unrecognized_flag_blocks(self):
        source = create_source(self.root, preview.REQUIRED_FLAGS - {"--vae_path"})
        import hashlib
        with patch.object(preview, "SCRIPT_SHA", hashlib.sha256(source.read_bytes()).hexdigest()):
            data = preview.review(self.root)
        self.assertEqual(data["status"], "render_blocked_missing_flags")
        self.assertEqual(data["missing_flags"], ["--vae_path"])

    def test_wrong_identity_blocks_before_flags(self):
        create_source(self.root, preview.REQUIRED_FLAGS)
        self.assertEqual(preview.review(self.root)["reason"], "entrypoint_sha_changed")

    def test_missing_script_blocks(self):
        self.assertEqual(preview.review(self.root)["reason"], "unsafe_or_missing_entrypoint")

    def test_manifest_cannot_select_shell_or_output(self):
        flags = [flag for flag, _ in preview.PROPOSED]
        self.assertEqual(len(flags), len(set(flags)))
        self.assertNotIn("--save_path", flags)
        self.assertTrue(all(flag.startswith("--") for flag in flags))
        self.assertFalse(any("render" in flag for flag in flags))


if __name__ == "__main__":
    unittest.main()
