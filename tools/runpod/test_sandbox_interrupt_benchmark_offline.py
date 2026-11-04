"""Offline benchmark tests: ensure in-memory-only interruption reporting."""
import asyncio
import unittest
import sandbox_interrupt_benchmark_offline as benchmark

class InterruptBenchmarkTests(unittest.IsolatedAsyncioTestCase):
    async def test_cancels_blocked_sink_with_no_audio(self):
        result = await benchmark.run(3)
        self.assertEqual(result["trials"], 3)
        self.assertFalse(result["physical_audio_measured"])
        self.assertFalse(result["tts_measured"])
        self.assertFalse(result["gpu_used"])
        self.assertGreaterEqual(result["max_ms"], result["median_ms"])

    async def test_invalid_trial_count_rejected(self):
        for value in (0, 101, -1, True, "20"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                await benchmark.run(value)

if __name__ == "__main__":
    unittest.main()
