"""Device-free tests of stop/flush contract for isolated audio rehearsal."""
import unittest
from audio_output_contract_offline import BufferedMockOutput, CancellableOutputSink


class AudioOutputContractTests(unittest.IsolatedAsyncioTestCase):
    async def test_buffer_flush_and_explicit_resume(self):
        mock = BufferedMockOutput()
        sink = CancellableOutputSink(mock)
        await sink.push("lina", b"pcm123")
        self.assertEqual(bytes(mock.pending), b"pcm123")
        await sink.clear()
        self.assertEqual(bytes(mock.pending), b"")
        self.assertTrue(mock.stopped)
        self.assertEqual(mock.flush_count, 1)
        with self.assertRaisesRegex(RuntimeError, "output_stopped"):
            await sink.push("bob", b"blocked")
        await sink.resume()
        await sink.push("bob", b"second")
        self.assertEqual(bytes(mock.pending), b"second")

    async def test_reject_invalid_actor_and_payload(self):
        sink = CancellableOutputSink(BufferedMockOutput())
        with self.assertRaises(ValueError):
            await sink.push("guest", b"x")
        with self.assertRaises(TypeError):
            await sink.push("bob", "not bytes")

    async def test_resume_requires_prior_flush(self):
        sink = CancellableOutputSink(BufferedMockOutput())
        with self.assertRaisesRegex(RuntimeError, "output_not_stopped"):
            await sink.resume()


if __name__ == "__main__":
    unittest.main()
