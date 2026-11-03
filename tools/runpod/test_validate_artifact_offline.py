"""Offline MP4 validation tests. Uses mocked ffprobe; no GPU or video rendering."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from validate_artifact_offline import ArtifactRejected, validate_mp4

REL = "job-0000000100/lina_echomimic_5s.mp4"


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "outputs"
        (self.root / "job-0000000100").mkdir(parents=True)
        self.path = self.root / REL
        self.path.write_bytes(b"test-fixture-not-a-real-mp4")

    def probe(self, duration="5.0", width=512, height=768, fps="25/1"):
        report = {
            "format": {"duration": duration},
            "streams": [{"codec_type": "video", "codec_name": "h264",
                         "width": width, "height": height, "avg_frame_rate": fps}],
        }
        return subprocess.CompletedProcess([], 0, stdout=json.dumps(report), stderr="")

    def test_valid_metadata_returns_local_hash_only(self):
        with patch("validate_artifact_offline.subprocess.run", return_value=self.probe()) as run:
            result = validate_mp4(self.root, REL)
        self.assertEqual(result["status"], "validated_local_artifact")
        self.assertAlmostEqual(result["duration_seconds"], 5.0)
        self.assertEqual(len(result["sha256"]), 64)
        self.assertNotIn("url", result)
        self.assertFalse(run.call_args.kwargs.get("shell", False))

    def test_bad_video_properties_are_rejected(self):
        for changes in ({"duration": "12.0"}, {"width": 60}, {"height": 5000},
                        {"fps": "0/1"}, {"fps": "25/0"}):
            with self.subTest(changes=changes):
                with patch("validate_artifact_offline.subprocess.run",
                           return_value=self.probe(**changes)):
                    with self.assertRaises(ArtifactRejected):
                        validate_mp4(self.root, REL)

    def test_bad_paths_and_symlinks_rejected_before_probe(self):
        for bad in ("../secret.mp4", "/tmp/evil.mp4", "job-1/lina_echomimic_5s.mp4",
                    "job-0000000100/other.mp4"):
            with self.subTest(path=bad), self.assertRaises(ArtifactRejected):
                validate_mp4(self.root, bad)
        self.path.unlink()
        self.path.symlink_to(Path(self.tmp.name) / "outside.mp4")
        with self.assertRaises(ArtifactRejected):
            validate_mp4(self.root, REL)

    def test_probe_failure_rejected(self):
        with patch("validate_artifact_offline.subprocess.run",
                   side_effect=subprocess.TimeoutExpired("ffprobe", 10)):
            with self.assertRaisesRegex(ArtifactRejected, "ffprobe_validation_failed"):
                validate_mp4(self.root, REL)

    def test_unapproved_probe_binary_rejected(self):
        with self.assertRaisesRegex(ArtifactRejected, "ffprobe_not_allowlisted"):
            validate_mp4(self.root, REL, ffprobe="/tmp/ffprobe")


if __name__ == "__main__":
    unittest.main()
