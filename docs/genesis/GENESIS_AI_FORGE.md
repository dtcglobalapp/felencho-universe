# Felencho Studio AI Creation Architecture

## Product Definition

Felencho Studio is the public product for creating digital professionals,
digital actors, and intelligent characters.

Genesis AI Forge was the earlier public working name for the creation layer.
That name is now retired from product UI. Genesis Engine remains the internal
technology layer, while this document preserves the filename for stable
engineering references.

Felencho Studio is not an avatar generator or a layer editor. Its long-term
purpose is to coordinate multimodal source analysis, conversational knowledge
discovery, actor
construction, rigging, performance configuration, voice, personality,
emotion, validation, review, and runtime export through one governed creative
workflow.

The Phase 1 product foundation is implemented. Automatic quality analysis,
conversational knowledge extraction, asset separation, mask generation,
rigging, and actor generation are not yet implemented.

## Capability Status Vocabulary

| Status | Meaning |
| --- | --- |
| **Current** | Available in Felencho Studio, Advanced Mode, or the Genesis Engine runtime |
| **Planned** | Accepted product direction requiring implementation |
| **Experimental** | Requires prototypes, measured validation, and safety review |
| **Long-term research** | Strategic ambition without a committed production approach |

## Current Foundation

The following product foundations are current:

- Public Felencho Studio entry at `/felencho-studio`
- A conversational first prompt asking what the user wants to create
- Seven data-defined creation directions
- Working local photo selection
- Working local short-video recording
- Clear disclosure that Phase 1 media remains on the device
- Protected Advanced Mode at `/felencho-studio/advanced`
- Server-side temporary-session, role, expiry, and permission enforcement
- Owner, Developer, Artist, Tester, and Guest authorization contracts
- Compatibility with legacy database role values before migration
- A local database migration prepared but not applied remotely

The following Genesis Engine and Advanced Mode foundations also remain
current:

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

Felencho Studio does not currently upload source media, analyze source
quality, conduct the discovery interview, generate complete actors
automatically, or export production actor packages to external engines.

## Product Goals

Felencho Studio should eventually allow a creator to:

1. Describe what they want to create through conversation.
2. Supply an authorized photograph or short video.
3. Receive source-quality guidance.
4. Explain knowledge, audience, languages, boundaries, and personality
   naturally.
5. Review structured knowledge derived from that conversation.
6. Generate or assemble candidate actor assets.
7. Review uncertainty and generated content.
8. Approve identity-sensitive output.
9. Validate a complete actor package.
10. Export to supported runtimes and production targets.

Human review and creator control are mandatory throughout.

## Product Architecture

```text
Felencho Studio Conversation
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
Engine runtime contracts. Felencho Studio must not create a parallel actor
model.

The conversation is not a conventional setup wizard. Forms and professional
configuration panels remain hidden unless they are essential to consent,
rights, safety, or explicit Advanced Mode work.

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
creation architecture.

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

Felencho Studio must eventually provide review at the level of:

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

Felencho Studio must enforce:

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

Felencho Studio must not:

- Claim complete automation before it exists
- Present itself as Genesis Engine
- Require beginners to operate Advanced Mode
- Turn the conversational experience into a technical setup wizard
- Hide generated or reconstructed regions
- Replace creator approval
- Bypass identity rights
- Create character-specific engine forks
- Lock actors into a second internal runtime format
- Market experimental research as a production capability
