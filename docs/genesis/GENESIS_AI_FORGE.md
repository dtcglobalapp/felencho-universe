# Genesis AI Forge

## Product Definition

Genesis AI Forge is a **future product layer** inside Felencho.ai for creating
complete digital performers and intelligent characters.

It is not only an avatar generator.

Its long-term purpose is to coordinate multimodal source analysis, actor
construction, rigging, performance configuration, voice, personality,
emotion, validation, review, and runtime export through one governed creative
workflow.

Genesis AI Forge is not currently implemented as a product.

## Capability Status Vocabulary

| Status | Meaning |
| --- | --- |
| **Current** | Available in the present Genesis Studio or runtime |
| **Planned** | Accepted product direction requiring implementation |
| **Experimental** | Requires prototypes, measured validation, and safety review |
| **Long-term research** | Strategic ambition without a committed production approach |

## Current Foundation

The following foundations are current:

- Data-driven actor loading from `actor.json`
- Actor-definition validation
- Layered image loading and rendering
- Dynamic layer panel
- Layer selection and visibility
- Transform and z-index editing
- Undo and Redo
- Local draft persistence
- Actor-definition export
- Limited gaze, blink, head, and idle runtime motion

Genesis does not currently generate complete actors automatically or export
production actor packages to external engines.

## Product Goals

Genesis AI Forge should eventually allow a creator to:

1. Define a character and intended use.
2. Supply authorized source material.
3. Analyze and organize multimodal evidence.
4. Generate or assemble candidate actor assets.
5. Configure performance systems.
6. Review uncertainty and generated content.
7. Approve identity-sensitive output.
8. Validate a complete actor package.
9. Export to supported runtimes and production targets.

Human review and creator control are mandatory throughout.

## Product Architecture

```text
Digital Human Wizard
        │
        ▼
Multimodal Actor Builder
        │
        ▼
AI-Assisted Actor Pipeline
        │
        ├── Layer and Asset Creation
        ├── Rig and Expression Candidates
        ├── Voice and Motion Configuration
        └── Confidence and Provenance
        │
        ▼
Digital Identity Safety Gate
        │
        ▼
Human Review and Approval
        │
        ▼
Genesis Actor Package
        │
        ├── Genesis Runtime
        ├── External Engine Connectors
        └── Production Output Adapters
```

Every imported actor must converge on the same `ActorDefinition` and Genesis
runtime contracts. AI Forge must not create a parallel actor model.

## Capability Map

### Automatic Actor Generation

**Status: Planned product direction; full automation is long-term research**

Coordinate candidate actor creation from supported sources. "Automatic" must
never mean unreviewed for real-person identity, anatomy, voice, or provenance.

### Layer Creation

**Status: Experimental**

Use segmentation, extraction, reconstruction, and authored assets to produce
candidate layers. Preserve original artwork and record generated regions.

### Body Completion

**Status: Long-term research**

Generate candidate body regions that are missing from source material.
Generated anatomy must be visibly identified and explicitly approved.

### Facial Rigging

**Status: Planned, with experimental generation**

Create candidate semantic mappings for face, eyes, eyelids, brows, mouth, and
jaw using actor rig roles.

### Body Rigging

**Status: Long-term research**

Create hierarchical body controls and constraints suitable for future
full-body animation. The current actor contract does not provide a complete
body-rig system.

### Expression Generation

**Status: Experimental**

Generate candidate expressions and mappings for review. See
[EMOTION_ENGINE.md](./EMOTION_ENGINE.md).

### Phoneme Generation

**Status: Experimental**

Create candidate visual speech shapes or normalized viseme mappings. See
[LIPSYNC_ENGINE.md](./LIPSYNC_ENGINE.md).

### Motion Profile Generation

**Status: Planned concept**

Translate creator-selected movement style into bounded configuration for
animation, gesture, and physics systems. Generated profiles remain editable.

### Voice Integration

**Status: Planned**

Associate authorized synthetic or cloned voices through provider adapters.
Voice cloning requires separate consent and usage authorization.

### Personality Configuration

**Status: Planned**

