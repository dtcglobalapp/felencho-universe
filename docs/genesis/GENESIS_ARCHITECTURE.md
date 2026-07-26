# Genesis Architecture

## Overview

Genesis Engine is the internal modular actor-authoring and runtime foundation
for data-driven, AI-powered digital humans.

Felencho Studio is the public product. It owns the nontechnical,
conversation-first creation experience and progressively discloses
complexity. Customers should not need to understand the internal actor model
or professional editing concepts.

The existing editor is preserved as Felencho Studio **Advanced Mode**. It is a
protected professional surface, not the default product entry.

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

`ActorDefinition` is the single in-memory source of truth for actor structure,
including layers, asset references, folders, transform groups, relationships,
rig data, construction requirements, and mouth mappings. Loaded bitmap assets
are runtime resources stored separately from the document. The loader, editor,
Inspector, Canvas, History Engine, and renderer therefore cannot develop
independent copies of actor definitions.

As of Genesis v0.6, external actor JSON passes through a dedicated domain
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
`ActorValidator` verifies schema and structural integrity, unique node IDs,
assets, folders, hierarchy, transforms, blend modes, display configuration,
animation configuration, rig references, and mouth mappings.

`ActorCompleteness` is a separate construction-progress system. It evaluates
documented profile requirements without turning an incomplete actor into a
structurally invalid actor.

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

Genesis v0.6 routes document mutations through `ActorDocumentCommands`.
Panels and StudioCanvas request commands; they never mutate
`ActorDefinition` directly. Continuous move, scale, rotate, and reorder
gestures use history transactions so one gesture becomes one meaningful
history entry.

### Separate Organization, Hierarchy, and Selection

Organizational folders, logical transform groups, parent relationships, and
selection are separate domains:

- Folders organize the Layers panel and can affect effective visibility and
  locking, but do not contribute transforms.
- Groups are actor transform nodes and may parent layers or other groups.
- Parent references are validated independently of folder membership.
- `StudioSelection` stores selected stable IDs and a range anchor; it is editor
  state, not actor data.

`ActorHierarchy` owns relationship inspection and effective state.
`ActorTransformResolver` owns world-transform composition. ActorRenderer and
StudioCanvas share these systems.

### Asset Authority and Portability

`actor.json` remains authoritative. Its typed asset manifest distinguishes
bundled public assets, browser-local imports, packaged imports, and missing
resources.

`ActorAssetRepository` is the only IndexedDB boundary and stores binary blobs,
not actor structure. `ActorAssetResolver` joins document references with
runtime images and emits recoverable diagnostics. `ActorExporter` provides
both standalone JSON and complete portable package workflows; portable export
fails if a declared asset cannot be included.

### Performance by Design

Rendering and interaction must remain responsive as actors gain more layers,
larger assets, animations, physics, expressions, and live AI input.
Performance characteristics must be considered when defining module contracts,
state update patterns, and asset pipelines.

## System Boundaries

Felencho Studio and Genesis Engine have four primary architectural domains:

### Public Product Experience

Felencho Studio asks what the user wants to create, accepts authorized source
media, and will eventually coordinate source-quality analysis, conversational
knowledge discovery, review, and automated actor construction.

Phase 1 currently provides the public conversational entry, local photo
selection, local short-video recording, truthful capability disclosure, and
the protected transition to Advanced Mode. It does not upload or analyze
media.

The Phase 1 public route is `/felencho-studio`. The historical
`/avatar-engine` entry redirects there. The older `/studio` namespace already
hosts the protected Studio OS operations workspace, so moving all product
routes into the future `app/studio/` structure requires a separate,
non-destructive route migration. Phase 1 does not collapse or overwrite those
existing capabilities.

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

### Felencho Studio Conversation

**Status: Phase 1 entry and local capture current; adaptive interview planned**

Collects source, character category, design intent, knowledge, audience,
personality, purpose, voice, movement, rights, and approvals through a natural
assistant-led workflow.

The future interview produces a creation brief. It does not produce a second
actor definition format. See
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

### Felencho Studio AI Creation

**Status: Current Phase 1 product foundation; automation remains planned**

Coordinates the future conversation system, Multimodal Actor Builder, AI
Pipeline, safety gates, human review, validation, and export. The public
product foundation and protected Advanced Mode transition are current. It is
not currently an automatic actor generator.

See [GENESIS_AI_FORGE.md](./GENESIS_AI_FORGE.md).

## Current Modules

### Felencho Studio Public Experience

The primary customer-facing creation surface.

