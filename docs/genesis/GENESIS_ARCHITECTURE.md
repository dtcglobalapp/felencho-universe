# Genesis Architecture

## Overview

Genesis is a modular Avatar Studio and runtime for data-driven, AI-powered
digital humans.

The editor must remain independent of any single character. Bob, Lina,
Felencho Virtual, and future actors are loaded through shared definitions and
rendered through the same engine.

Each module must have a focused responsibility and communicate through
explicit data and typed interfaces. The architecture must allow authoring
features and runtime features to evolve without creating character-specific
forks or turning the editor into a monolithic component.

## Architectural Principles

### Actor Data Is the Source of Truth

Actor configuration belongs in structured actor data. The editor reads and
mutates that data, the renderer interprets it, and the exporter packages it.
Shared UI must not hardcode the layer structure, rig, or capabilities of a
particular actor.

### Shared Engine, Variable Content

Character variation belongs in actor definitions, assets, rigs, and
configuration. Loading, editing, animation, rendering, history, and export
belong in the shared Genesis engine.

### Explicit Module Boundaries

Editor modules should communicate through typed props, shared contracts, or
deliberate state services. A module should not depend on another module's
internal implementation.

### Centralized State Ownership

Mutable editor state must have a clear owner. State can be presented and
modified through multiple modules, but there must be one authoritative value
for each concern.

### History-Compatible Mutations

Every user-editable operation must integrate with Undo/Redo. Editor mutations
must be representable as deterministic changes to the actor definition or
another explicitly managed history domain.

### Performance by Design

Rendering and interaction must remain responsive as actors gain more layers,
larger assets, animations, physics, expressions, and live AI input.
Performance characteristics must be considered when defining module contracts,
state update patterns, and asset pipelines.

## System Boundaries

Genesis has three primary architectural domains:

### Actor Data

Actor data describes identity, dimensions, display configuration, layers,
transforms, rig references, animations, and future capabilities. `actor.json`
is the current source of truth for actor configuration.

### Editor

The editor provides authoring tools for inspecting and changing actor data. It
coordinates selection, view state, history, direct manipulation, and export.

### Runtime

The runtime loads actor data and assets, updates dynamic actor state, and
renders the resulting character. Runtime behavior should consume the same
contracts produced and validated by the editor.

## Current Modules

### AvatarStudio

The main editor composition layer.

`AvatarStudio` currently coordinates actor state, selection, viewport state,
local draft persistence, history, canvas interaction, and communication
between editor modules.

Its long-term role is orchestration. Feature-specific UI and behavior should
move into focused modules so that `AvatarStudio` does not become a permanent
monolith.

Responsibilities:

- Own shared editor state
- Coordinate actor loading and draft restoration
- Connect commands to mutations
- Compose editor modules
- Preserve cross-module invariants

### Toolbar

The primary command surface for editor-wide actions.

The Toolbar exposes Undo, Redo, Highlight, Solo, Reset View, Reset Actor, and
Actor Export. It receives command availability, active modes, and behavior
through typed props.

The Toolbar does not own actor state. It presents commands whose implementation
belongs to the editor composition layer or dedicated services.

### LayersPanel

The visual representation of the actor's layer stack.

Current responsibilities include:

- Display actor layers in z-order
- Show selection state
- Select layers
- Toggle layer visibility
- Present layer identity and ordering information

Future responsibilities include drag-and-drop ordering, grouping, locking,
filtering, and context commands. The panel must remain completely data-driven.

### Inspector

The property editor for the selected layer or object.

Current responsibilities include:

- Edit position
- Edit rotation
- Edit scale
- Edit opacity
- Edit z-index
- Display layer identification
- Provide precision nudge controls

Future inspector sections may support pivots, rigging, constraints, physics,
expressions, animation properties, and asset assignments. Inspector controls
must be generated from the selected entity's capabilities rather than
character identity.

### Canvas

The interactive visual workspace.

Current responsibilities include:

- Render the actor preview
- Render the editor grid
- Manage viewport zoom
- Display selection geometry
- Perform alpha-aware hit testing
- Support direct layer movement
- Reflect Highlight and Solo modes

The Canvas must distinguish actor-space coordinates, stage-space coordinates,
and viewport transformations consistently. Future manipulation tools should
build upon a shared transform model.

### History Engine

The Undo/Redo system.

The current History Engine stores bounded actor-definition snapshots and
restores editor state without mutating stored history entries.

