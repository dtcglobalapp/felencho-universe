"""Offline speech-chunk gate for the Felencho Mundial cohosts.

Pure logic only: never emits audio, modifies files, accesses networking or GPU.
Protects the live audio adapter against stale fragments after presenter barge-in.
"""
from __future__ import annotations
from dataclasses import dataclass, replace

ACTORS = frozenset(("bob", "lina"))

@dataclass(frozen=True)
class Gate:
    active_actor: str | None = None
    turn_id: str | None = None
    generation: int = 0
    presenter_override: bool = False

def _turn(value: str) -> bool:
    return (type(value) is str and 1 <= len(value) <= 64 and
            all(c.isascii() and (c.isalnum() or c in "_-") for c in value))

def start(gate: Gate, actor: str, turn_id: str, *, granted: bool) -> Gate:
    if actor not in ACTORS or not _turn(turn_id):
        raise ValueError("invalid_actor_or_turn")
    if not granted or gate.presenter_override or gate.active_actor is not None:
        raise ValueError("turn_not_available")
    return Gate(active_actor=actor, turn_id=turn_id, generation=gate.generation + 1)

def allow_chunk(gate: Gate, *, actor: str, turn_id: str, generation: int) -> bool:
    """Return false for stale chunks or speech arriving during presenter override."""
    return (not gate.presenter_override
            and gate.active_actor == actor
            and gate.turn_id == turn_id
            and type(generation) is int
            and generation == gate.generation)

def presenter_interrupt(gate: Gate) -> Gate:
    """Revokes outstanding turn and increments generation to invalidate queued chunks."""
    return Gate(generation=gate.generation + 1, presenter_override=True)

def presenter_release(gate: Gate) -> Gate:
    return replace(gate, presenter_override=False)

def complete(gate: Gate, *, actor: str, turn_id: str, generation: int) -> Gate:
    if not allow_chunk(gate, actor=actor, turn_id=turn_id, generation=generation):
        raise ValueError("stale_completion")
    return Gate(generation=gate.generation + 1)
