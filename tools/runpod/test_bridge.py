"""Safe bridge job contract tests. No network, GPU or credentials required."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

path = Path(__file__).with_name("bridge.py")
spec = importlib.util.spec_from_file_location("fae_bridge", path)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

class BridgeTests(unittest.TestCase):
    def issue(self, **changes):
        item = {"number": 12, "state": "open", "title": bridge.JOB_TITLE,
                "body": bridge.JOB_BODY, "user": {"login": "dtcglobalapp"}}
        item.update(changes)
        return item

    def test_requires_exact_title_body_author(self):
        self.assertTrue(bridge.approved(self.issue(), "dtcglobalapp"))
        self.assertFalse(bridge.approved(self.issue(title="run shell"), "dtcglobalapp"))
        self.assertFalse(bridge.approved(self.issue(body="action=exec"), "dtcglobalapp"))
        self.assertFalse(bridge.approved(self.issue(user={"login": "someone-else"}), "dtcglobalapp"))
        self.assertFalse(bridge.approved(self.issue(state="closed"), "dtcglobalapp"))
        self.assertFalse(bridge.approved(self.issue(pull_request={}), "dtcglobalapp"))

    def test_inspect_contract_is_exact(self):
        valid = self.issue(title=bridge.INSPECT_TITLE, body=bridge.INSPECT_BODY)
        self.assertTrue(bridge.approved(valid, "dtcglobalapp"))
        self.assertEqual(bridge.requested_action(valid), "inspect")
        self.assertFalse(bridge.approved(self.issue(title=bridge.INSPECT_TITLE), "dtcglobalapp"))
        self.assertFalse(bridge.approved(self.issue(body=bridge.INSPECT_BODY), "dtcglobalapp"))
        self.assertFalse(bridge.approved(
            self.issue(title=bridge.INSPECT_TITLE, body=bridge.INSPECT_BODY + "\\naction=exec"),
            "dtcglobalapp"
        ))

    def test_inspect_dispatches_only_read_only_script(self):
        calls = []
        def fake_api(path, token, method="GET", body=None):
            calls.append((path, method, body))
            return [] if path.endswith("/comments?per_page=100") else {}
        valid = self.issue(title=bridge.INSPECT_TITLE, body=bridge.INSPECT_BODY)
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(
            bridge, "read_only_job", return_value='{"status":"inspection_only"}'
        ) as worker:
            self.assertTrue(bridge.process_one("unused", valid, "dtcglobalapp"))
            worker.assert_called_once_with("inspect")
        self.assertTrue(any(method == "POST" and '"inspection_only"' in body["body"]
                            for _, method, body in calls if body))

    def test_preflight_contract_and_dispatch(self):
        valid = self.issue(title=bridge.PREFLIGHT_TITLE, body=bridge.PREFLIGHT_BODY)
        self.assertTrue(bridge.approved(valid, "dtcglobalapp"))
        self.assertEqual(bridge.requested_action(valid), "preflight")
        self.assertFalse(bridge.approved(self.issue(
            title=bridge.PREFLIGHT_TITLE, body=bridge.PREFLIGHT_BODY + "\\nengine=anything"
        ), "dtcglobalapp"))
        self.assertFalse(bridge.approved(self.issue(
            title=bridge.PREFLIGHT_TITLE, body="FAE_RUNPOD_JOB_V1\\naction=render"
        ), "dtcglobalapp"))
        def fake_api(path, token, method="GET", body=None):
            return [] if path.endswith("/comments?per_page=100") else {}
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(
            bridge, "read_only_job", return_value='{"status":"preflight_pass"}'
        ) as worker:
            self.assertTrue(bridge.process_one("unused", valid, "dtcglobalapp"))
            worker.assert_called_once_with("preflight")

    def test_media_inspect_exact_contract(self):
        valid = self.issue(title=bridge.MEDIA_TITLE, body=bridge.MEDIA_BODY)
        self.assertTrue(bridge.approved(valid, "dtcglobalapp"))
        self.assertEqual(bridge.requested_action(valid), "media-inspect")
        self.assertFalse(bridge.approved(self.issue(
            title=bridge.MEDIA_TITLE, body=bridge.MEDIA_BODY + "\\ncommand=install"
        ), "dtcglobalapp"))
        def fake_api(path, token, method="GET", body=None):
            return [] if path.endswith("/comments?per_page=100") else {}
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(
            bridge, "read_only_job", return_value='{"status":"media_tools_inspection_only"}'
        ) as worker:
            self.assertTrue(bridge.process_one("unused", valid, "dtcglobalapp"))
            worker.assert_called_once_with("media-inspect")

    def test_inference_env_inspect_is_read_only_and_exact(self):
        valid = self.issue(title=bridge.ENV_TITLE, body=bridge.ENV_BODY)
        self.assertTrue(bridge.approved(valid, "dtcglobalapp"))
        self.assertEqual(bridge.requested_action(valid), "inference-env-inspect")
        self.assertFalse(bridge.approved(self.issue(
            title=bridge.ENV_TITLE, body=bridge.ENV_BODY + "\\nrun=1"
        ), "dtcglobalapp"))
        def fake_api(path, token, method="GET", body=None):
            return [] if path.endswith("/comments?per_page=100") else {}
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(
            bridge, "read_only_job", return_value='{"status":"inference_env_inspection_only"}'
        ) as worker:
            self.assertTrue(bridge.process_one("unused", valid, "dtcglobalapp"))
            worker.assert_called_once_with("inference-env-inspect")

    def test_echo_source_inspect_exact_contract(self):
        valid = self.issue(title=bridge.ECHO_SOURCE_TITLE, body=bridge.ECHO_SOURCE_BODY)
        self.assertTrue(bridge.approved(valid, "dtcglobalapp"))
        self.assertEqual(bridge.requested_action(valid), "echo-source-inspect")
        self.assertFalse(bridge.approved(self.issue(
            title=bridge.ECHO_SOURCE_TITLE, body=bridge.ECHO_SOURCE_BODY + "\\nrun=true"
        ), "dtcglobalapp"))
        def fake_api(path, token, method="GET", body=None):
            return [] if path.endswith("/comments?per_page=100") else {}
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(
            bridge, "read_only_job", return_value='{"status":"echo_source_static_inspection_only"}'
        ) as worker:
            self.assertTrue(bridge.process_one("unused", valid, "dtcglobalapp"))
            worker.assert_called_once_with("echo-source-inspect")

    def test_echo_cli_inspect_exact_contract(self):
        valid = self.issue(title=bridge.ECHO_CLI_TITLE, body=bridge.ECHO_CLI_BODY)
        self.assertTrue(bridge.approved(valid, "dtcglobalapp"))
        self.assertEqual(bridge.requested_action(valid), "echo-cli-inspect")
        self.assertFalse(bridge.approved(self.issue(
            title=bridge.ECHO_CLI_TITLE, body=bridge.ECHO_CLI_BODY + "\\nrender=true"
        ), "dtcglobalapp"))
        def fake_api(path, token, method="GET", body=None):
            return [] if path.endswith("/comments?per_page=100") else {}
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(
            bridge, "read_only_job", return_value='{"status":"echo_cli_static_inspection_only"}'
        ) as worker:
            self.assertTrue(bridge.process_one("unused", valid, "dtcglobalapp"))
            worker.assert_called_once_with("echo-cli-inspect")

    def test_echo_config_inspect_exact_contract(self):
        valid = self.issue(title=bridge.ECHO_CONFIG_TITLE, body=bridge.ECHO_CONFIG_BODY)
        self.assertTrue(bridge.approved(valid, "dtcglobalapp"))
        self.assertEqual(bridge.requested_action(valid), "echo-config-inspect")
        self.assertFalse(bridge.approved(self.issue(
            title=bridge.ECHO_CONFIG_TITLE, body=bridge.ECHO_CONFIG_BODY + "\\nexecute=true"
        ), "dtcglobalapp"))

    def test_success_returns_diagnostics_and_closes(self):
        calls = []
        def fake_api(path, token, method="GET", body=None):
            calls.append((path, method, body))
            if path.endswith("/comments?per_page=100"):
                return []
            return {}
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(
            bridge, "diagnostic", return_value='{"gpu":"test"}'
        ):
            self.assertTrue(bridge.process_one("unused", self.issue(), "dtcglobalapp"))
        self.assertTrue(any(method == "POST" and bridge.RESULT_TAG in body["body"]
                            for _, method, body in calls if body))
        self.assertTrue(any(method == "PATCH" and body == {"state": "closed"}
                            for _, method, body in calls if body))

    def test_never_runs_diagnostic_twice_if_result_exists(self):
        calls = []
        def fake_api(path, token, method="GET", body=None):
            calls.append((path, method))
            if path.endswith("/comments?per_page=100"):
                return [{"body": bridge.RESULT_TAG}]
            return {}
        with patch.object(bridge, "api", side_effect=fake_api), patch.object(bridge, "diagnostic") as diag:
            self.assertTrue(bridge.process_one("unused", self.issue(), "dtcglobalapp"))
            diag.assert_not_called()
        self.assertFalse(any(method == "POST" for _, method in calls))

if __name__ == "__main__":
    unittest.main()
