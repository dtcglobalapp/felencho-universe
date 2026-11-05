"""Static safeguards for the experimental hologram browser preview route."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "app/hologram-lab/page.tsx"
DEMO = ROOT / "tools/runpod/demo/hologram_audio_reactive.html"

class HologramLabPageTests(unittest.TestCase):
    def test_page_embeds_exact_local_sandbox_demo(self):
        page = PAGE.read_text()
        self.assertIn('srcDoc={html}', page)
        self.assertIn('sandbox="allow-scripts"', page)
        self.assertIn('"tools",', page)
        self.assertIn('"hologram_audio_reactive.html"', page)
        self.assertTrue(DEMO.is_file())

    def test_no_external_voice_or_provider_credentials(self):
        page = PAGE.read_text()
        for forbidden in ("ELEVENLABS_API_KEY", "CARTESIA_API_KEY", "LIVEKIT_API_SECRET", "fetch(", "getUserMedia("):
            self.assertNotIn(forbidden, page)
        self.assertIn("No se usa RunPod", page)

    def test_no_live_production_route_changed(self):
        page = PAGE.read_text()
        self.assertIn("Laboratorio", page)
        self.assertIn("Experimental", page)

if __name__ == "__main__":
    unittest.main()
