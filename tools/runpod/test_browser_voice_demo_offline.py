"""Static safety checks for the standalone browser voice rehearsal.

Does not execute browser JS or play audio; only catches accidental integration
with production, microphones, external endpoints and regressions in controls.
"""
from pathlib import Path
import unittest

HTML = Path(__file__).with_name("demo") / "browser_voice_interrupt.html"

class BrowserVoiceDemoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = HTML.read_text(encoding="utf-8")

    def test_local_speech_and_cancel_controls(self):
        self.assertIn("SpeechSynthesisUtterance", self.page)
        self.assertIn("synth.cancel()", self.page)
        self.assertIn("token !== generation", self.page)
        self.assertIn('id="stop"', self.page)
        self.assertIn("role=\"status\"", self.page)

    def test_isolated_from_production_and_network(self):
        for forbidden in ("fetch(", "WebSocket(", "getUserMedia(", "AudioContext(",
                          "LiveKit", "RØDECaster", "https://", "http://",
                          "<script src=", "localStorage"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, self.page)

if __name__ == "__main__":
    unittest.main()
