"""Isolated tests for creating private output folders, without video or GPU."""
import os
import stat
import tempfile
import unittest
from pathlib import Path

from private_output_sandbox import PrivateOutputRejected, create_private_job_directory


class PrivateOutputSandboxTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.workspace = Path(self.tmp.name) / "workspace"
        self.workspace.mkdir(mode=0o700)

    def test_new_folders_private(self):
        result = create_private_job_directory(self.workspace, "job-0000000042")
        self.assertEqual(result, self.workspace / "outputs/job-0000000042")
        self.assertTrue(result.is_dir())
        self.assertEqual(stat.S_IMODE(result.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE(result.parent.stat().st_mode), 0o700)

    def test_does_not_reuse_existing_job(self):
        create_private_job_directory(self.workspace, "job-0000000042")
        with self.assertRaisesRegex(PrivateOutputRejected, "directory_already_exists"):
            create_private_job_directory(self.workspace, "job-0000000042")

    def test_rejects_unsafe_names(self):
        for name in ("", "../job-0000000001", "job-5", "job-0000000001/elsewhere",
                     "job-0000000001\n", "job-000000000001"):
            with self.subTest(name=name), self.assertRaises(PrivateOutputRejected):
                create_private_job_directory(self.workspace, name)

    def test_rejects_symlinked_outputs_directory(self):
        other = Path(self.tmp.name) / "outside"
        other.mkdir()
        (self.workspace / "outputs").symlink_to(other, target_is_directory=True)
        with self.assertRaises(PrivateOutputRejected):
            create_private_job_directory(self.workspace, "job-0000000001")
        self.assertEqual(list(other.iterdir()), [])

    def test_rejects_preexisting_world_readable_outputs(self):
        outputs = self.workspace / "outputs"
        outputs.mkdir()
        outputs.chmod(0o755)
        with self.assertRaisesRegex(PrivateOutputRejected, "outputs_permissions_unsafe"):
            create_private_job_directory(self.workspace, "job-0000000001")
        self.assertFalse((outputs / "job-0000000001").exists())

    def test_rejects_world_readable_workspace(self):
        self.workspace.chmod(0o755)
        with self.assertRaisesRegex(PrivateOutputRejected, "workspace_owner_or_permissions_invalid"):
            create_private_job_directory(self.workspace, "job-0000000001")
        self.assertFalse((self.workspace / "outputs").exists())

    def test_rejects_symlinked_workspace(self):
        other = Path(self.tmp.name) / "other"
        other.mkdir()
        (Path(self.tmp.name) / "linked").symlink_to(other, target_is_directory=True)
        with self.assertRaises(PrivateOutputRejected):
            create_private_job_directory(Path(self.tmp.name) / "linked", "job-0000000001")

    def test_rejects_existing_job_symlink(self):
        outputs = self.workspace / "outputs"
        outputs.mkdir(mode=0o700)
        target = Path(self.tmp.name) / "outside"
        target.mkdir()
        (outputs / "job-0000000001").symlink_to(target, target_is_directory=True)
        with self.assertRaisesRegex(PrivateOutputRejected, "directory_already_exists"):
            create_private_job_directory(self.workspace, "job-0000000001")
        self.assertEqual(list(target.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
