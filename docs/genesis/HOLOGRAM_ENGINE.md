# Genesis Hologram Engine

## Purpose

The Hologram Engine will adapt Genesis digital humans for holographic,
projection-based, spatial, transparent-display, and other specialized output
systems.

It is a future output and presentation architecture. No general Hologram
Engine is currently implemented.

## Scope

"Hologram" describes a family of target displays and production techniques.
Different targets may require:

- Transparent backgrounds
- Mirrored output
- Multi-view rendering
- Perspective correction
- Keystone correction
- Depth data
- Alpha or chroma-key output
- Multiple synchronized surfaces
- Low-latency remote transport

Genesis must not assume that every holographic target uses the same optical
technology.

## Design Principles

The Hologram Engine must:

- Reuse the shared actor definition
- Reuse the shared animation and runtime state
- Avoid hologram-specific actor forks
- Isolate device-specific behavior in adapters
- Support deterministic calibration
- Preserve real-time performance
- Remain independent of Studio UI

## Architectural Boundary

The Hologram Engine is an output adapter, not an actor engine.

```text
Actor Definition
      │
      ▼
Genesis Runtime
      │
      ▼
Evaluated Actor Pose
      │
      ▼
Render Backend
      │
      ▼
Hologram Output Adapter
      │
      ▼
Display / Projector / Stream
```

Actor behavior must remain identical when the output target changes.

## Target Profile

A future target profile may define:

- Target ID and name
- Output resolution
- Frame rate
- Orientation
- Mirroring
- Background mode
- Color-space requirements
- Alpha or key-color mode
- Camera and perspective values
- Calibration transform
- Transport settings

The final profile schema must be versioned before implementation.

## Calibration

Calibration must be explicit and reproducible.

Potential calibration controls include:

- Position
- Scale
- Rotation
- Crop
- Keystone
- Perspective
- Safe area
- Black level
- Brightness
- Color balance

Calibration belongs to the output target, not to the actor's layer
definitions.

## Rendering Modes

Potential modes include:

### Transparent Output

RGBA output for displays or compositors that support alpha.

### Chroma-Key Output

Solid configurable background for downstream keying.

### Mirrored Projection

Horizontally or vertically mirrored output for optical reflection systems.

### Multi-View Output

Multiple synchronized camera views for compatible spatial displays.

### Broadcast Composition

Actor output integrated with backgrounds, lower thirds, or scene systems.

## Synchronization

Multi-surface and remote targets require:

- Shared frame timing
- Stable session IDs
- Clock synchronization
- Bounded buffering
- Recovery after connection loss
- Versioned runtime messages

Transport concerns must not enter actor definitions.

## Studio Integration

Future Studio tools may include:

- Output target selection
- Calibration preview
- Background-mode controls
- Safe-area overlays
- Frame-rate and resolution diagnostics
- Multi-view preview
- Connection health

These controls configure an output profile. They must not rewrite actor layer
data.

## Performance Requirements

- Output conversion must have a measurable frame budget.
- Multiple views must not duplicate unrelated runtime evaluation.
- Transport queues must be bounded.
- Dropped-frame behavior must be explicit.
- Calibration transforms should use the render backend efficiently.
- Output diagnostics must not degrade production rendering.

## Safety and Reliability

Production output must:

- Recover safely after device loss
- Preserve a neutral or blank fallback frame
- Avoid displaying stale sessions
- Surface calibration and connection errors
- Separate operator controls from actor data

## Non-Goals

The Hologram Engine must not:

- Define character layers
- Replace the Actor Renderer
- Own AI conversation logic
- Assume a single display vendor
- Store device calibration in `actor.json`
- Claim optical holography where the target is projection or compositing
