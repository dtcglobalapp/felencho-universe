"""Pure offline state model for two permanent AI cohosts.

No I/O, model calls, voice synthesis, streaming, networking or timers.
A session remains present while individual speaking turns start and end.
Not wired to Presence or LiveKit.
"""
from __future__ import annotations
from dataclasses import dataclass, replace
from typing import Literal

Mode = Literal["sleeping", "idle", "listening", "thinking", "speaking", "recovering"]
ACTORS = frozenset(("bob", "lina"))

@dataclass(frozen=True)
class Actor:
    mode: Mode = "sleeping"
    active_turn_id: str | None = None
    muted: bool = True

@dataclass(frozen=True)
class Session:
    connected: bool = False
    bob: Actor = Actor()
    lina: Actor = Actor()
    active_speaker: str | None = None
    presenter_priority: bool = True

def _actor(session: Session, name: str) -> Actor:
    if name not in ACTORS:
        raise ValueError("invalid_actor")
    return getattr(session, name)

def _set_actor(session: Session, name: str, value: Actor) -> Session:
    return replace(session, **{name: value})

def connect(session: Session) -> Session:
    if session.connected:
        return session
    return replace(session, connected=True, bob=Actor("idle"), lina=Actor("idle"))

def listen(session: Session, name: str) -> Session:
    actor = _actor(session, name)
    if not session.connected or actor.mode in ("sleeping", "speaking", "recovering"):
        raise ValueError("cannot_listen")
    return _set_actor(session, name, Actor("listening"))

def begin_turn(session: Session, name: str, turn_id: str, presenter_granted: bool) -> Session:
    actor = _actor(session, name)
    if not session.connected or actor.mode not in ("idle", "listening", "thinking"):
        raise ValueError("actor_unavailable")
    if session.active_speaker is not None or not presenter_granted:
        raise ValueError("turn_not_granted")
    if type(turn_id) is not str or not (1 <= len(turn_id) <= 64) or not all(
        char.isascii() and (char.isalnum() or char in "-_") for char in turn_id
    ):
        raise ValueError("invalid_turn_id")
    session = _set_actor(session, name, Actor("speaking", turn_id, muted=False))
    return replace(session, active_speaker=name)

def interrupt(session: Session) -> Session:
    # Presenter interrupt mutes output instantly in this pure state model.
    if session.active_speaker is None:
        return session
    name = session.active_speaker
    session = _set_actor(session, name, Actor("idle"))
    return replace(session, active_speaker=None)

def finish_turn(session: Session, name: str, turn_id: str) -> Session:
    actor = _actor(session, name)
    if session.active_speaker != name or actor.active_turn_id != turn_id or actor.mode != "speaking":
        raise ValueError("stale_or_invalid_turn")
    session = _set_actor(session, name, Actor("idle"))
    return replace(session, active_speaker=None)

def sleep_actor(session: Session, name: str) -> Session:
    if session.active_speaker == name:
        session = interrupt(session)
    return _set_actor(session, name, Actor("sleeping"))

def disconnect(session: Session) -> Session:
    return Session()
