"""Safety regressions: TVs do not expose controls or request passwords."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
CLIENT = (ROOT / "app/hologram-stage/HologramPortraitClient.tsx").read_text()

class CleanTVTest(unittest.TestCase):
    def test_controls_off_by_default(self):
        self.assertIn("controlMode = false", CLIENT)
        self.assertIn("useState(controlMode)", CLIENT)
        self.assertIn("controlMode && showControls && (", CLIENT)
        self.assertIn("controlMode && (", CLIENT)

    def test_public_tv_pages_do_not_enable_controls(self):
        for ch in ("bob", "lina"):
            page=(ROOT / f"app/hologram-stage/{ch}/page.tsx").read_text()
            self.assertNotIn("controlMode", page)
            self.assertIn(f'character="{ch}"', page)

    def test_operator_routes_separate(self):
        for ch in ("bob", "lina"):
            page=(ROOT / f"app/hologram-stage/control/{ch}/page.tsx").read_text()
            self.assertIn("controlMode",page)
            self.assertIn(f'character="{ch}"',page)

    def test_audio_endpoint_stays_authorized(self):
        api=(ROOT / "app/api/hologram-stage/live-token/route.ts").read_text()
        self.assertIn("await authorized(request)",api)
        self.assertIn("Studio access required",api)

if __name__ == "__main__":
    unittest.main()