Create explicit, user-controlled behavioral configuration for conversation,
energy, humor, gesture, and performance. Personality must not be inferred as
fact from a person's appearance.

### Emotion Configuration

**Status: Planned**

Map semantic emotion intent to actor-supported expression channels with
editable blend behavior.

### Live Runtime Configuration

**Status: Planned**

Configure speech, listening, interruption, gaze, expression, performance, and
session behavior for the shared Genesis runtime.

### Export to Genesis Runtime

**Status: Planned**

Package validated actor assets and definition data for the production Genesis
runtime. Current Studio export is limited to the actor definition and is not a
complete Forge package exporter.

### Export to Unity

**Status: Long-term research**

Requires a versioned connector, asset conversion, animation mapping, runtime
compatibility contract, and validation.

### Export to Unreal

**Status: Long-term research**

Requires an independent versioned connector rather than reusing Unity-specific
assumptions.

### AR Output

**Status: Long-term research**

Requires device tracking, spatial placement, performance budgets, and
platform adapters.

### VR Output

**Status: Long-term research**

Requires spatial interaction, avatar scale, camera, motion, and latency
contracts.

### Broadcast Output

**Status: Planned long-term product capability**

Requires production rendering, alpha or chroma output, scene integration,
monitoring, and operational controls.

### Hologram Output

**Status: Long-term research**

Requires output-target adapters and calibration described in
[HOLOGRAM_ENGINE.md](./HOLOGRAM_ENGINE.md).

## Multimodal Actor Builder

The Multimodal Actor Builder is a planned orchestration subsystem within AI
Forge.

It should:

- Accept heterogeneous source material
- Associate sources with one authorized subject or fictional design
- Resolve conflicts between sources
- Preserve source provenance
- Build a coverage map
- Request missing evidence
- Route tasks to the AI Pipeline
- Present candidates for human review

It is not a single generative model and should not hide which tools produced
which outputs.

## Human Review

AI Forge must provide review at the level of:

- Source
- Trait
- Layer
- Reconstructed region
- Rig mapping
- Expression
- Viseme
- Motion profile
- Voice
- Export target

High-risk items must not be approved through passive continuation or a
preselected checkbox.

## Identity Safety

Every real-person workflow must integrate
[ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md).

AI Forge must enforce:

- Identity classification
- Consent verification
- Voice authorization
- Minor safeguards
- Deceased-person review
- Provenance
- Synthetic-content disclosure
- Deletion and export rights
- Impersonation prevention
- Audit records

Safety requirements are architecture, not optional policy text.

## Creator Ownership

Creators must retain:

- Control over source use
- Visibility into generation
- Ability to reject output
- Ability to correct output
- Attribution
- Export rights subject to source licenses
- Deletion rights
- Control over publication and runtime use

The product must clearly distinguish platform rights, model-provider rights,
source rights, and creator rights.

## Quality Gates

A Forge actor must not be finalized until it passes:

- Actor-schema validation
- Asset completeness
- Rig-reference validation
- Visual artifact review
- Identity-consistency review
- Consent and provenance review
- Runtime compatibility
- Export-target validation
- Human approval

## Cross-References

- [AI_PIPELINE.md](./AI_PIPELINE.md)
- [DIGITAL_HUMAN_WIZARD.md](./DIGITAL_HUMAN_WIZARD.md)
- [ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md)
- [ACTOR_SPEC.md](./ACTOR_SPEC.md)
- [ANIMATION_ENGINE.md](./ANIMATION_ENGINE.md)
- [PHYSICS_ENGINE.md](./PHYSICS_ENGINE.md)
- [LIPSYNC_ENGINE.md](./LIPSYNC_ENGINE.md)
- [EMOTION_ENGINE.md](./EMOTION_ENGINE.md)
- [HOLOGRAM_ENGINE.md](./HOLOGRAM_ENGINE.md)

## Non-Goals

Genesis AI Forge must not:

- Claim complete automation before it exists
- Hide generated or reconstructed regions
- Replace creator approval
- Bypass identity rights
- Create character-specific engine forks
- Lock actors into a second internal runtime format
- Market experimental research as a production capability
