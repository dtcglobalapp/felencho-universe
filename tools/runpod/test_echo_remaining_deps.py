"""Offline tests for bounded EchoMimic distribution metadata inspection."""
import tempfile
import unittest
from pathlib import Path

import inspect_echo_remaining_deps as inspector


class EchoRemainingDepsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "engine"
        self.packages = self.root / "venv/lib/python3.11/site-packages"
        self.packages.mkdir(parents=True)

    def add_dist(self, name, version="1.2.3"):
        folder = self.packages / (name.replace("-", "_") + "-" + version + ".dist-info")
        folder.mkdir()
        (folder / "METADATA").write_text(
            "Metadata-Version: 2.1\nName: " + name + "\nVersion: " + version + "\n"
        )

    def test_empty_is_incomplete(self):
        report = inspector.inventory(self.root)
        self.assertEqual(report["status"], "metadata_incomplete")
        self.assertFalse(report["gpu_inference_executed"])
        self.assertFalse(report["third_party_imported"])

    def test_complete_metadata_does_not_claim_imports(self):
        for name in inspector.DISTRIBUTIONS:
            self.add_dist(name)
        report = inspector.inventory(self.root)
        self.assertEqual(report["status"], "metadata_complete")
        self.assertTrue(all(v["installed_metadata"] for v in report["distributions"].values()))
        self.assertFalse(report["third_party_imported"])

    def test_symlinked_distribution_not_trusted(self):
        other = Path(self.tmp.name) / "other"
        other.mkdir()
        (other / "METADATA").write_text("Name: librosa\nVersion: 9.9\n")
        (self.packages / "librosa-9.9.dist-info").symlink_to(other, target_is_directory=True)
        self.assertFalse(inspector.inventory(self.root)["distributions"]["librosa"]["installed_metadata"])

    def test_ambiguous_interpreters_rejected(self):
        (self.root / "venv/lib/python3.12").mkdir()
        self.assertEqual(inspector.inventory(self.root)["reason"], "python_version_ambiguous")


if __name__ == "__main__":
    unittest.main()
