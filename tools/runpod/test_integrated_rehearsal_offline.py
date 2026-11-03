"""Full offline rehearsal tests with private temporary workspaces; no GPU/media."""
import stat
import tempfile
import unittest
from pathlib import Path

from integrated_rehearsal_offline import rehearse_lina_job
from job_claims_offline import ClaimRejected, get_status
from render_dry_run import ALLOWED_ISSUE_BODY, ALLOWED_ISSUE_TITLE


def issue(number=100):
    return {
        "number": number,
        "title": ALLOWED_ISSUE_TITLE,
        "body": ALLOWED_ISSUE_BODY,
        "state": "open",
        "user": {"login": "dtcglobalapp"},
    }


class IntegratedRehearsalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.workspace = Path(self.temp.name) / "sandbox"
        self.workspace.mkdir(mode=0o700)

    def test_success_stays_offline_and_private(self):
        result = rehearse_lina_job(issue(), self.workspace)
        self.assertEqual(result["status"], "rehearsal_complete_no_media")
        self.assertEqual(result["job_state"], "complete")
        self.assertFalse(result["media_created"])
        self.assertFalse(result["gpu_inference_executed"])
        self.assertFalse(result["bridge_render_enabled"])
        folder = self.workspace / "outputs/job-0000000100"
        self.assertTrue(folder.is_dir())
        self.assertEqual(stat.S_IMODE(folder.stat().st_mode), 0o700)
        self.assertEqual(list(folder.iterdir()), [])
        self.assertEqual(get_status(self.workspace / "claims.sqlite3", 100), "complete")

    def test_duplicate_cannot_restart_after_complete(self):
        rehearse_lina_job(issue(), self.workspace)
        with self.assertRaises(ClaimRejected):
            rehearse_lina_job(issue(), self.workspace)
        self.assertEqual(get_status(self.workspace / "claims.sqlite3", 100), "complete")

    def test_timeout_is_terminal(self):
        result = rehearse_lina_job(issue(101), self.workspace, fixture="timeout")
        self.assertEqual(result["status"], "fixture_timeout")
        self.assertEqual(result["job_state"], "interrupted")
        with self.assertRaises(ClaimRejected):
            rehearse_lina_job(issue(101), self.workspace)
        self.assertEqual(get_status(self.workspace / "claims.sqlite3", 101), "interrupted")

    def test_wrong_author_never_creates_database(self):
        bad = issue()
        bad["user"] = {"login": "intruder"}
        with self.assertRaises(ValueError):
            rehearse_lina_job(bad, self.workspace)
        self.assertEqual(list(self.workspace.iterdir()), [])

    def test_rejects_unsafe_workspace(self):
        self.workspace.chmod(0o755)
        with self.assertRaises(ValueError):
            rehearse_lina_job(issue(), self.workspace)
        self.assertEqual(list(self.workspace.iterdir()), [])

    def test_rejects_arbitrary_fixture(self):
        with self.assertRaises(ValueError):
            rehearse_lina_job(issue(), self.workspace, fixture="echo_gpu")
        self.assertEqual(list(self.workspace.iterdir()), [])

    def test_existing_outputs_symlink_fails_without_running_fixture(self):
        target = Path(self.temp.name) / "foreign"
        target.mkdir()
        (self.workspace / "outputs").symlink_to(target, target_is_directory=True)
        result = rehearse_lina_job(issue(), self.workspace)
        self.assertEqual(result["status"], "setup_or_fixture_failed")
        self.assertEqual(result["job_state"], "failed")
        self.assertEqual(list(target.iterdir()), [])

    def test_existing_registry_symlink_is_denied_before_claim(self):
        target = Path(self.temp.name) / "elsewhere.sqlite3"
        target.write_bytes(b"do not modify")
        (self.workspace / "claims.sqlite3").symlink_to(target)
        with self.assertRaises(ValueError):
            rehearse_lina_job(issue(), self.workspace)
        self.assertEqual(target.read_bytes(), b"do not modify")


if __name__ == "__main__":
    unittest.main()
