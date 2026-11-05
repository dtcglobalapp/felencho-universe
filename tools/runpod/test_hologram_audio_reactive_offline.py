"""Static smoke tests for the isolated hologram + audio visualizer prototype."""
from pathlib import Path
import unittest

DEMO = Path(__file__).parent / "demo" / "hologram_audio_reactive.html"

class HologramAudioReactiveTests(unittest.TestCase):
    def test_two_named_canvases_and_audio_inputs(self):
        text = DEMO.read_text()
        for name in ("bob", "lina"):
            self.assertIn('id="' + name + '"', text)
            self.assertIn('id="' + name + '-file"', text)
            self.assertIn('id="' + name + '-play"', text)
            self.assertIn('id="' + name + '-stop"', text)

    def test_audio_reactivity_has_no_avatar_or_network_dependency(self):
        text = DEMO.read_text()
        for required in ("createMediaElementSource", "createAnalyser", "getByteFrequencyData",
                         "requestAnimationFrame", "audio.pause()", "URL.revokeObjectURL"):
            self.assertIn(required, text)
        for forbidden in ("fetch(", "WebSocket(", "RTCPeerConnection(",
                          "getUserMedia(", "OPENAI_API_KEY", "LEMONSLICE_API_KEY"):
            self.assertNotIn(forbidden, text)

    def test_bob_lina_exclusive_audio_turns(self):
        text = DEMO.read_text()
        self.assertIn("active!==m.id", text)
        self.assertIn(".reset()", text)
        self.assertIn("if(active===m.id)active=null", text)

if __name__ == "__main__":
    unittest.main()
