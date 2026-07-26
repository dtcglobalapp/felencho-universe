# Genesis Studio OS

## Purpose

Studio OS is the long-term operating architecture of the Genesis professional
Avatar Studio.

It coordinates editor modules, actor documents, commands, history, selection,
viewport state, preview runtime, validation, and export. It is not an operating
system kernel; the name describes the cohesive application layer that makes
Genesis authoring tools behave as one product.

## Current Status

The current Genesis Studio provides:

- Actor loading
- Actor schema normalization and structural validation
- Dynamic folder, group, and layer tree
- Single, additive, range, and Canvas-compatible selection
- Visibility and locking control
- Layer and folder drag-and-drop
- Direct move, scale, and rotate manipulation
- Multi-layer movement and safe group transforms
- Transform, hierarchy, asset, and blend-mode inspection
- Alpha-aware hit testing
- Zoom and pan
- Center, Reset View, grid, safe area, rulers, guides, and snapping
- Highlight and Solo preview modes
- Transaction-based Undo and Redo
- Local draft persistence
- Local PNG Asset Library
- Mouth-pose mapping
- Structural validation and construction completeness panels
- Actor reset
- `actor.json` export
- Portable actor-package export and re-import

The current composition root is `AvatarStudio`.

## Design Principles

Studio OS must be:

- Modular
- Data-driven
- Command-oriented
- History-aware
- Actor-independent
- Keyboard-accessible
- Deployable after every Sprint

It must not become a collection of panels that mutate shared objects without
clear ownership.

## Current Modules

### AvatarStudio

Composition root and current owner of shared editor state.

### Toolbar

Global commands including Undo, Redo, Highlight, Solo, Canvas display modes,
Center, Reset View, Reset Actor, imports, and both export formats.

### LayersPanel

Data-driven folder, group, and layer tree with selection, search, visibility,
locking, grouping, folder management, and drag-and-drop.

### Inspector

Property editor for selected layers or a transform group, with mixed-value
multi-selection behavior.

### Canvas

Extracted `StudioCanvas` for interactive actor preview, viewport, guides, hit
testing, hierarchy-aware selection geometry, direct manipulation, and asset
drop.

### History Engine

Bounded session Undo/Redo for actor-definition and selection snapshots with
transaction boundaries.

### Actor Loader

Validation and asset-loading boundary.

### Actor Renderer

Canvas rendering boundary shared with the runtime.

### ActorDocumentCommands

Central mutation API for every implemented persistent editor action.

### StudioSelection

Stable selected-node IDs and range anchor shared by Layers, Canvas, Inspector,
commands, and history.

### AssetLibrary and ActorAssetRepository

PNG browsing/import UI plus the isolated browser binary-storage boundary.
Actor structure never resides in IndexedDB.

### MouthBuilder

Explicit layer mappings for REST, AA, EE, OO, FV, L, MBP, SMILE, SAD, and
OPEN. It does not animate or interpolate poses.

### Actor Validation and Completeness

Separate structural-integrity and construction-progress views.

### ActorExporter

Standalone actor JSON and complete portable `.genesis.zip` packaging and
re-import.

## State Domains

Studio state must be separated by lifecycle.

### Actor Document State

Persistent, exportable values derived from `actor.json`.

Examples:

- Layers
- Asset manifest
- Organizational folders
- Logical transform groups and parent relationships
- Transforms
- Visibility
- Z-index
- Rig and animation data
- Construction profile and mouth mappings

### Selection State

Current layer, group, keyframe, rig element, or future editable entity.

Selection is not actor data.

### View State

Viewport zoom, pan, panel layout, grid display, Highlight, and Solo.

View state is not actor data.

### History State

Past and future document/selection snapshots plus an optional active
transaction. History is session-based in Genesis v0.6.

### Runtime Preview State

Transient animation, expression, physics, lip-sync, and playback values.

Runtime preview state must not enter actor history.

## Command Model

Every persistent editor action must pass through `ActorDocumentCommands`.

Examples:

- Create, duplicate, or delete layers
- Set layer visibility
- Set layer transform
- Reorder layers
- Assign or reorder folders
- Create or update transform groups
- Change relationships
- Map mouth poses
- Add, replace, or delete assets
- Set a supported blend mode
- Add keyframe
- Update expression mapping

