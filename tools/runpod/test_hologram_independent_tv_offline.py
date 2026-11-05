"""Checks for self-contained hologram art and two separate TV routes."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

class SeparateHologramDisplaysTest(unittest.TestCase):
    def test_data_embedded_in_sandbox_frame(self):
        p=(ROOT/"lib/hologramPreviewHtml.ts").read_text()
        self.assertIn("data:image/svg+xml;base64,",p)
        self.assertIn("Buffer.from(bob)",p)
        self.assertIn("Buffer.from(lina)",p)
        self.assertIn('figure.src=',p)
        self.assertIn("buildHologramPreviewHtml",p)

    def test_lab_loads_embedded_assets(self):
        p=(ROOT/"app/hologram-lab/page.tsx").read_text()
        self.assertIn("buildHologramPreviewHtml()",p)
        self.assertIn("srcDoc={html}",p)
        self.assertIn('sandbox="allow-scripts"',p)

    def test_distinct_tv_routes_do_not_modify_live_presence(self):
        for character in ("bob","lina"):
            p=(ROOT/f"app/hologram-lab/{character}/page.tsx").read_text()
            self.assertIn(f'character: "{character}"',p)
            self.assertIn("tvMode: true",p)
            self.assertIn("srcDoc={html}",p)
            self.assertIn('sandbox="allow-scripts"',p)
            self.assertNotIn("fetch(",p)
            self.assertNotIn("getUserMedia(",p)

if __name__=="__main__":
    unittest.main()
