"""Unit tests for persistent claim registry; isolated temporary SQLite only."""
import sqlite3
import tempfile
import unittest
from pathlib import Path

from job_claims_offline import ClaimRejected, claim, finish, get_status

F1 = "a" * 64
F2 = "b" * 64

class JobClaimsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.database = Path(self.tmp.name) / "jobs.sqlite3"

    def test_claim_survives_connection_reopen_and_blocks_replay(self):
        self.assertTrue(claim(self.database, 101, F1))
        self.assertEqual(get_status(self.database, 101), "claimed")
        with self.assertRaises(ClaimRejected):
            claim(self.database, 101, F1)

    def test_only_one_active_job(self):
        claim(self.database, 101, F1)
        with self.assertRaises(ClaimRejected):
            claim(self.database, 102, F2)
        finish(self.database, 101, F1, "complete")
        self.assertTrue(claim(self.database, 102, F2))
        self.assertEqual(get_status(self.database, 101), "complete")

    def test_no_replay_even_after_failure(self):
        claim(self.database, 101, F1)
        finish(self.database, 101, F1, "failed")
        with self.assertRaises(ClaimRejected):
            claim(self.database, 101, F1)

    def test_interrupted_job_not_reclaimed_automatically(self):
        claim(self.database, 101, F1)
        self.assertEqual(get_status(self.database, 101), "claimed")
        with self.assertRaises(ClaimRejected):
            claim(self.database, 102, F2)
        finish(self.database, 101, F1, "interrupted")
        self.assertTrue(claim(self.database, 102, F2))

    def test_terminal_transition_requires_matching_claim(self):
        claim(self.database, 101, F1)
        with self.assertRaises(ClaimRejected):
            finish(self.database, 101, F2, "complete")
        self.assertEqual(get_status(self.database, 101), "claimed")
        self.assertTrue(finish(self.database, 101, F1, "complete"))
        with self.assertRaises(ClaimRejected):
            finish(self.database, 101, F1, "failed")

    def test_bad_inputs_rejected(self):
        for issue in (0, -1, True, 10**11):
            with self.subTest(issue=issue), self.assertRaises(ValueError):
                claim(self.database, issue, F1)
        for bad in ("abc", "z"*64, None):
            with self.subTest(fingerprint=bad), self.assertRaises(ValueError):
                claim(self.database, 101, bad)
        with self.assertRaises(ValueError):
            finish(self.database, 101, F1, "running")

if __name__ == "__main__":
    unittest.main()
