# Genesis Emotion Engine

## Purpose

The Emotion Engine will convert semantic emotional intent into expressive,
blendable actor performance.

It must allow AI systems, authored scenes, live operators, and animation clips
to drive the same normalized expression model.

## Current Status

The current runtime state includes normalized fields for:

- Smile
- Sadness
- Anger
- Surprise
- Eyebrow controls
- Jaw opening

A complete data-driven emotion-definition and blending system is not yet
implemented.

## Design Principles

The Emotion Engine must be:

- Actor-independent
- Data-driven
- Blendable
- Time-aware
- Provider-independent
- Compatible with authored and real-time input
- Safe when an actor lacks optional controls

Emotion names must not be translated directly into hardcoded layer IDs.

## Semantic Emotion Model

Genesis should distinguish:

### Emotion Intent

A semantic request such as happiness, sadness, anger, surprise, concern, or
neutral.

### Expression Definition

Actor data mapping semantic intent to rig or animation channels.

### Runtime Expression State

Transient evaluated weights after blending, timing, and actor mapping.

### Rendered Pose

The final transforms or deformations consumed by the renderer.

## Proposed Expression Definition

The final schema must be versioned before implementation. Conceptually:

```ts
interface ActorExpressionDefinition {
  id: string;
  name: string;
  channels: ExpressionChannel[];
  defaultAttackMs?: number;
  defaultReleaseMs?: number;
}
```

This example does not define the current actor schema.

## Normalized Channels

Potential normalized controls include:

- Smile
- Frown or sadness
- Anger
- Surprise
- Brow raise and lower
- Eye openness
- Squint
- Jaw openness
- Head attitude

Actors map supported channels to their own rigs. Unsupported channels are
ignored safely.

## Emotion Sources

Emotion may originate from:

- AI conversation intent
- Authored Timeline animation
- Live operator controls
- Script direction
- Motion capture
- Idle personality behavior

Every source must enter through a normalized command or channel contract.

## Blending and Priority

Multiple emotional inputs may be active simultaneously.

The system must define:

- Source priority
- Additive versus override behavior
- Weight normalization
- Attack time
- Hold time
- Release time
- Neutral recovery
- Channel masks

An AI emotion update must not unexpectedly erase authored performance or lip
sync.

## Temporal Behavior

Emotion changes should transition over time.

Abrupt changes are allowed only when explicitly requested. Default transitions
should use actor or expression data and remain frame-rate independent.

## Studio Integration

Future Studio tools may provide:

- Expression library
- Expression preview
- Channel inspector
- Blend preview
- Timeline expression clips
- AI emotion simulation
- Neutral-pose validation

Expression authoring must integrate with Undo/Redo and export.

## Runtime Integration

```text
AI / Timeline / Operator / Script
               │
               ▼
       Normalized Emotion Intent
               │
               ▼
       Emotion Blend Controller
               │
               ▼
        Actor Expression Mapping
               │
               ▼
      Runtime Expression Channels
               │
               ▼
         Animation Composition
               │
               ▼
             Renderer
```

## Interaction with Lip Sync

Emotion and lip sync share facial controls.

The blend system must preserve speech readability while allowing emotional
mouth shape. Lip sync should typically control phonetic articulation, while
emotion contributes broader mouth corners, cheeks, brows, eyes, and head
attitude.

## Interaction with Physics

Emotion may change the base pose that drives physics. Physics should receive
the composed pose after semantic expression evaluation unless a future
architecture explicitly defines a different order.

## Validation

Expression definitions must validate:

- Unique IDs
- Supported channel names
- Finite weights
- Valid actor targets
- Valid transition durations
- Deterministic neutral behavior

## Non-Goals

The Emotion Engine must not:

- Perform natural-language sentiment analysis internally
- Contain provider credentials
- Hardcode actor layers
- Render directly
- Own React state
