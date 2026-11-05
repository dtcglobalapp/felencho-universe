"""Offline checks for the experimental private studio direction controls."""
import unittest
from pathlib import Path

DEMO = Path(__file__).resolve().parent / "demo" / "hologram_audio_reactive.html"

class StudioPrivateDirectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = DEMO.read_text(encoding="utf-8")

    def test_private_control_for_both_cohosts(self):
        for cohost in ("bob", "lina"):
            for action in ("listen", "think", "sleep"):
                with self.subTest(cohost=cohost, action=action):
                    self.assertIn(f'id="{cohost}-{action}"', self.html)

    def test_presenter_can_stop_active_audio(self):
        self.assertIn('id="presenter-interrupt"', self.html)
        self.assertIn("model.changeMode('escuchando')", self.html)
        self.assertIn("audio.pause();audio.currentTime=0", self.html)
        self.assertIn("generation!==epoch", self.html)

    def test_sleep_preserves_visual_presence(self):
        self.assertIn("mode==='dormido'?.43:1", self.html)
        self.assertIn("SUSPENDIDO", self.html)
        self.assertIn("requestAnimationFrame(loop)", self.html)

    def test_not_fake_voice_control(self):
        # No microphone, no wake-word recognition, no network actions in sandbox.
        for forbidden in ("SpeechRecognition", "getUserMedia(", "fetch(", "WebSocket("):
            self.assertNotIn(forbidden, self.html)

if __name__ == "__main__":
    unittest.main()
