# Genesis Physics Engine

## Purpose

The Physics Engine will produce secondary motion for actor elements such as
hair, clothing, facial accessories, armor details, and other rigged parts.

Physics is planned architecture. A general Genesis physics simulation is not
yet implemented.

## Design Principles

The Physics Engine must be:

- Optional per actor
- Data-driven
- Deterministic where practical
- Stable under variable frame rates
- Independent of React
- Independent of the render backend
- Bounded for real-time performance

No physics behavior may depend on hardcoded actor or layer names.

## Configuration Ownership

Persistent physics configuration belongs in `actor.json`.

Transient simulation state belongs in the runtime.

Configuration may eventually include:

- Physics groups
- Input controls
- Output targets
- Mass
- Stiffness
- Damping
- Gravity
- Drag
- Limits
- Collision references
- Reset behavior

The exact schema must be versioned before implementation.

## Semantic Inputs

Potential simulation inputs include:

- Head translation
- Head rotation
- Body translation
- Body rotation
- Actor acceleration
- Wind
- Motion-capture channels
- Timeline-authored forces

Inputs must use stable rig or control references.

## Outputs

Physics results may affect:

- Layer translation
- Layer rotation
- Layer scale
- Future mesh vertices
- Future deformers

Outputs must be blended with authored animation through a defined animation
composition system.

## Simulation Loop

A future simulation loop should:

1. Receive a bounded frame delta.
2. Read current input controls.
3. Integrate simulation state.
4. Apply constraints.
5. Resolve supported collisions.
6. Produce normalized output channels.
7. Preserve state for the next frame.

The renderer must not own or advance physics.

## Stability

Physics must remain stable when:

- The browser pauses and resumes
- A tab loses focus
- Frame rate drops
- Playback seeks
- The actor resets
- A physics group is enabled or disabled

Large deltas should be clamped or subdivided. Reset behavior must be explicit.

## Studio Integration

The Inspector may eventually edit physics parameters for selected rig
elements. A dedicated physics preview mode may expose:

- Input visualization
- Output visualization
- Constraints
- Limits
- Collision shapes
- Simulation reset

Persistent edits must integrate with Undo/Redo. Simulation preview frames must
not enter history.

## Runtime Integration

Physics consumes the base animated pose and produces secondary offsets.

The intended order is:

```text
Actor Definition
      │
      ▼
Base Pose / Animation
      │
      ▼
Physics Simulation
      │
      ▼
Final Runtime Pose
      │
      ▼
Renderer
```

The final blend order must be documented before implementation.

## Performance Requirements

- Actors must be able to omit physics entirely.
- Inactive groups must not consume per-frame work.
- Simulation cost must be measurable by group.
- Constraints must have bounded iteration counts.
- Expensive collision models require explicit budgets.
- Physics must not allocate unbounded objects per frame.

## Export Requirements

The Exporter must validate:

- Referenced controls and targets exist
- Numeric parameters are finite
- Limits are internally consistent
- Groups have stable IDs
- Required defaults are present

## Non-Goals

The Physics Engine is not:

- A general-purpose world simulation
- A replacement for authored animation
- A place for character-specific code
- A React effect
- A renderer feature
