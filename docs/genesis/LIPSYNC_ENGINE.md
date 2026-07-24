# Genesis Lip Sync Engine

## Purpose

The Lip Sync Engine will translate speech timing into data-driven mouth
performance for AI-powered digital humans.

It must support real-time speech, prerecorded performances, and multiple voice
providers without coupling actor rigs to any provider.

## Current Status

Genesis contains runtime state fields and rig roles related to mouth behavior,
but a complete provider-independent lip-sync engine is not yet implemented.

## Design Principles

Lip sync must be:

- Provider-independent
- Actor-independent
- Data-driven
- Time-synchronized
- Interruptible
- Compatible with live and recorded audio
- Blendable with expressions and animation

Provider payloads must be adapted into Genesis events before entering the
runtime.

## Core Concepts

### Phoneme

A linguistic speech sound.

### Viseme

A visual mouth shape associated with one or more phonemes.

### Cue

A time-bounded instruction assigning a viseme or mouth control value.

### Mouth Rig Mapping

Actor data that maps normalized Genesis visemes to actor-specific rig
controls.

## Proposed Runtime Contract

The final schema must be versioned before implementation. A normalized cue may
conceptually contain:

```ts
interface LipSyncCue {
  id: string;
  viseme: string;
  startMs: number;
  endMs: number;
  weight: number;
}
```

This example is architectural guidance, not the current actor schema.

## Provider Adapters

Each speech or avatar provider may use different events, timestamps, phonemes,
or viseme names.

An adapter must:

1. Receive provider-specific data.
2. Validate ordering and timing.
3. Convert names into normalized Genesis visemes.
4. Align cues with the audio clock.
5. Emit provider-independent lip-sync data.

Provider-specific identifiers must not appear in the renderer or actor
components.

## Actor Mapping

Each compatible actor defines how normalized visemes affect its mouth rig.

Mappings may eventually target:

- Upper and lower lips
- Jaw
- Teeth visibility
- Tongue
- Mouth-corner controls
- Future mesh deformers

Actors may implement different levels of fidelity. Missing optional controls
must degrade safely.

## Synchronization

Audio is the primary clock for speech performance.

The engine must account for:

- Audio start delay
- Network jitter
- Streaming cue arrival
- Playback pause
- Seeking
- Interruption
- Session termination

Wall-clock time alone is insufficient for reliable synchronization.

## Interruption

AI-powered characters must stop speaking predictably.

An interruption must:

- Stop or invalidate queued cues
- Release active mouth shapes
- Return to a neutral mouth state
- Avoid replaying stale cues
- Coordinate with audio interruption

Session and utterance identifiers should prevent late provider events from
affecting a newer utterance.

## Blending

Lip sync affects only the controls assigned to its mask.

The Animation and Emotion Engines may also affect the mouth. Genesis must
define blend rules so that:

- Speech remains intelligible
- Smiles and emotional shapes remain visible
- Authored animation can override or layer intentionally
- Neutral recovery is smooth

## Studio Integration

Future Studio capabilities may include:

- Importing audio
- Generating or importing cues
- Displaying cues on the Timeline
- Editing cue timing
- Previewing visemes
- Editing actor mappings
- Validating unsupported visemes

Persistent cue edits and mapping changes must preserve Undo/Redo.

## Runtime Integration

```text
Speech Provider / Audio File
            │
            ▼
      Provider Adapter
            │
            ▼
   Normalized Lip Sync Cues
            │
            ▼
     Actor Rig Mapping
            │
            ▼
    Runtime Mouth Channels
            │
            ▼
      Animation Blending
            │
            ▼
          Renderer
```

## Performance Requirements

- Cue lookup must be time-indexed.
- Stale cues must be discarded.
- Streaming queues must be bounded.
- Per-frame evaluation must avoid unnecessary allocation.
- Provider parsing must not occur in renderer code.

## Validation

The engine or exporter must validate:

- Cue times are finite and ordered
- Cue durations are non-negative
- Viseme names are supported or safely mapped
- Actor targets exist
- Weights are within supported ranges
- Referenced audio or utterance data is available

## Non-Goals

The Lip Sync Engine must not:

- Generate speech text
- Own provider authentication
- Render audio
- Hardcode a character's mouth layers
- Depend on React component structure
