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

`ActorDefinition.layers` is the single in-memory source of truth for layer
identity, names, asset references, visibility, z-order, and transforms. Loaded
bitmap assets are stored separately in a layer-ID lookup. The loader, editor,
Inspector, Canvas, History Engine, and renderer therefore cannot develop
independent copies of layer definitions.

As of Genesis v0.5, external actor JSON passes through a dedicated domain
boundary before it reaches the editor or renderer:

```text
Raw actor.json
      │
      ▼
ActorNormalizer
      │ legacy migration and defaults
      ▼
ActorValidator
      │ fatal errors and non-fatal warnings
      ▼
Normalized ActorDefinition
```

`ActorDefinition` defines the canonical runtime contract.
`ActorNormalizer` performs compatibility migration, default assignment, safe
path normalization, opacity normalization, and deterministic ordering.
`ActorValidator` verifies actor integrity, unique layer IDs, normalized
transforms, display configuration, animation configuration, and rig
references.

These responsibilities remain independent of React and browser presentation.

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

## Future Creation and Safety Domains

The following domains are accepted future architecture. They are **not
currently implemented**.

### Digital Identity Safety

**Status: Planned prerequisite**

Owns identity classification, consent, voice authorization, provenance,
human-approval gates, disclosure requirements, audit records, deletion
rights, and export restrictions.

Safety state must remain separate from public runtime state and must follow
[ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md).

### Digital Human Wizard

**Status: Planned**

Collects source, character category, design intent, personality, purpose,
voice, movement, rights, and approvals through an adaptive guided workflow.

The Wizard produces a creation brief. It does not produce a second actor
definition format. See
[DIGITAL_HUMAN_WIZARD.md](./DIGITAL_HUMAN_WIZARD.md).

### Multimodal Actor Builder

**Status: Planned orchestration concept**

Associates photographs, video, artwork, text, and existing actor assets with
one authorized project. It resolves source conflicts, records coverage and
provenance, and dispatches work to the AI Pipeline.

### AI Pipeline

**Status: Planned with experimental and long-term research stages**

Analyzes authorized sources and produces reviewable candidate layers, rigs,
expressions, visemes, physics configuration, and actor data.

AI outputs remain candidates until validation and human approval. See
[AI_PIPELINE.md](./AI_PIPELINE.md).

### Genesis AI Forge

**Status: Future product layer**

Coordinates the Wizard, Multimodal Actor Builder, AI Pipeline, safety gates,
human review, validation, and export. It is not currently an automatic actor
generator.

See [GENESIS_AI_FORGE.md](./GENESIS_AI_FORGE.md).

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

- Receive arbitrary actor layers through a typed data contract
- Display actor layers in z-order
- Show selection state
- Select layers
- Toggle layer visibility
- Present layer identity and ordering information

`LayersPanel` is an extracted editor component. It does not know the identity
or layer structure of the active actor. Names and rows are generated entirely
from `ActorDefinition.layers`, and all mutations return to the central editor
state through explicit commands.

Future responsibilities include drag-and-drop ordering, grouping, locking,
filtering, and context commands. The panel must remain completely data-driven.

### Inspector

The property editor for the selected layer or object.

Current responsibilities include:

- Display normalized layer name, stable ID, asset, type, visibility, and lock
  state
- Display asset availability and optional semantic metadata
- Edit position
- Edit rotation
- Edit scale
- Edit opacity
- Edit rotation pivots
- Edit z-index
- Provide precision nudge controls
- Prevent transform editing when a normalized layer is locked

The Inspector is an extracted presentation component. Selection remains a
stable layer ID owned by `AvatarStudio`, and the selected layer is derived from
the current actor definition.

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
- Normalize legacy and current actor definitions through the domain layer
- Assign safe defaults for omitted compatible fields
- Validate actor and layer integrity
- Reject duplicate layer identifiers
- Resolve local actor-package asset paths
- Load every supported declared layer image independently
- Separate fatal actor errors from recoverable layer warnings
- Produce the loaded actor representation

The Actor Loader protects the editor and runtime from malformed external data.
Future versions may support schema migration, asset manifests, lazy loading,
and progress reporting.

All layer images declared by `actor.json` are loaded, including images for
layers whose initial visibility is disabled. This allows visibility to change
at runtime without introducing a second layer definition or a
character-specific loading path.

A missing or undecodable layer asset no longer prevents the remaining actor
from loading. The affected layer stays in `ActorDefinition.layers`, the image
lookup omits its unavailable bitmap, and the loader returns an actionable
warning for the Studio. A structurally unusable actor, missing layers array,
or duplicate stable layer ID remains fatal.

### Actor Renderer

The shared drawing system.

Current responsibilities include:

- Calculate stage fitting and actor placement
- Render supported visible image layers in deterministic z-order
- Apply layer transforms and opacity
- Apply rotation pivots
- Apply runtime eye movement
- Apply blink behavior
- Apply head and body runtime transforms

The renderer must remain independent of editor UI. It receives actor data,
loaded assets, stage metrics, and runtime state, then produces visual output.

The renderer iterates the current `ActorDefinition.layers`, orders those
definitions by their data-defined z-index, and resolves each bitmap through
the loaded layer-image lookup. Consequently, the editor, Inspector, and
renderer all observe the same layer model.

## Current Module Flow

```text
public/actors/<ActorId>/actor.json
                │
                ▼
          Actor Loader
          ├── Actor Normalizer
          ├── Actor Validator
          ├── Validated ActorDefinition
          ├── Layer Images by ID
          └── Recoverable Diagnostics
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

The Studio's active selection is `selectedLayerId: string | null`. It never
stores a second layer object. Actor changes clear a stale selection when its
ID is absent from the newly loaded definition.

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

## Future AI-Assisted Creation Flow

The proposed dependency flow is:

```text
Authorized Source Material
          │
          ▼
 Digital Human Wizard
          │
          ▼
Multimodal Actor Builder
          │
          ▼
      AI Pipeline
          │
          ├── Candidate Assets
          ├── Candidate Rig and Performance Data
          └── Confidence and Provenance
          │
          ▼
 Digital Identity Safety
          │
          ▼
 Human Review and Approval
          │
          ▼
 Actor Validation and Export
          │
          ▼
 Standard Genesis Actor Package
```

This flow must converge on the existing actor contract. AI-assisted actors and
manually authored actors must use the same Studio and runtime.

### Architectural Dependencies

The future AI creation layer depends on:

- Versioned actor schemas
- Asset import and provenance
- Rig, expression, lip-sync, and physics contracts
- Identity classification and consent
- Granular human approval
- Actor validation
- Export packaging
- Secure audit storage

Full-body reconstruction, generalized rigging, external-engine export, and
holographic output remain long-term research goals.

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

Genesis v0.5 introduces a backward-compatible normalization boundary rather
than rewriting existing actor packages. Legacy `image` fields normalize to
`asset`, legacy `transform.opacity` values normalize to layer-level `opacity`,
and omitted compatible display or optional layer fields receive documented
defaults. Exported working definitions use the normalized contract.

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
