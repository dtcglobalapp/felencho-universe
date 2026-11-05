"""Fail-closed audio output contract for the first isolated audible rehearsal.

Does not open any device, socket, audio engine or GPU. A real implementation
must implement stop_and_flush(), including revoking already queued samples,
and report whether it can meet bounded stop deadlines.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Protocol


class AudioOutput(Protocol):
    async def write(self, pcm: bytes) -> None: ...
    async def stop_and_flush(self) -> None: ...
    async def resume(self) -> None: ...


@dataclass
class BufferedMockOutput:
    """Bounded in-memory simulation, intentionally not a physical speaker."""
    pending: bytearray = field(default_factory=bytearray)
    stopped: bool = False
    flush_count: int = 0

    async def write(self, pcm: bytes) -> None:
        if type(pcm) is not bytes:
            raise TypeError("pcm_bytes_required")
        if self.stopped:
            raise RuntimeError("output_stopped")
        self.pending.extend(pcm)

    async def stop_and_flush(self) -> None:
        self.stopped = True
        self.pending.clear()
        self.flush_count += 1

    async def resume(self) -> None:
        if not self.stopped:
            raise RuntimeError("output_not_stopped")
        self.stopped = False


class CancellableOutputSink:
    """Bridge between the sandbox ChunkSink interface and AudioOutput.

    Mutations serialize through one lock. A real output that blocks forever in
    write() must be cancellable; callers must enforce a bounded timeout.
    stop_and_flush() does not imply real hardware buffer flush until measured.
    """

    def __init__(self, output: AudioOutput):
        self.output = output
        self._lock = asyncio.Lock()

    async def push(self, actor: str, payload: bytes) -> None:
        if actor not in ("bob", "lina"):
            raise ValueError("invalid_actor")
        async with self._lock:
            await self.output.write(payload)

    async def clear(self) -> None:
        async with self._lock:
            await self.output.stop_and_flush()

    async def resume(self) -> None:
        async with self._lock:
            await self.output.resume()
