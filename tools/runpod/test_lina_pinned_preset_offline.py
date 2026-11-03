"""Read-only pinned-preset tests; temporary fixtures only, no GPU or inference."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import lina_pinned_preset_offline as preset


class PinnedPresetTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "engine"
        self.root.mkdir()

    def test_unpopulated_engine_fails_closed(self):
        report = preset.inspect(self.root)
        self.assertEqual(report["status"], "preset_paths_blocked")
        self.assertFalse(report["bridge_render_enabled"])
        self.assertFalse(report["inference_executed"])
        self.assertFalse(report["effective_runtime_config_verified"])

    def test_no_symlinks_or_parent_traversal(self):
        self.assertFalse(preset.safe_components(self.root, "../secrets"))
        self.assertFalse(preset.safe_components(self.root, ".hidden/file"))
        (self.root / "symlink").symlink_to(self.tmp.name, target_is_directory=True)
        self.assertFalse(preset.safe_components(self.root, "symlink/file"))

    def test_fixed_fixture_paths_can_be_verified_without_models(self):
        for relative, _ in preset.FILES.values():
            p = self.root / relative
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(b"fixture")
        for relative in preset.DIRECTORIES.values():
            (self.root / relative).mkdir(parents=True, exist_ok=True)
        small_sizes = {name: 7 for name in preset.EXPECTED_SIZES}
        digest = __import__("hashlib").sha256(b"fixture").hexdigest()
        fake_files = {name: (relative, digest) if expected else (relative, None)
                      for name, (relative, expected) in preset.FILES.items()}
        with patch.object(preset, "EXPECTED_SIZES", small_sizes), patch.object(preset, "FILES", fake_files):
            report = preset.inspect(self.root)
        self.assertEqual(report["status"], "preset_paths_verified_offline")
        self.assertFalse(report["bridge_render_enabled"])
        self.assertFalse(report["effective_runtime_config_verified"])

    def test_wrong_audio_size_blocks(self):
        for relative, _ in preset.FILES.values():
            p = self.root / relative
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(b"fixture")
        for relative in preset.DIRECTORIES.values():
            (self.root / relative).mkdir(parents=True, exist_ok=True)
        digest = __import__("hashlib").sha256(b"fixture").hexdigest()
        fake_files = {name: (relative, digest) if expected else (relative, None)
                      for name, (relative, expected) in preset.FILES.items()}
        small_sizes = {name: 7 for name in preset.EXPECTED_SIZES}
        small_sizes["audio"] = 8
        with patch.object(preset, "EXPECTED_SIZES", small_sizes), patch.object(preset, "FILES", fake_files):
            self.assertEqual(preset.inspect(self.root)["status"], "preset_paths_blocked")


if __name__ == "__main__":
    unittest.main()
