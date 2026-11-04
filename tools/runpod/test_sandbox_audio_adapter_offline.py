"""Async sandbox tests; no speaker, network, GPU or synthetic voice."""
import asyncio
import unittest

import sandbox_audio_adapter_offline as adapter


async def source(*chunks):
    for chunk in chunks:
        await asyncio.sleep(0)
        yield chunk


class SandboxAudioTests(unittest.IsolatedAsyncioTestCase):
    async def test_studio_accepts_chunks_and_finishes(self):
        sink = adapter.MemorySink()
        app = adapter.SandboxAudioAdapter(sink)
        await app.connect()
        await app.start("lina", "one", source(b"a", b"b"), presenter_granted=True)
        await app._task
        self.assertEqual(sink.chunks, [("lina", b"a"), ("lina", b"b")])
        self.assertIsNone(app.state.presence.active_speaker)

    async def test_interrupt_clears_and_prevents_replay(self):
        sink = adapter.MemorySink()
        app = adapter.SandboxAudioAdapter(sink)
        await app.connect()
        entered = asyncio.Event()
        resume = asyncio.Event()

        async def delayed():
            yield b"first"
            entered.set()
            await resume.wait()
            yield b"late"

        await app.start("bob", "turn", delayed(), presenter_granted=True)
        await entered.wait()
        await app.interrupt()
        resume.set()
        await asyncio.sleep(0)
        self.assertEqual(sink.chunks, [])
        self.assertGreaterEqual(sink.clears, 1)
        with self.assertRaises(ValueError):
            await app.start("lina", "next", source(b"x"), presenter_granted=True)
        await app.resume_presenter()
        await app.start("lina", "next", source(b"new"), presenter_granted=True)
        await app._task
        self.assertEqual(sink.chunks, [("lina", b"new")])

    async def test_reject_unauthorized_turn(self):
        app = adapter.SandboxAudioAdapter(adapter.MemorySink())
        await app.connect()
        with self.assertRaises(ValueError):
            await app.start("lina", "one", source(b"a"), presenter_granted=False)
        self.assertIsNone(app.state.presence.active_speaker)

    async def test_invalid_payload_fails_closed(self):
        app = adapter.SandboxAudioAdapter(adapter.MemorySink())
        await app.connect()
        await app.start("lina", "one", source("not bytes"), presenter_granted=True)
        with self.assertRaises(ValueError):
            await app._task
        self.assertTrue(app.state.gate.presenter_override)

    async def test_interrupt_cancels_blocked_sink_push(self):
        entered = asyncio.Event()
        class BlockedSink(adapter.MemorySink):
            async def push(self, actor, payload):
                entered.set()
                await asyncio.Event().wait()  # cancellation must release this
                await super().push(actor, payload)

        sink = BlockedSink()
        app = adapter.SandboxAudioAdapter(sink)
        await app.connect()
        await app.start("lina", "blocked", source(b"audio"), presenter_granted=True)
        await asyncio.wait_for(entered.wait(), timeout=1)
        await asyncio.wait_for(app.interrupt(), timeout=1)
        self.assertIsNone(app.state.presence.active_speaker)
        self.assertEqual(sink.chunks, [])
        self.assertTrue(app.state.gate.presenter_override)

    async def test_close_disconnects(self):
        app = adapter.SandboxAudioAdapter(adapter.MemorySink())
        await app.connect()
        await app.start("bob", "one", source(b"a"), presenter_granted=True)
        await app.close()
        self.assertFalse(app.state.presence.connected)
        self.assertEqual(app.state.gate.active_actor, None)


if __name__ == "__main__":
    unittest.main()
