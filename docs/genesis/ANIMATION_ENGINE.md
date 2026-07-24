# Genesis Animation Engine

## Purpose

The Animation Engine will evaluate time-based actor behavior for both authored
performances and real-time digital-human operation.

It must provide one reusable system for every compatible actor.

## Current Status

Genesis currently implements a limited runtime motion system:

- Smoothed eye targeting
- Scheduled blinking
- Procedural idle breathing
- Procedural head drift
- Runtime head and body offsets

These behaviors are evaluated by the current actor runtime and consumed by the
renderer. A general keyframe timeline and animation-clip format are planned,
not yet implemented.

## Design Principles

The Animation Engine must be:

- Data-driven
- Deterministic for authored playback
- Frame-rate independent
- Compatible with Undo/Redo authoring
- Independent of React
- Independent of a specific render backend
- Capable of blending authored and procedural motion

Animation algorithms belong in the engine. Character-specific ranges,
mappings, and authored motion belong in actor data.

## Time Model

Animation time should use a monotonic timeline measured in milliseconds or
seconds with explicit conversion.

Evaluation must account for:

- Playback position
- Playback rate
- Paused state
- Loop range
- Clip duration
- Frame delta limits
- Seeking

Large frame deltas must be bounded where required to prevent unstable
procedural behavior.

## Proposed Data Model

The final schema must be versioned before implementation. Conceptually, the
engine requires:

```ts
interface AnimationClip {
  id: string;
  name: string;
  durationMs: number;
  loop: boolean;
  tracks: AnimationTrack[];
  events?: AnimationEvent[];
}

interface AnimationTrack {
  target: AnimationTarget;
  keyframes: AnimationKeyframe[];
}

interface AnimationKeyframe {
  timeMs: number;
  value: number;
  interpolation: InterpolationMode;
}
```

This model is illustrative, not yet the actor schema.

## Animation Targets

Targets must identify semantic or property-based actor values without
embedding React component paths.

Potential targets include:

- Layer transform channels
- Rig control channels
- Expression weights
- Physics inputs
- Runtime gaze
- Head and body controls
- Lip-sync weights
- Visibility and discrete events

Target resolution must be validated when a clip is loaded.

## Interpolation

The engine should support explicit interpolation modes:

- Step
- Linear
- Cubic or eased

Interpolation behavior must be deterministic and documented. Invalid
keyframe order or duplicate-time behavior must be resolved during validation.

## Playback

Playback state is transient runtime state.

The playback controller should support:

- Play
- Pause
- Stop
- Seek
- Loop
- Playback-rate changes
- Clip completion
- Event dispatch

Playback commands must not mutate the authored animation definition.

## Blending

Genesis must eventually combine:

- Base pose
- Authored clips
- Procedural idle motion
- AI-driven expressions
- Lip sync
- Physics
- User or motion-capture input

The engine must define precedence and blend rules instead of allowing each
system to overwrite shared values arbitrarily.

A future animation graph may assign layers, weights, masks, and priorities to
these sources.

## Events

Animation events may represent:

- Expression changes
- Dialogue cues
- Sound cues
- Scene signals
- Runtime commands

Events must have stable IDs and deterministic dispatch semantics. Seeking
across events must not accidentally trigger them unless the playback contract
explicitly requires it.

## Studio Integration

The Timeline will author animation data through typed commands.

Every authored operation must preserve:

- Undo/Redo
- Selection consistency
- Stable IDs
- Deterministic ordering
- Exportability

Preview playback must not create history entries.

## Runtime Integration

Animation evaluation should produce a normalized runtime pose or channel set.
The renderer consumes the evaluated result but does not advance time.

This separation allows the same animation engine to support:

- Canvas 2D
- GPU renderers
- Broadcast output
- Unity or Unreal connectors
- AR, VR, and hologram runtimes

## Performance Requirements

- Evaluation cost must scale predictably with active tracks.
- Inactive clips and tracks should not be evaluated.
- Keyframe lookup must avoid scanning an entire clip each frame.
- Runtime allocations should be minimized.
- Profiling must precede complex optimization.

## Implementation Milestones

1. Finalize versioned animation contracts.
2. Implement deterministic track evaluation.
3. Add playback state and seeking.
4. Integrate Timeline authoring.
5. Add clip blending.
6. Integrate expressions and lip sync.
7. Add performance benchmarks.

## Non-Goals

The Animation Engine must not:

- Contain actor-specific layer names
- Own React state
- Load image assets
- Render directly
- Encode provider-specific voice or AI payloads
