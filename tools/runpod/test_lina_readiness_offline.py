"""Offline readiness gate tests; no inference or writes."""
import unittest
from dataclasses import replace

from lina_readiness_offline import (
    Evidence, evaluate, EXPECTED_SCRIPT_SHA, EXPECTED_CONFIG_SHA
)

def baseline():
    return Evidence(
        script_sha256=EXPECTED_SCRIPT_SHA,
        config_sha256=EXPECTED_CONFIG_SHA,
        config_ratio=4,
        effective_config_verified=False,
        local_import_smoke_passed=False,
        process_safety_passed=False,
        private_output_passed=False,
        explicit_gpu_authorization=False,
    )

class LinaReadinessTests(unittest.TestCase):
    def test_current_evidence_blocks_render(self):
        result = evaluate(baseline())
        self.assertEqual(result["status"], "blocked")
        self.assertFalse(result["GPU_executed"])
        self.assertFalse(result["bridge_render_enabled"])
        self.assertIn("effective_runtime_config_unverified", result["blocking_reasons"])
        self.assertIn("explicit_gpu_authorization_missing", result["blocking_reasons"])

    def test_mismatched_source_or_ratio_rejected(self):
        for changes in ({"script_sha256": "bad"}, {"config_sha256": "bad"},
                        {"config_ratio": 8}, {"config_ratio": True}):
            with self.subTest(changes=changes):
                result = evaluate(replace(baseline(), **changes))
                self.assertEqual(result["status"], "blocked")

    def test_all_conditions_still_does_not_run_gpu(self):
        data = replace(baseline(),
                       effective_config_verified=True,
                       local_import_smoke_passed=True,
                       process_safety_passed=True,
                       private_output_passed=True,
                       explicit_gpu_authorization=True)
        result = evaluate(data)
        self.assertEqual(result["status"], "ready_for_separate_review")
        self.assertFalse(result["GPU_executed"])
        self.assertFalse(result["bridge_render_enabled"])

    def test_wrong_schema_rejected(self):
        with self.assertRaises(ValueError):
            evaluate({})

if __name__ == "__main__":
    unittest.main()