A command must define:

- Target
- Input
- Validation
- Document change
- History grouping
- User-facing result

Components request commands. They do not independently recreate actor state.
The Timeline and expression examples above remain future command categories;
they are not implemented in Genesis v0.6.

## Selection Contract

The Inspector must always resolve its displayed data from the current actor
document and selected stable IDs.

If the selected entity no longer exists:

1. Clear or repair selection deterministically.
2. Do not display stale copied data.
3. Do not mutate the document merely to preserve selection.

Canvas and panel selection must refer to the same selection state.

Current selection supports:

- Single click replacement
- Command/Ctrl additive selection
- Shift range selection in the layer tree
- Canvas-compatible layer selection
- Shared-value and mixed-state Inspector presentation

## History Contract

Undo and Redo are product guarantees.

Persistent actions must:

- Record the state before mutation
- Group continuous interactions coherently
- Clear the redo branch after new edits
- Avoid recording transient previews
- Restore a valid document

Dragging should create one meaningful history action rather than one entry per
pointer event.

Undo and Redo restore selection where appropriate. History entries are bounded
and immutable; persistent history is intentionally outside Genesis v0.6.

## Persistence

The current Studio stores the normalized document draft in localStorage and
stores imported PNG blobs in IndexedDB only through `ActorAssetRepository`.
The actor document remains authoritative.

Two export paths exist:

- `actor.json` exports the document and logical asset references.
- `.genesis.zip` exports actor JSON and every declared binary asset.

Portable export fails if any required blob is unavailable. Import validates
safe archive paths and integrity, normalizes actor JSON, stores packaged blobs,
and hydrates the actor without requiring public-directory writes.

Future persistence may support:

- Named actor projects
- Autosave
- Cloud storage
- Revision history
- Collaboration
- Conflict resolution

Persistence backends must store or reconstruct the canonical actor document.
They must not create a second layer schema.

## Validation

Studio OS should expose validation at:

- Actor load
- Document mutation
- Asset assignment
- Export
- Runtime preview

Validation errors must identify the affected entity and remain actionable.

`ActorValidator` owns structural integrity. `ActorCompleteness` owns
profile-driven construction progress. Incomplete mouth or rig mappings can be
reported without declaring an otherwise sound document structurally invalid.

## Future Modules

Planned Studio modules include:

- Timeline
- Animation editor
- Expression library
- Physics editor
- Lip-sync editor
- Rig editor
- Scene and camera controls
- Advanced asset/provenance browser
- Production target exporters
- Runtime diagnostics
- Broadcast and hologram output controls

Each module must have a focused typed contract.

## Keyboard and Accessibility

Interactive controls must:

- Use semantic elements where possible
- Support keyboard activation
- Expose disabled states
- Preserve focus behavior
- Avoid pointer-only essential actions

Keyboard shortcuts must not trigger while the user is typing into an input
unless explicitly intended.

## UI Stability

Architectural refactors must preserve visual design unless a Sprint explicitly
requests redesign.

UI styling should eventually move toward a reusable design system, but that
work must be scoped and approved independently.

## Performance

Studio OS must remain responsive as actor complexity grows.

Performance work should monitor:

- Render-frame duration
- React update frequency
- Asset memory
- Hit-testing cost
- History memory
- Timeline evaluation
- Physics and animation preview cost

Editor diagnostics must distinguish UI work from runtime rendering work.

## Failure Behavior

The Studio must fail safely when:

- Actor JSON is invalid
- An image cannot load
- Selection becomes invalid
- Browser storage is unavailable
- A local or packaged asset blob is missing or corrupted
- A portable actor package is incomplete or unsafe
- A hierarchy reference is invalid
- Export cannot complete
- A preview subsystem fails

A failure in an optional future subsystem must not corrupt the actor document.

## Definition of Done for Studio Modules

A Studio module is ready when:

- It has a focused responsibility
- It consumes typed data
- It contains no hardcoded actor structure
- Persistent changes preserve Undo/Redo
- Preview state remains transient
- Existing UI behavior is preserved unless intentionally changed
- The production build succeeds
- Architecture documentation is current
