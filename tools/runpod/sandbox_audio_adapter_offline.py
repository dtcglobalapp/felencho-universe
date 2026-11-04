"""Sandbox-only cancellable audio delivery for Felencho Mundial.

Never opens speakers, the RODECaster, LiveKit, GPU or any network sockets.
Uses a caller-supplied in-memory sink, and a generation token checked before
EVERY delivery. Interrupt invalidates queued fragments and cancels producers.
It does NOT guarantee that a real audio device has stopped playing.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import AsyncIterable, Protocol
import studio_turn_coordinator_offline as coordinator


class ChunkSink(Protocol):
    async def push(self, actor: str, payload: bytes) -> None: ...
    async def clear(self) -> None: ...


@dataclass
class SandboxAudioAdapter:
    sink: ChunkSink
    state: coordinator.Studio = field(default_factory=coordinator.Studio)
    _task: asyncio.Task | None = field(default=None, init=False, repr=False)
    _guard: asyncio.Lock = field(default_factory=asyncio.Lock, init=False, repr=False)

    async def connect(self) -> None:
        async with self._guard:
            self.state = coordinator.connect(self.state)

    async def start(self, actor: str, turn_id: str, chunks: AsyncIterable[bytes],
                    *, presenter_granted: bool) -> None:
        async with self._guard:
            if self._task is not None and not self._task.done():
                raise ValueError("producer_already_running")
            new_state = coordinator.speak(self.state, actor, turn_id,
                                          presenter_granted=presenter_granted)
            generation = new_state.gate.generation
            self.state = new_state
            self._task = asyncio.create_task(self._deliver(actor, turn_id, generation, chunks))

    async def _deliver(self, actor: str, turn_id: str, generation: int,
                       chunks: AsyncIterable[bytes]) -> None:
        try:
            async for chunk in chunks:
                if type(chunk) is not bytes:
                    raise ValueError("invalid_chunk")
                async with self._guard:
                    if not coordinator.accept_audio(self.state, actor, turn_id, generation):
                        return
                    # This lock serializes delivery with interruption, but a real
                    # transport still needs explicit device buffer cancellation.
                    await self.sink.push(actor, chunk)
            async with self._guard:
                if coordinator.accept_audio(self.state, actor, turn_id, generation):
                    self.state = coordinator.finish(self.state, actor, turn_id, generation)
        except asyncio.CancelledError:
            raise
        except Exception:
            async with self._guard:
                if coordinator.accept_audio(self.state, actor, turn_id, generation):
                    self.state = coordinator.presenter_interrupt(self.state)
            raise

    async def interrupt(self) -> None:
        async with self._guard:
            self.state = coordinator.presenter_interrupt(self.state)
            task = self._task
            if task is not None and not task.done():
                task.cancel()
            await self.sink.clear()
        if task is not None:
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def resume_presenter(self) -> None:
        async with self._guard:
            self.state = coordinator.presenter_release(self.state)

    async def close(self) -> None:
        await self.interrupt()
        async with self._guard:
            self.state = coordinator.disconnect(self.state)


class MemorySink:
    """Only records bytes in test memory; no actual playback."""
    def __init__(self) -> None:
        self.chunks: list[tuple[str, bytes]] = []
        self.clears = 0

    async def push(self, actor: str, payload: bytes) -> None:
        self.chunks.append((actor, payload))

    async def clear(self) -> None:
        self.clears += 1
        self.chunks.clear()
