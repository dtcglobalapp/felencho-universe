"""Pure frame budget tests. No GPU or model imports."""
import unittest
from frame_budget_offline import assess, exact_five_seconds

class FrameBudgetTests(unittest.TestCase):
    def test_default_81_frames_shortens_audio(self):
        r = assess(5.0, 25, 81, 4)
        self.assertEqual(r.output_frames, 81)
        self.assertFalse(r.preserves_full_audio)
        self.assertAlmostEqual(r.output_seconds, 3.24)

    def test_ratio_four_preserves_125_frames(self):
        r = exact_five_seconds(4)
        self.assertEqual(r.output_frames, 125)
        self.assertEqual(r.output_seconds, 5.0)

    def test_ratio_eight_truncates(self):
        with self.assertRaisesRegex(ValueError, "vae_ratio_not_compatible"):
            exact_five_seconds(8)

    def test_invalid_input_fails_closed(self):
        for ratio in (None, 0, True, -1, 33):
            with self.subTest(ratio=ratio), self.assertRaises(ValueError):
                exact_five_seconds(ratio)
        for fps in (0, True, 60):
            with self.subTest(fps=fps), self.assertRaises(ValueError):
                assess(5.0, fps, 125, 4)

if __name__ == "__main__":
    unittest.main()