Current responsibilities:

- Present the Felencho Studio product identity
- Ask what the user wants to create
- Reveal the next action conversationally
- Accept a local photograph
- Record a local short video
- Keep Phase 1 media on the user's device
- State clearly which AI capabilities are not yet available
- Route authorized professionals to protected Advanced Mode

The public experience contains no layer, hierarchy, rigging, pivot,
transform, or blend-mode controls.

### Felencho Studio Access

The server-side authorization boundary for Advanced Mode and the existing
operations workspace.

Current responsibilities:

- Validate opaque temporary session cookies against Supabase
- Reject missing, inactive, expired, or malformed sessions
- Normalize current and legacy role values
- Grant Owner and Developer full access
- Require explicit area permissions for Artist access
- Deny Tester and Guest direct access to professional tools
- Preserve invitation-only access as a separate future area
- Fail closed when configuration or remote validation is unavailable

The local role-and-permission migration is authored but has not been applied
to the remote database. Runtime fallback keeps the current legacy role schema
compatible until a separately approved migration.

### AvatarStudio

The Advanced Mode editor composition layer.

`AvatarStudio` currently coordinates actor state, selection, viewport state,
local draft persistence, session history, asset hydration, import/export,
validation, and communication between editor modules.

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

The primary command surface for Advanced Mode editor-wide actions.

The Toolbar exposes Undo, Redo, Highlight, Solo, grid, safe area, rulers,
snapping, actor centering, Reset View, Reset Actor, PNG import,
portable-package import, actor JSON export, and portable-package export. It
receives command availability, active modes, and behavior through typed props.

The Toolbar does not own actor state. It presents commands whose implementation
belongs to the editor composition layer or dedicated services.

### LayersPanel

The visual representation of the actor's layer stack.

Current responsibilities include:

- Receive arbitrary actor layers through a typed data contract
- Display folders, logical groups, and actor layers
- Display actor layers in deterministic z-order
- Search and filter the tree
- Support single, additive, and range selection
- Toggle layer visibility
- Toggle locking
- Rename and delete folders
- Reorder layers and folders through drag and drop
- Move layers between folders
- Create transform groups from selected layers
- Present layer identity and ordering information

`LayersPanel` is an extracted editor component. It does not know the identity
or layer structure of the active actor. Names and rows are generated entirely
from `ActorDefinition.layers`, and all mutations return to the central editor
state through explicit commands.

The panel remains completely data-driven. It issues typed callbacks to the
composition layer and does not mutate the actor document.

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
- Edit folder, asset, blend mode, visibility, lock, and transform parent
- Provide precision nudge controls
- Prevent transform editing when a normalized layer is locked
- Present shared values and mixed states for multi-layer selection
- Inspect and edit logical transform groups

The Inspector is an extracted presentation component. Selection remains stable
IDs owned by `StudioSelection`, and selected layers or groups are derived from
the current actor definition.

Future inspector sections may support pivots, rigging, constraints, physics,
expressions, animation properties, and asset assignments. Inspector controls
must be generated from the selected entity's capabilities rather than
character identity.

### Canvas

The interactive visual workspace.

Current responsibilities include:

- Render the actor preview through ActorRenderer
- Render the editor grid
- Render safe area, rulers, and draggable guides
- Manage viewport pan and zoom
- Display hierarchy-aware selection geometry
- Perform alpha-aware hit testing
- Support direct layer movement, scale, and rotation
- Support multi-layer movement and safe group manipulation
- Support grid snapping and asset drop
- Reflect Highlight and Solo modes

`StudioCanvas` is extracted from `AvatarStudio`. It distinguishes actor-space,
stage-space, viewport, and device-pixel transforms and delegates document
changes through commands. It reuses ActorRenderer and
ActorTransformResolver instead of duplicating rendering or hierarchy rules.

### History Engine

The Undo/Redo system.

The current History Engine stores bounded actor-definition and selection
snapshots and restores editor state without mutating stored history entries.
It supports explicit begin, commit, and cancel transaction boundaries.

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
- Resolve bundled, local, and packaged asset paths
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
- Apply validated parent/group transform inheritance
- Apply effective folder/group/layer visibility
- Apply the typed Canvas 2D blend mode
- Apply runtime eye movement
- Apply blink behavior
- Apply head and body runtime transforms

The renderer must remain independent of editor UI. It receives actor data,
loaded assets, stage metrics, and runtime state, then produces visual output.

