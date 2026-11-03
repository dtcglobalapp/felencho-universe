"""Offline render contract tests; no GPU, disk writes, network, or model imports."""
import unittest
from dataclasses import replace

from render_dry_run import (
    ALLOWED_AUTHOR, ALLOWED_ISSUE_BODY, ALLOWED_ISSUE_TITLE,
    MAX_RUNTIME_SECONDS, PRESET, simulate, validate_request,
)


def valid_issue():
    return {
        "number": 123,
        "title": ALLOWED_ISSUE_TITLE,
        "body": ALLOWED_ISSUE_BODY,
        "state": "open",
        "user": {"login": ALLOWED_AUTHOR},
    }


class RenderDryRunTests(unittest.TestCase):
    def test_fixed_5s_plan(self):
        plan = validate_request(valid_issue())
        self.assertEqual(plan.preset, PRESET)
        self.assertEqual(plan.duration_seconds, 5)
        self.assertEqual(plan.max_runtime_seconds, MAX_RUNTIME_SECONDS)
        self.assertEqual(plan.relative_output, "job-0000000123/lina_echomimic_5s.mp4")

    def test_denies_duplicate(self):
        with self.assertRaisesRegex(ValueError, "duplicate_request"):
            validate_request(valid_issue(), frozenset({123}))

    def test_denies_every_mutable_command_surface(self):
        cases = [
            {"title": "[FAE-RUNPOD] exec"},
            {"body": ALLOWED_ISSUE_BODY + "\\npath=/tmp"},
            {"body": ALLOWED_ISSUE_BODY + "\\nseconds=30"},
            {"state": "closed"},
            {"user": {"login": "other"}},
            {"number": -1},
            {"number": 0},
            {"number": True},
            {"number": 10 ** 11},
            {"path": "/tmp/evil.mp4"},
        ]
        for update in cases:
            with self.subTest(update=update):
                issue = valid_issue()
                issue.update(update)
                with self.assertRaises(ValueError):
                    validate_request(issue)

    def test_dry_run_never_claims_render(self):
        report = simulate(123)
        self.assertEqual(report["status"], "offline_dry_run_only")
        self.assertTrue(report["duplicate_rejected"])
        self.assertFalse(report["gpu_executed"])
        self.assertFalse(report["subprocess_executed"])
        self.assertFalse(report["files_written"])
        self.assertFalse(report["issue_bridge_enabled"])


if __name__ == "__main__":
    unittest.main()