Long-term responsibilities include:

- Group related mutations into one user action
- Preserve deterministic Undo/Redo
- Support commands from every editor module
- Avoid recording preview-only state
- Scale to timeline, animation, expression, and rig edits

History is a core editor guarantee, not an optional enhancement.

### Actor Loader

The data and asset loading boundary.

Current responsibilities include:

- Fetch `actor.json`
- Validate actor definitions
- Validate layer transforms and animation configuration
- Verify unique layer identifiers
- Load visible image assets
- Produce the loaded actor representation

The Actor Loader protects the editor and runtime from malformed external data.
Future versions may support schema migration, asset manifests, lazy loading,
progress reporting, and recoverable validation diagnostics.

### Actor Renderer

The shared drawing system.

Current responsibilities include:

- Calculate stage fitting and actor placement
- Render visible layers in order
- Apply layer transforms and opacity
- Apply runtime eye movement
- Apply blink behavior
- Apply head and body runtime transforms

The renderer must remain independent of editor UI. It receives actor data,
loaded assets, stage metrics, and runtime state, then produces visual output.

## Current Module Flow

```text
public/actors/<ActorId>/actor.json
                │
                ▼
          Actor Loader
                │
                ▼
          AvatarStudio
          ├── Toolbar
          ├── LayersPanel
          ├── Inspector
          ├── History Engine
          └── Canvas
                │
                ▼
          Actor Renderer
                │
                ▼
          Canvas Output
```

Commands flow from editor modules into the state owner. Updated actor data
flows back into panels and the rendering pipeline. History surrounds
persistent mutations so that changes remain reversible.

## Future Modules

### Timeline

A time-based editing interface for animation tracks, keyframes, clips, events,
markers, selection ranges, and playback control.

The Timeline must operate on reusable animation data. It should not contain
rendering-specific or character-specific animation assumptions.

### Animation System

A reusable engine for interpolating actor properties over time and combining
authored animation with runtime behavior.

The system will need clear rules for:

- Tracks and channels
- Keyframe interpolation
- Playback state
- Layered animation
- Procedural motion
- Runtime overrides
- Animation blending

Editor authoring and runtime playback should share the same animation
contracts.

### Physics

A simulation layer for secondary motion such as hair, clothing, accessories,
and other rigged elements.

Physics configuration must be data-driven and bounded. Simulation state belongs
to the runtime, while physical parameters belong to actor data.

### Expressions

A data-driven system for defining, blending, previewing, and activating facial
and body expressions.

Expressions should map named emotional or performance states to reusable actor
property changes. The system must support manual authoring and AI-driven
activation without hardcoding a character's layer identifiers into UI logic.

### Lip Sync

A real-time and prerecorded speech-animation system driven by visemes,
phonemes, timing data, or audio analysis.

Lip Sync must define a stable contract between speech providers and actor
mouth rigs. Provider-specific events should be adapted into Genesis runtime
data before they reach the renderer.

### Asset Browser

A structured interface for importing, organizing, previewing, replacing, and
assigning actor assets.

The Asset Browser should manage references safely, detect missing assets, and
avoid coupling asset storage to a single editor view.

### Exporter

A production pipeline for validating and packaging actor definitions, assets,
rigs, animations, expressions, physics, and runtime metadata.

The Exporter is responsible for ensuring that a package is complete,
portable, versioned, and compatible with the target Genesis runtime.

## Data Evolution

Actor data will evolve as Genesis gains capabilities. Every format change
should consider:

- A format or schema version
- Backward compatibility
- Migration strategy
- Runtime validation
- Editor defaults
- Export compatibility

Silent interpretation differences between the editor and runtime are not
acceptable. Both must agree on the meaning of actor data.

## Integration Boundaries

External AI, voice, streaming, and session providers should connect through
adapters. Provider-specific payloads must not shape the core actor model.

Adapters translate external events into Genesis concepts such as speech,
visemes, gaze, expression, interruption, listening state, and performance
commands.

This protects the engine from vendor-specific changes and allows multiple
providers to drive the same actor runtime.

## Evolution Strategy

Future modules must extend the shared architecture rather than create parallel
character-specific systems.

Each module should be independently understandable, testable, and replaceable.
Integration must occur through stable data contracts so Genesis can grow
without turning `AvatarStudio` into a monolithic component.

Architectural extraction should occur incrementally. Each Sprint must leave
the project compiling and deployable while moving responsibility toward its
intended module.
