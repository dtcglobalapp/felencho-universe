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
- Dynamic layer list
- Layer selection
- Visibility control
- Direct layer movement
- Transform and z-index inspection
- Alpha-aware hit testing
- Zoom and pan
- Highlight and Solo preview modes
- Undo and Redo
- Local draft persistence
- Actor reset
- `actor.json` export

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

Global commands including Undo, Redo, Highlight, Solo, Reset View, Reset
Actor, and Export.

### LayersPanel

Data-driven layer list with selection and visibility controls.

### Inspector

Property editor for the selected layer.

### Canvas

Interactive actor preview, viewport, hit testing, selection geometry, and
direct manipulation.

### History Engine

Bounded Undo/Redo history for actor-definition mutations.

### Actor Loader

Validation and asset-loading boundary.

### Actor Renderer

Canvas rendering boundary shared with the runtime.

## State Domains

Studio state must be separated by lifecycle.

### Actor Document State

Persistent, exportable values derived from `actor.json`.

Examples:

- Layers
- Transforms
- Visibility
- Z-index
- Rig and animation data

### Selection State

Current layer, keyframe, rig element, or future editable entity.

Selection is not actor data.

### View State

Viewport zoom, pan, panel layout, grid display, Highlight, and Solo.

View state is not actor data.

### History State

Past and future document states or commands.

### Runtime Preview State

Transient animation, expression, physics, lip-sync, and playback values.

Runtime preview state must not enter actor history.

## Command Model

Every persistent editor action should be expressible as a command or a
well-defined document mutation.

Examples:

- Set layer visibility
- Set layer transform
- Change z-index
- Reorder layers
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

## Selection Contract

The Inspector must always resolve its displayed data from the current actor
document and selected stable ID.

If the selected entity no longer exists:

1. Clear or repair selection deterministically.
2. Do not display stale copied data.
3. Do not mutate the document merely to preserve selection.

Canvas and panel selection must refer to the same selection state.

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

## Persistence

The current Studio stores a local draft in browser storage and exports
`actor.json`.

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

## Future Modules

Planned Studio modules include:

- Timeline
- Animation editor
- Expression library
- Physics editor
- Lip-sync editor
- Asset Browser
- Rig editor
- Scene and camera controls
- Exporter
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
