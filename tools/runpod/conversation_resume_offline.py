"""Offline context checkpoints for interrupted Felencho Mundial cohosts.

No AI API, voice, disk, GPU or network. Keeps only bounded in-memory metadata
for a Brain adapter to produce NEW speech after an interruption. Never replays
a previously generated utterance. "Delivered" is not proof of audible playback.
"""
from __future__ import annotations

from dataclasses import dataclass, replace

ACTORS = frozenset(("bob", "lina"))
MAX_SEGMENTS = 16
MAX_CONTEXT_CHARS = 1200


def _bounded(value: str, limit: int) -> str:
    if type(value) is not str or not value.strip() or len(value) > limit:
        raise ValueError("invalid_context_text")
    return value.strip()


@dataclass(frozen=True)
class Checkpoint:
    actor: str
    turn_id: str
    topic: str
    delivered_segments: tuple[str, ...] = ()
    interrupted: bool = False


@dataclass(frozen=True)
class Memory:
    active: Checkpoint | None = None
    previous: tuple[Checkpoint, ...] = ()
    presenter_question: str | None = None
    version: int = 0


def begin(memory: Memory, actor: str, turn_id: str, topic: str) -> Memory:
    if actor not in ACTORS or memory.active is not None:
        raise ValueError("invalid_or_busy_actor")
    turn = _bounded(turn_id, 64)
    if not all(c.isascii() and (c.isalnum() or c in "_-") for c in turn):
        raise ValueError("invalid_turn_id")
    checkpoint = Checkpoint(actor, turn, _bounded(topic, 240))
    return replace(memory, active=checkpoint, presenter_question=None,
                   version=memory.version + 1)


def delivered(memory: Memory, actor: str, turn_id: str, segment: str) -> Memory:
    """Record a text segment only after downstream delivery acknowledgement.

    This is NOT evidence that an individual heard it; real sinks must supply
    stronger playback acknowledgement when available.
    """
    active = memory.active
    if active is None or active.actor != actor or active.turn_id != turn_id or active.interrupted:
        raise ValueError("stale_delivery")
    text = _bounded(segment, 240)
    if len(active.delivered_segments) >= MAX_SEGMENTS:
        raise ValueError("checkpoint_full")
    if sum(map(len, active.delivered_segments)) + len(text) > MAX_CONTEXT_CHARS:
        raise ValueError("checkpoint_too_large")
    return replace(memory, active=replace(active, delivered_segments=active.delivered_segments + (text,)),
                   version=memory.version + 1)


def interrupt(memory: Memory, question: str) -> Memory:
    """Presenter interruption ends active speech and retains a bounded checkpoint."""
    text = _bounded(question, 320)
    prior = memory.previous
    if memory.active is not None:
        prior = (prior + (replace(memory.active, interrupted=True),))[-8:]
    return Memory(active=None, previous=prior, presenter_question=text, version=memory.version + 1)


def finish(memory: Memory, actor: str, turn_id: str) -> Memory:
    active = memory.active
    if active is None or active.actor != actor or active.turn_id != turn_id:
        raise ValueError("stale_finish")
    return Memory(active=None, previous=(memory.previous + (active,))[-8:],
                  presenter_question=None, version=memory.version + 1)


def resume_brief(memory: Memory, actor: str) -> dict:
    """Data for a future Brain adapter; deliberately no generated response or audio."""
    if actor not in ACTORS or memory.active is not None:
        raise ValueError("resume_not_allowed")
    relevant = next((item for item in reversed(memory.previous)
                     if item.actor == actor and item.interrupted), None)
    if relevant is None:
        raise ValueError("no_interrupted_context")
    return {
        "actor": actor,
        "original_turn_id": relevant.turn_id,
        "topic": relevant.topic,
        "delivered_text_not_verified_audible": list(relevant.delivered_segments),
        "presenter_latest_question": memory.presenter_question,
        "directive": (
            "Generate a NEW context-aware response to the presenter's latest request; "
            "do not automatically replay the previous text. If the interruption "
            "changed the subject, address that first. Delivery does not prove audibility."
        ),
        "automatic_replay": False,
    }


def clear(memory: Memory) -> Memory:
    """Forget all dialogue metadata on explicit studio reset."""
    return Memory(version=memory.version + 1)
