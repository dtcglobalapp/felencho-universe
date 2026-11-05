#!/usr/bin/env python3
"""Measure simulated presenter interruptions, offline and without GPU/audio devices.

Timing is for an in-memory cancellable coroutine on a shared CI runner.
It is NOT microphone, TTS, WebRTC, or speaker interruption latency.
"""
from __future__ import annotations

import asyncio
import json
import statistics
import time

from sandbox_audio_adapter_offline import MemorySink, SandboxAudioAdapter


class DelayedSink(MemorySink):
    def __init__(self):
        super().__init__()
        self.entered = asyncio.Event()

    async def push(self, actor: str, payload: bytes) -> None:
        self.entered.set()
        await asyncio.Event().wait()  # cancelled by presenter interrupt


async def one_trial(index: int) -> float:
    sink = DelayedSink()
    engine = SandboxAudioAdapter(sink)
    await engine.connect()

    async def source():
        yield b"simulation-only"

    await engine.start("lina" if index % 2 else "bob",
                       "trial-" + str(index), source(), presenter_granted=True)
    try:
        await asyncio.wait_for(sink.entered.wait(), 1.0)
        began = time.perf_counter()
        await asyncio.wait_for(engine.interrupt(), 1.0)
        elapsed_ms = (time.perf_counter() - began) * 1000
        if sink.chunks or engine.state.presence.active_speaker is not None:
            raise AssertionError("stale_audio_after_interrupt")
        return elapsed_ms
    finally:
        if engine._task is not None and not engine._task.done():
            engine._task.cancel()


async def run(trials: int = 20) -> dict:
    if type(trials) is not int or not 1 <= trials <= 100:
        raise ValueError("invalid_trial_count")
    samples = [await one_trial(i) for i in range(trials)]
    ordered = sorted(samples)
    return {
        "scope": "in_memory_asyncio_cancellation_only",
        "trials": trials,
        "median_ms": round(statistics.median(ordered), 3),
        "p95_ms": round(ordered[max(0, (95 * trials + 99) // 100 - 1)], 3),
        "max_ms": round(ordered[-1], 3),
        "physical_audio_measured": False,
        "tts_measured": False,
        "gpu_used": False,
    }


if __name__ == "__main__":
    print(json.dumps(asyncio.run(run()), sort_keys=True))
