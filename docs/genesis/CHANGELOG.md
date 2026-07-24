# Genesis Changelog

This changelog records significant Genesis Studio and engine changes.

The format follows a release-oriented structure with explicit distinction
between completed work and planned architecture.

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