The renderer iterates the current `ActorDefinition.layers`, orders those
definitions by their data-defined z-index, and resolves each bitmap through
the loaded layer-image lookup. Consequently, the editor, Inspector, and
renderer all observe the same layer model.

### ActorDocumentCommands

The only mutation API for the active actor document.

Current commands cover layer creation, rename, stable-ID changes,
duplication, deletion, movement, transforms, relationships, visibility,
locking, ordering, folder assignment and lifecycle, group lifecycle, mouth
pose mappings, asset addition/replacement/deletion, and blend modes.

Commands return a new definition, reconciled selection IDs, and an explicit
changed flag. This makes history recording deterministic and keeps UI modules
presentation-focused.

### StudioSelection

Owns selected stable IDs and the selection anchor. It supports single click,
Command/Ctrl additive selection, Shift range selection, reconciliation after
document changes, and shared Canvas/Layer-tree selection.

### ActorHierarchy and ActorTransformResolver

`ActorHierarchy` prevents and diagnoses missing parents, self-parenting, and
cycles and resolves effective visibility and locking.
`ActorTransformResolver` composes world matrices with caching and a recursion
guard. Both StudioCanvas and ActorRenderer consume the same results.

### AssetLibrary and ActorAssetRepository

AssetLibrary displays PNG metadata and thumbnails, organizes asset references,
imports or replaces PNGs, deletes safe unused assets, creates layers, and
supports canvas drop. Browser binary persistence is accessed only through
ActorAssetRepository. Missing or denied storage degrades to diagnostics.

### MouthBuilder, ActorValidator, and ActorCompleteness

MouthBuilder maps the supported pose keys to arbitrary layer IDs.
ActorValidator reports structural errors and warnings.
ActorCompleteness reports profile-based construction progress. These concerns
remain separate so an actor can be valid but unfinished.

### ActorExporter

Exports normalized `actor.json` and a `.genesis.zip` archive containing
`actor.json` plus every declared binary asset. It also validates and imports
the safe stored-ZIP format produced by Genesis. Archive paths and CRC values
are checked before data enters normalization or browser storage.

## Current Module Flow

```text
actor.json + bundled/local/packaged PNG assets
                │
                ▼
 ActorNormalizer ── ActorValidator
                │
                ▼
       Normalized ActorDefinition
                │
       ┌────────┴─────────┐
       ▼                  ▼
ActorAssetResolver   ActorCompleteness
       │                  │
       └────────┬─────────┘
                ▼
          AvatarStudio
  ┌─────────────┼──────────────────┐
  ▼             ▼                  ▼
Toolbar   Layers/Assets       Inspector/
          StudioSelection     Mouth/Validation
                │
                ▼
 ActorDocumentCommands + StudioHistory
                │
                ▼
          StudioCanvas
       ┌────────┴────────┐
       ▼                 ▼
ActorRenderer   ActorHierarchy/
                ActorTransformResolver
                │
                ▼
          Canvas Output
```

Commands flow from editor modules into the state owner. Updated actor data
flows back into panels and the rendering pipeline. History surrounds
persistent mutations so that changes remain reversible.

The Studio's active selection is a `StudioSelectionState` containing stable
node IDs and an anchor. It never stores copied layer or group objects. Actor
changes reconcile stale IDs against the current definition.

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

### Asset Browser Evolution

Genesis v0.6 includes the local PNG AssetLibrary foundation. Future work may
add richer categorization, bulk operations, provenance, optimization, and
cloud-backed project assets.

The Asset Browser should manage references safely, detect missing assets, and
avoid coupling asset storage to a single editor view.

### Exporter Evolution

Genesis v0.6 includes actor JSON and portable actor-package export. Future
production work may add signatures, compression formats, target adapters,
provenance, and packaged animation/expression/physics data after those schemas
exist.

The Exporter is responsible for ensuring that a package is complete,
portable, versioned, and compatible with the target Genesis runtime.

## Future AI-Assisted Creation Flow

The proposed dependency flow is:

```text
Authorized Source Material
          │
          ▼
 Felencho Studio Conversation
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
manually authored actors must use the same Advanced Mode and Genesis Engine
runtime.

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

Genesis v0.6 extends the backward-compatible normalization boundary rather
than rewriting existing actor packages. Legacy `image` fields normalize to
`asset`, legacy `transform.opacity` values normalize to layer-level `opacity`,
and omitted schema, asset, folder, group, construction, relationship, blend,
display, or optional layer fields receive documented defaults. Exported
working definitions use the normalized contract and current actor schema
version, independently of the Genesis Engine release.

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
