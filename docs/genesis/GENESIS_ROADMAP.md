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

**Genesis v0.6**

Genesis v0.6 establishes the Professional Digital Actor Editor foundation.
The current editor provides schema-versioned actor documents, centralized
commands, transaction history, first-class multi-selection, hierarchy-aware
rendering and manipulation, folders and transform groups, local PNG assets,
portable actor packages, mouth-pose mapping, structural validation, and
profile-based construction completeness.

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

### Sprint 2 — Dynamic Layer System

Status: **Completed**

Delivered:

- Extract `LayersPanel` into a focused editor module
- Render arbitrary actor layers without character-specific UI
- Preserve selection and visibility controls
- Define stable layer command interfaces
- Preserve Undo/Redo for every persistent layer mutation
- Establish `ActorDefinition.layers` as the single layer-definition model
- Store loaded bitmap assets separately by layer ID
- Load initially hidden layer assets so visibility remains fully dynamic
- Make the Inspector and renderer consume the same authoritative layer data
- Preserve the existing visual design and editor behavior

Architectural result:

The LayersPanel, Inspector, Canvas, History Engine, and Actor Renderer now
share the layer definitions loaded from `actor.json`. React contains no
hardcoded actor-layer names, and compatible actors can use the same layer
workflow without code changes.

### Genesis v0.5 — Actor-Driven Foundation

Status: **Completed**

Delivered:

- Added focused ActorDefinition, ActorValidator, and ActorNormalizer domain
  modules
- Added backward-compatible migration from legacy `image` and
  `transform.opacity` fields
- Added centralized defaults for optional layer and display data
- Added stable deterministic ordering and duplicate-ID rejection
- Added safe actor-package asset resolution
- Added per-layer recoverable asset diagnostics
- Extracted the Inspector into a focused component
- Added type, lock, metadata, asset-status, pivot, and empty-state inspection
- Added lock-aware layer manipulation
- Added actor-scoped draft storage and stale-selection clearing
- Applied pivots consistently in rendering, hit testing, and selection
- Centralized the visible Genesis v0.5 identity
- Added focused normalization and validation tests

Architectural result:

Raw actor JSON now crosses one explicit normalization and validation boundary
before entering Studio or runtime state. The editor, renderer, Layers Panel,
Inspector, history system, and export path consume the same normalized
`ActorDefinition`. Individual missing assets degrade with visible warnings
instead of preventing the rest of the actor from loading.

Known limitations:

- Studio mutations remain local working state until actor JSON is exported
- The current renderer supports image layers only
- Lina and Felencho packages currently contain no visual layers
- Timeline, keyframes, general animation, physics, lip sync, emotions, and AI
  generation remain planned

### Genesis v0.6 — Professional Digital Actor Editor

Status: **Completed**

Delivered:

- Introduced actor schema version `1.0.0`, independently versioned from Studio
- Preserved Bob, Lina, and Felencho actor JSON through in-memory normalization
- Added typed assets, folders, transform groups, parent relationships,
  construction profiles, mouth mappings, and supported blend modes
- Added centralized commands for every implemented document mutation
- Added transaction-based Undo/Redo with document and selection restoration
- Added first-class single, additive, range, and Canvas-compatible selection
- Extracted StudioCanvas and unified Canvas/renderer hierarchy transforms
- Added pan, zoom, center, Reset View, grid, safe area, rulers, guides, and
  snapping
- Added layer and folder drag-and-drop, folder movement, and logical grouping
- Added multi-layer movement and safe direct layer/group transforms
- Added local PNG import, metadata, thumbnails, replacement, deletion, layer
  creation, and canvas drop
- Isolated browser binary persistence behind ActorAssetRepository
- Added standalone actor JSON and complete portable actor-package workflows
- Added explicit Mouth Builder mappings for all v0.6 pose keys
- Separated structural validation from profile-driven construction progress
- Expanded tests and long-term engineering documentation

Architectural result:

`AvatarStudio` is now an orchestrator over focused domain, UI, asset, export,
and history modules. ActorRenderer and StudioCanvas share hierarchy and
transform rules. Actor structure remains in `actor.json`; browser storage is a
recoverable binary cache, and portable export refuses incomplete archives.

Known limitations:

- Imported binary assets remain browser-local until portable export
- History remains session-based
- Portable package import supports the stored-ZIP format Genesis produces
- The renderer remains Canvas 2D and image-layer based
- Timeline, animation playback, physics, lip-sync playback, expressions, AI,
  speech, and networking are not implemented by this release

## Planned

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

## Future Product Phases

The phases below follow the initial Genesis Studio production release. They
describe product direction, not implemented capability or committed delivery
dates.

### Phase A — Identity Safety and Creation Contracts

Status: **Planned prerequisite**

Goals:

- Implement visible identity classification
- Define consent and rights records
- Define voice-cloning authorization
- Define provenance and audit contracts
- Define human-approval gates
- Version actor extensions for expressions, lip sync, physics, and body rigs
- Define secure deletion and export policies

This phase must precede realistic AI-assisted replica creation.

Related documents:

- [ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md)
- [ACTOR_SPEC.md](./ACTOR_SPEC.md)

### Phase B — Digital Human Wizard and Multimodal Intake

Status: **Planned**

Goals:

- Adaptive guided character creation
- Source and rights intake
- Character-category branching
- Multimodal source inventory
- Source coverage and quality diagnostics
- Creator-controlled traits
- Review of detected, selected, uncertain, and generated traits

This phase produces creation briefs and validated source manifests. It does
not promise automatic production-ready actors.

Related documents:

- [DIGITAL_HUMAN_WIZARD.md](./DIGITAL_HUMAN_WIZARD.md)
- [AI_PIPELINE.md](./AI_PIPELINE.md)

### Phase C — Genesis AI Forge Assisted Creation

Status: **Planned product layer with experimental subsystems**

Goals:

- AI-assisted segmentation and layer extraction
- Candidate rig generation
- Candidate expression and viseme generation
- Motion and physics suggestions
- Confidence and provenance review
- Human correction and approval
- Standard Genesis import

Body completion and identity-sensitive reconstruction remain gated and may
stay experimental until quality and safety requirements are met.

Related document:

- [GENESIS_AI_FORGE.md](./GENESIS_AI_FORGE.md)

### Phase D — Multiplatform Performer Export

Status: **Long-term research**

Goals:

- Unity connector
- Unreal connector
- AR output
- VR output
- Broadcast output
- Hologram output
- Portable intelligent-performer configuration

External targets must use versioned adapters and must not create
character-specific Genesis forks.

### Research Track — Sparse-Input Digital Humans

Status: **Long-term research**

Research topics:

- Full-body completion from limited evidence
- Missing-region reconstruction
- Generalized facial and body rigging
- Identity-preserving expression synthesis
- Cross-source visual consistency
- Automated quality and identity-drift detection

Research output must never be marketed as production-ready until it satisfies
technical, creative, and ethical release criteria.

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
