"""Pure, reversible coordination of presence and speech-chunk authorization.

No I/O, GPU, TTS, streaming, timers, or hardware operations. The host must
cancel active audio at its physical output on interruption; this only revokes
future chunks. Instances are immutable and scoped to one studio session.
"""
from __future__ import annotations
from dataclasses import dataclass
import live_audio_gate_offline as audio
import live_cohost_state_offline as presence

@dataclass(frozen=True)
class Studio:
    presence: presence.Session = presence.Session()
    gate: audio.Gate = audio.Gate()

def _validate(studio: Studio) -> None:
    speaker = studio.presence.active_speaker
    if speaker != studio.gate.active_actor:
        raise ValueError("speaker_gate_desync")
    if speaker is not None and (
        getattr(studio.presence, speaker).active_turn_id != studio.gate.turn_id
        or studio.gate.presenter_override
    ):
        raise ValueError("turn_gate_desync")

def connect(studio: Studio) -> Studio:
    _validate(studio)
    return Studio(presence.connect(studio.presence), studio.gate)

def listen(studio: Studio, actor: str) -> Studio:
    _validate(studio)
    return Studio(presence.listen(studio.presence, actor), studio.gate)

def speak(studio: Studio, actor: str, turn_id: str, *, presenter_granted: bool) -> Studio:
    _validate(studio)
    # Both pure operations must succeed before returning a new state.
    next_gate = audio.start(studio.gate, actor, turn_id, granted=presenter_granted)
    next_presence = presence.begin_turn(studio.presence, actor, turn_id, presenter_granted)
    result = Studio(next_presence, next_gate)
    _validate(result)
    return result

def accept_audio(studio: Studio, actor: str, turn_id: str, generation: int) -> bool:
    _validate(studio)
    return studio.presence.connected and audio.allow_chunk(
        studio.gate, actor=actor, turn_id=turn_id, generation=generation
    )

def presenter_interrupt(studio: Studio) -> Studio:
    _validate(studio)
    result = Studio(presence.interrupt(studio.presence),
                    audio.presenter_interrupt(studio.gate))
    _validate(result)
    return result

def presenter_release(studio: Studio) -> Studio:
    _validate(studio)
    result = Studio(studio.presence, audio.presenter_release(studio.gate))
    _validate(result)
    return result

def finish(studio: Studio, actor: str, turn_id: str, generation: int) -> Studio:
    _validate(studio)
    next_gate = audio.complete(studio.gate, actor=actor, turn_id=turn_id, generation=generation)
    next_presence = presence.finish_turn(studio.presence, actor, turn_id)
    result = Studio(next_presence, next_gate)
    _validate(result)
    return result

def sleep(studio: Studio, actor: str) -> Studio:
    _validate(studio)
    next_presence = presence.sleep_actor(studio.presence, actor)
    # A sleeping active cohost must also invalidate any queued speech.
    next_gate = (audio.Gate(generation=studio.gate.generation + 1,
                            presenter_override=studio.gate.presenter_override)
                 if studio.gate.active_actor == actor else studio.gate)
    result = Studio(next_presence, next_gate)
    _validate(result)
    return result

def disconnect(studio: Studio) -> Studio:
    _validate(studio)
    # Preserve monotonic generation so an old buffered chunk cannot replay
    # after a reconnect with a reused turn_id.
    return Studio(presence.disconnect(studio.presence),
                  audio.Gate(generation=studio.gate.generation + 1))
