# Genesis Roadmap

## Purpose

This roadmap defines the planned progression of Genesis from its current
modular editor foundation to a production-ready Avatar Studio for AI-powered
digital humans.

The roadmap is directional. Sprint scope may be refined as the architecture
evolves, but the core requirements remain constant:

- One shared engine for every actor
- Data-driven authoring and runtime behavior
- Deployable output after every Sprint
- Preserved build stability and Undo/Redo
- Performance suitable for real-time digital humans

## Current Version

**Genesis v0.4**

Genesis v0.4 establishes the project foundation for modular editor
development. The current editor can load Bob from actor data, render layered
assets, select and transform layers, manage visibility, navigate the viewport,
persist a local draft, and preserve changes through Undo/Redo.

## Completed

### Sprint 1 — Toolbar Extraction

Status: **Completed**

Delivered:

- Extracted the header toolbar into a reusable `Toolbar` component
- Preserved Undo and Redo behavior
- Preserved Highlight and Solo behavior
- Preserved Reset View and Reset Actor behavior
- Preserved actor export behavior
- Preserved the existing visual design
- Established the first modular editor UI boundary

Architectural result:

`AvatarStudio` remains the command and state owner, while the Toolbar is now a
focused presentation module with an explicit typed interface.

## Planned

### Sprint 2 — Dynamic Layer System

Goal:

Build a fully data-driven layer interface sourced from actor definitions.

Expected outcomes:

- Extract `LayersPanel` into a focused editor module
- Render arbitrary actor layers without character-specific UI
- Preserve selection and visibility controls
- Define stable layer command interfaces
- Prepare the layer model for ordering, grouping, and locking
- Preserve Undo/Redo for every persistent layer mutation

Exit criteria:

- Bob and any compatible actor definition use the same layer UI
- No actor layer is hardcoded in React
- The project compiles and is deployable

### Sprint 3 — Layer Drag & Drop

Goal:

Add direct layer reordering with clear visual feedback.

Expected outcomes:

- Drag layers within the layer stack
- Translate visual order into deterministic z-index data
- Record one history action per completed drag
- Preserve selection and visibility state
- Handle invalid or interrupted drops safely

Exit criteria:

- Layer ordering is data-driven and reversible
- Actor rendering reflects the updated order
- The project compiles and is deployable

### Sprint 4 — Timeline

Goal:

Introduce the foundation for time-based authoring.

Expected outcomes:

- Timeline panel and playback controls
- Timeline scale, cursor, and range model
- Track and keyframe data contracts
- Selection synchronization between the Timeline, Canvas, and Inspector
- History support for timeline mutations

Exit criteria:

- Timeline state has a clear owner
- The timeline can represent actor property tracks without
  character-specific logic
- The project compiles and is deployable

### Sprint 5 — Animation

Goal:

Build the reusable animation authoring and playback system.

Expected outcomes:

- Keyframe creation and editing
- Interpolation rules
- Track evaluation
- Playback loop
- Preview integration with the Actor Renderer
- Shared contracts between editor playback and runtime playback

Exit criteria:

- Animation is stored as actor data
- Authored animation can be previewed deterministically
- The project compiles and is deployable

### Sprint 6 — Lip Sync

Goal:

Add speech-driven mouth animation for real-time and authored performances.

Expected outcomes:

- Viseme and timing contracts
- Actor mouth-rig mapping
- Provider adapter boundary
- Real-time preview
- Recorded performance support
- Interruption and playback synchronization rules

Exit criteria:

- Lip Sync is provider-independent at the engine boundary
- Compatible actors can define their mappings through data
- The project compiles and is deployable

### Sprint 7 — Performance

Goal:

Profile and optimize Genesis for complex actors and real-time operation.

Expected outcomes:

- Rendering benchmarks
- Asset-loading measurements
- Canvas and state-update profiling
- Cache strategy review
- Animation and physics budget definitions
- Reduced unnecessary rendering and allocations
- Stress testing with larger layer counts and assets

Exit criteria:

- Performance targets are documented and measured
- Known bottlenecks have owners or resolutions
- The project compiles and is deployable

### Sprint 8 — Production Release

Goal:

Prepare Genesis for reliable production use.

Expected outcomes:

- Actor package validation
- Production exporter
- Versioned actor format
- Error reporting and diagnostics
- Deployment documentation
- Compatibility verification
- End-to-end production workflow
- Final architecture and operations review

Exit criteria:

- Actors can be authored, validated, exported, and loaded through a documented
  production workflow
- The release is buildable, deployable, and operationally supportable
- Genesis documentation reflects the released system

## Roadmap Governance

Each Sprint should have explicit acceptance criteria before implementation
begins. Planned work must not be pulled opportunistically into an earlier
Sprint if it expands scope or weakens reviewability.

When discoveries require roadmap changes:

1. Document the architectural reason.
2. Update dependencies between Sprints.
3. Preserve a deployable intermediate state.
4. Avoid temporary character-specific workarounds.
5. Update this roadmap when the plan materially changes.

The roadmap serves the architecture. It must remain ambitious without
encouraging shortcuts that compromise the long-term platform.
