"""Offline tests for bounded Echo import progress handling; no imports from model."""
import unittest
import ast
from unittest.mock import patch
import subprocess

import inspect_echo_imports as probe


class EchoImportProgressTests(unittest.TestCase):
    def test_nested_child_code_is_valid_python(self):
        ast.parse(probe.CHILD_SOURCE)

    def test_finished_error_is_sanitized(self):
        line = "FAE_IMPORT_PROGRESS_V1=finished:torch:error:ImportError\n"
        self.assertEqual(probe._progress(line)["import_progress"], ["finished:torch:error:ImportError"])

    def test_progress_only_contains_allowlisted_modules(self):
        output = ("FAE_IMPORT_PROGRESS_V1=started:torch\n"
                  "FAE_IMPORT_PROGRESS_V1=finished:torch:ok\n"
                  "FAE_IMPORT_PROGRESS_V1=started:diffusers\n"
                  "noise with secret data\n")
        self.assertEqual(probe._progress(output)["import_progress"], [
            "started:torch", "finished:torch:ok", "started:diffusers"
        ])

    def test_handles_timeout_stdout_bytes(self):
        with patch.object(probe, "PYTHON", __import__("pathlib").Path(__file__)), \
             patch.object(probe.os, "access", return_value=True), \
             patch.object(probe.subprocess, "run",
                 side_effect=subprocess.TimeoutExpired(
                     ["python"], 18,
                     output=b"FAE_IMPORT_PROGRESS_V1=started:torch\n"
                            b"FAE_IMPORT_PROGRESS_V1=finished:torch:ok\n"
                            b"FAE_IMPORT_PROGRESS_V1=started:diffusers\n"
                 )):
            result = probe.run()
        self.assertEqual(result["error"], "TimeoutExpired")
        self.assertEqual(result["import_progress"][-1], "started:diffusers")
        self.assertFalse(result["gpu_inference_executed"])

    def test_empty_timeout_progress(self):
        self.assertEqual(probe._progress(None)["import_progress"], [])


if __name__ == "__main__":
    unittest.main()
