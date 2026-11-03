"""Offline, fixed-command process timeout tests. No GPU or inference."""
import unittest
from process_timeout_rehearsal import rehearse


class ProcessTimeoutRehearsalTests(unittest.TestCase):
    def test_quick_process_exits(self):
        result = rehearse("quick", timeout_seconds=2)
        self.assertEqual(result.status, "exited")
        self.assertFalse(result.timed_out)
        self.assertEqual(result.returncode, 0)

    def test_hanging_process_is_terminated(self):
        result = rehearse("timeout", timeout_seconds=0.1)
        self.assertEqual(result.status, "timed_out")
        self.assertTrue(result.timed_out)
        self.assertIsNotNone(result.returncode)

    def test_rejects_unapproved_cases_and_timeouts(self):
        for case in ("render", "bash", "", "../other", None):
            with self.subTest(case=case), self.assertRaises(ValueError):
                rehearse(case)
        for timeout in (0, -1, 99, None, True):
            with self.subTest(timeout=timeout), self.assertRaises(ValueError):
                rehearse("quick", timeout_seconds=timeout)


if __name__ == "__main__":
    unittest.main()
