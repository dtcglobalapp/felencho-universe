# Genesis Changelog

This changelog records significant Genesis Studio and engine changes.

The format follows a release-oriented structure with explicit distinction
between completed work and planned architecture.

## Genesis v0.5 — Actor-Driven Foundation

Date: 2026-07-24

### Added

- Added separate ActorDefinition, ActorValidator, and ActorNormalizer domain
  modules
- Added safe defaults and backward-compatible actor normalization
- Added structured fatal errors and recoverable actor diagnostics
- Added non-fatal per-layer asset loading
- Added generic layer type, lock, opacity, metadata, animation metadata, and
  physics metadata contracts
- Added an extracted dynamic Inspector
- Added layer and Inspector empty states, asset status, lock state, semantic
  metadata, and warning indicators
- Added centralized Genesis v0.5 product configuration
- Added focused ActorDefinition normalization and validation tests

### Changed

- Migrated legacy `image` to canonical `asset` in normalized runtime data
- Migrated legacy `transform.opacity` to canonical layer-level `opacity`
- Made layer order deterministic by z-index and stable layer ID
- Made display defaults compatible with existing empty actor packages
- Made draft storage actor-scoped
- Made actor changes clear stale layer selection
- Made locked layers inspectable without allowing transform manipulation
- Applied layer pivots consistently in rendering, selection geometry, and hit
  testing
- Updated the browser title and Studio header to Genesis v0.5
- Removed the unused duplicate Actor Renderer implementation

### Compatibility

- Existing Bob actor JSON and assets remain unchanged
- Legacy layer fields continue loading through in-memory normalization
- Actors with no layers load into explicit empty Studio states
- Missing or undecodable layer assets produce warnings while valid layers
  continue loading
- Duplicate stable layer IDs and structurally unusable actor definitions remain
  fatal

### Preserved

- Undo and Redo
- Layer selection and visibility
- Direct layer movement
- Inspector transform editing
- Highlight and Solo
- Viewport zoom
- Reset View and Reset Actor
- Local draft behavior
- Actor JSON export
- Existing dark Studio design

### Not Implemented

Timeline, keyframes, animation playback, physics simulation, lip sync, emotion
evaluation, AI generation, body reconstruction, automatic rigging, external
engine export, AR, VR, and hologram output remain planned or research
capabilities.

## Genesis v0.4 — Dynamic Layer System

Date: 2026-07-24

### Added

- Extracted reusable Toolbar component
- Added data-driven LayersPanel component
- Added shared PanelTitle component
- Added the Genesis engineering documentation foundation
- Added the Genesis Engineering Operating Manual
- Added specifications for actors, rendering, animation, physics, lip sync,
  emotion, hologram output, and Studio OS
- Added future-vision documentation for the AI-assisted Actor Pipeline,
  Digital Human Wizard, Genesis AI Forge, and the broader Felencho.ai platform
- Added the Ethical Digital Identity Standard
- Added planned Multimodal Actor Builder and identity-safety dependencies to
  the Genesis architecture and roadmap

### Changed

- Established `ActorDefinition.layers` as the authoritative layer model
- Separated loaded bitmap resources from actor layer definitions
- Updated the Actor Loader to load all declared layer images
- Updated the Actor Renderer to resolve assets by layer ID
- Updated layer hit testing and preview rendering to use the shared model
- Made the Inspector and layer panel consume the same current actor definition
- Updated Genesis architecture and roadmap documentation
- Added capability-status language distinguishing current, planned,
  experimental, and long-term research systems

### Documentation Status

The AI Pipeline, Digital Human Wizard, Genesis AI Forge, Multimodal Actor
Builder, automated body completion, external-engine connectors, AR, VR, and
hologram product workflows are documented future systems. Their inclusion in
Genesis documentation does not mean they are implemented.

### Preserved

- Undo and Redo
- History behavior
- Layer selection
- Layer visibility controls
- Direct layer movement
- Inspector transforms
- Highlight and Solo
- Viewport behavior
- Reset behavior
- Actor export
- Existing Studio visual design

## Genesis v0.3 — History and Viewport

### Added

- Bounded Undo/Redo history
- Viewport zoom
- Cursor-centered wheel zoom
- Layer nudge controls
- Local draft persistence
- Selection geometry
- Highlight and Solo preview behavior

## Genesis v0.2 — Visual Layer Editing

### Added

- Interactive layer selection
- Layer transform editing
- Visibility editing
- Z-index editing
- Alpha-aware canvas hit testing
- Actor JSON export workflow

## Genesis v0.1 — Initial Studio

### Added

- Initial Genesis Avatar Studio route
- Bob actor loading
- Layered Canvas 2D rendering
- Initial actor definition contract
- Initial Inspector and Layers interface

## Changelog Rules

- Record implemented behavior only.
- Do not list planned systems as released features.
- Use the roadmap for future work.
- Note preserved behavior when a major internal refactor occurs.
- Keep actor-format changes explicit.
- Include migrations or compatibility requirements when introduced.
