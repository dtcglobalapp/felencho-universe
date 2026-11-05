"""Hologram Lab visual identity and audio controls, offline."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
DEMO=ROOT/"tools/runpod/demo/hologram_audio_reactive.html"
STATIC=ROOT/"public/hologram-lab.html"

class HologramArtTests(unittest.TestCase):
    def test_distinct_artwork_assets(self):
        for cohost in ("bob","lina"):
            art=ROOT/"public/hologram-assets"/(cohost+".svg")
            self.assertTrue(art.is_file())
            s=art.read_text()
            self.assertIn("<svg",s)
            self.assertIn('viewBox="0 0 540 960"',s)
            self.assertIn("</svg>",s)
        self.assertNotEqual((ROOT/"public/hologram-assets/bob.svg").read_text(),
                            (ROOT/"public/hologram-assets/lina.svg").read_text())

    def test_both_previews_reference_distinct_character_art(self):
        for page in (DEMO,STATIC):
            t=page.read_text()
            self.assertIn("figure.src='/hologram-assets/'+m.id+'.svg'",t)
            self.assertIn("getLevel()",t)
            self.assertIn("drawImage(m.figure",t)
            self.assertIn("audio.pause();audio.currentTime=0",t)
            self.assertIn("presenter-interrupt",t)
            self.assertNotIn("getUserMedia(",t)

if __name__=="__main__":
    unittest.main()
