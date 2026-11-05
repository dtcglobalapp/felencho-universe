"""Static checks for separate browser-based hologram portrait playback, no server endpoints."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
CLIENT=ROOT/"app/hologram-stage/HologramPortraitClient.tsx"

class HologramStageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.code=CLIENT.read_text()
    def test_two_separate_routes(self):
        for name in ("bob","lina"):
            path=ROOT/f"app/hologram-stage/{name}/page.tsx"
            self.assertTrue(path.is_file())
            self.assertIn(f'character="{name}"',path.read_text())
    def test_audio_and_portrait_local_only(self):
        for symbol in ("createMediaElementSource", "createAnalyser", "getByteFrequencyData",
                       "URL.createObjectURL", "indexedDB.open", "requestAnimationFrame",
                       "canvasRef", "Interrumpir"):
            self.assertIn(symbol,self.code)
        for forbidden in ("getUserMedia(", "fetch(", "WebSocket(", "LEMONSLICE_API_KEY", "CARTESIA_API_KEY"):
            self.assertNotIn(forbidden,self.code)
    def test_discloses_simulated_depth(self):
        self.assertIn("todavía no un modelo 3D GLB",self.code)
        self.assertIn("proyección 2.5D",self.code)
    def test_private_control_toggle(self):
        self.assertIn("setShowControls",self.code)
        self.assertIn("Ocultar control",self.code)

if __name__=="__main__":
    unittest.main()
