# Genesis AI-Assisted Actor Creation Pipeline

## Purpose

This document defines the proposed architecture for an AI-assisted pipeline
that may eventually transform source material into a reviewable Genesis actor
package.

The pipeline is a **planned capability**. It is not currently implemented.
Some individual techniques described here are **experimental concepts** or
**long-term research goals** and must not be represented as production-ready.

The pipeline assists human creators. It does not bypass artistic judgment,
identity rights, consent, or final human approval.

## Capability Status Vocabulary

This document uses four explicit status categories:

| Status | Meaning |
| --- | --- |
| **Current** | Implemented and available in the present Genesis codebase |
| **Planned** | Accepted product direction with future implementation work |
| **Experimental** | A concept requiring prototypes, evaluation, and safety review |
| **Long-term research** | A strategic goal without a committed implementation method or schedule |

## Current Foundation

Genesis currently provides the following foundations:

- A validated, data-driven `ActorDefinition`
- Layered actor assets loaded from `actor.json`
- A Canvas 2D actor renderer
- Dynamic layer selection and visibility
- Layer transform editing
- Undo and Redo
- Local draft persistence
- Actor-definition export

Genesis does **not** currently provide automatic actor generation, semantic
segmentation, body completion, generative anatomy reconstruction, automatic
rigging, expression generation, or phoneme generation.

See [ACTOR_SPEC.md](./ACTOR_SPEC.md) for the current actor contract and
[ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md) for mandatory
identity safeguards.

## Supported Source Types

The future pipeline should be designed to accept:

- A single photograph
- Multiple photographs
- Video
- Illustration
- Cartoon artwork
- Written description
- Existing layered artwork

Each source type provides different evidence and must use a different
analysis path. The system must never pretend that a single photograph provides
the same certainty as complete multi-angle reference material.

### Single Photograph

Useful for visible appearance and initial face analysis. Occluded anatomy,
depth, rear views, and off-frame body regions require reconstruction or
generation and therefore carry explicit uncertainty.

### Multiple Photographs

May improve consistency across angles, clothing, proportions, and hidden
regions. Images must be confirmed to depict the same authorized subject.

### Video

May provide multi-angle appearance, expression, motion, and timing evidence.
Frames must be sampled with provenance retained. Video must not be treated as
voice-cloning consent.

### Illustration or Cartoon

Requires style-aware segmentation and reconstruction. The pipeline must
preserve deliberate exaggeration, line work, asymmetry, texture, and artistic
intent rather than forcing realistic anatomy.

### Written Description

Produces a fictional or user-directed design rather than a detected identity.
Generated results must be labeled as synthetic, and identity-sensitive
similarity to real people must be reviewed.

### Existing Layered Artwork

Should preserve original layers and artist intent whenever possible. AI may
assist with classification, rig mapping, or gap analysis, but must not flatten
or silently replace authored work.

## Proposed Pipeline

Every stage must produce structured outputs, diagnostics, confidence values,
and provenance records for the next stage.

### 1. Input Analysis

**Status: Planned**

Analyze source type, dimensions, quality, orientation, frame coverage, likely
subject count, and suitability.

Outputs should include:

- Source inventory
- File hashes
- Capture or creation metadata when available
- Quality warnings
- Subject candidates
- Coverage map
- Consent and rights status
- Required follow-up inputs

Processing must stop when required authorization or provenance is missing.

### 2. Face and Body Detection

**Status: Planned**

Locate visible faces, body regions, hands, feet, clothing, accessories, and
other character elements.

Detection indicates likely regions; it does not establish identity, ethnicity,
age, gender, medical status, or ownership.

### 3. Semantic Segmentation

**Status: Experimental**

Separate visual regions into semantic categories suitable for actor
construction.

Potential categories include:

- Face and skin regions
- Eyes, pupils, eyelids, and brows
- Mouth, lips, teeth, and tongue
- Hair regions
- Facial hair
- Neck and torso
- Arms, hands, legs, and feet
- Clothing
- Jewelry and accessories
- Background and foreground occluders

Segmentation output must retain masks, confidence, and the source evidence used
for each region.

### 4. Layer Extraction

**Status: Experimental**

Convert segmented regions into non-destructive candidate layers.

The stage should:

- Preserve original pixels where possible
- Retain alpha masks
- Avoid destructive cropping
- Record layer provenance
- Produce stable candidate identifiers
- Detect overlapping or incomplete regions
- Preserve authored source layers

Candidate layers are not final `actor.json` layers until human review.

### 5. Missing-Region Reconstruction

**Status: Long-term research**

Reconstruct regions hidden by overlap, cropping, pose, or source limitations.

Potential areas include:

- Back of the head
- Hair hidden behind the subject
- Skin hidden behind hair or clothing
- Clothing hidden by arms or accessories
- Parts of the face hidden by pose
- Off-frame continuation of visible forms

Reconstruction must always be labeled as generated. It must never be presented
as observed evidence.

### 6. Body Completion

**Status: Long-term research**

Generate candidate anatomy or clothing beyond what appears in the source.

Potential reconstructed areas include:

- Neck
- Shoulders
- Torso
- Arms
- Hands
- Legs
- Feet
- Back of the head
- Hair hidden behind the subject
- Clothing outside the source frame

Body completion is highly uncertain when reference coverage is limited.
Generated anatomy must require explicit human approval before it becomes part
of a final actor.

For real people, the system must not infer intimate anatomy or create
sexualized content. Minor protection and identity-safety rules in
[ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md) are mandatory.

### 7. Rig Generation

**Status: Planned, dependent on validated layers**

Generate candidate semantic rig mappings and relationships.

Potential outputs include:

- Root control
- Face and head controls
- Eye and pupil controls
- Eyelid controls
- Brow controls
- Mouth and jaw controls
- Hair and accessory groups
- Body hierarchy
- Pivot candidates
- Constraint candidates

Rig generation must use semantic roles from the actor contract. It must not
embed character-specific IDs in shared engine code.

### 8. Expression Generation

**Status: Experimental**

Produce candidate expression definitions or expression reference assets.

Candidate expressions may include:

- Neutral
- Smile
- Sadness
- Anger
- Surprise
- Concern
- Blink and squint variants

Expressions must preserve identity and avoid changing facial structure in ways
the creator has not approved. See
[EMOTION_ENGINE.md](./EMOTION_ENGINE.md).

### 9. Phoneme Generation

**Status: Experimental**

Produce candidate mouth shapes or normalized viseme mappings for speech.

Outputs should remain provider-independent and conform to the future contracts
described in [LIPSYNC_ENGINE.md](./LIPSYNC_ENGINE.md).

The system must distinguish:

- Generated mouth artwork
- Generated rig mappings
- Generated timing cues
- Voice data

These are different assets with different consent requirements.

### 10. Physics Configuration

**Status: Experimental**

Suggest candidate secondary-motion groups and parameters for hair, clothing,
accessories, or other supported elements.

Suggested values must be bounded, editable, and disabled by default when
confidence is insufficient. See [PHYSICS_ENGINE.md](./PHYSICS_ENGINE.md).

### 11. ActorDefinition Generation

**Status: Planned**

Assemble approved assets and configuration into a candidate
`ActorDefinition`.

The generator must:

- Produce unique stable IDs
- Preserve source and generation provenance
- Reference validated assets
- Generate deterministic z-order
- Populate complete transforms
- Populate semantic rig references
- Declare format and actor versions
- Avoid unsupported fields

The candidate must pass the same runtime validation as a manually authored
actor.

### 12. Quality Validation

**Status: Planned**

Validate technical, visual, ethical, and compatibility requirements.

Quality checks should include:

- JSON schema and runtime validation
- Missing assets
- Duplicate identifiers
- Invalid transforms
- Layer seams and holes
- Expression consistency
- Rig completeness
- Unsupported visemes
- Physics stability
- Identity drift
- Unapproved reconstructed areas
- Missing consent or provenance

Validation must fail closed for identity and consent violations.

### 13. Human Review

**Status: Required product gate**

Human review is mandatory before import of AI-generated anatomy,
identity-sensitive features, voice mappings, or uncertain reconstructions.

The reviewer must be able to:

- Compare output with source evidence
- Inspect every generated region
- View confidence and provenance
- Approve or reject individual changes
- Correct detected traits
- Replace generated artwork
- Request regeneration
- Confirm identity and usage rights

A single global confirmation is insufficient when high-risk generated regions
remain unresolved.

### 14. Genesis Import

**Status: Planned**

Import only the approved, validated actor package into Genesis.

Import must:

- Preserve the approved manifest
- Record the tool and model versions used
- Retain audit and provenance data
- Produce a normal Genesis actor package
- Avoid introducing a second runtime format

After import, the actor must use the same Studio, runtime, renderer, history,
and export architecture as manually created actors.

## Confidence Model

Every detected, inferred, reconstructed, or generated element must have a
confidence classification.

| Level | Meaning | Required treatment |
| --- | --- | --- |
| **Observed** | Directly supported by clear source evidence | Human review remains available |
| **High confidence** | Strong multi-source or multi-frame support | Reviewer confirmation |
| **Medium confidence** | Plausible but incomplete evidence | Explicit review and correction |
| **Low confidence** | Limited or ambiguous evidence | Must not enter the final actor without explicit approval |
| **Generated** | No direct visual evidence; synthesized candidate | Mandatory explicit approval |
| **Unresolved** | System cannot produce a reliable candidate | Require new source material or manual creation |

Confidence is not truth. It communicates evidentiary strength and uncertainty.

## Anatomy and Reconstruction Approval

Before generated anatomy or identity-sensitive output becomes final, the
review interface must identify:

- What was visible in the source
- What was inferred
- What was reconstructed
- What was fully generated
- Which model or tool produced it
- Which human approved it
- When approval occurred

Approval must be granular, revocable before finalization, and recorded.

## Privacy, Consent, and Identity Protection

The pipeline must enforce:

- Informed consent for real-person replicas
- Separate consent for voice cloning
- Source-image provenance
- Biometric-data minimization
- Encryption and controlled retention
- Deletion rights
- Export rights
- Synthetic-content disclosure
- Impersonation prevention
- Minor protection
- Deceased-person and family-authorization review
- Audit records for generation and approval

Detailed requirements are defined in
[ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md).

## Provenance Manifest

Every generated actor should eventually include a protected provenance record
containing:

- Source asset identifiers and hashes
- Rights and consent references
- Transformation history
- Models and tool versions
- Generated regions
- Confidence values
- Human corrections
- Human approvals
- Export history

The provenance record must not expose private biometric data to unauthorized
consumers.

## Architectural Dependencies

The AI Pipeline depends on:

- A versioned Actor Specification
- Asset Browser and import services
- Digital Identity Safety controls
- Digital Human Wizard
- Multimodal Actor Builder
- Rig, expression, lip-sync, and physics schemas
- Actor validation and Exporter
- Audit and provenance storage

It should eventually feed [GENESIS_AI_FORGE.md](./GENESIS_AI_FORGE.md) and the
guided experience in
[DIGITAL_HUMAN_WIZARD.md](./DIGITAL_HUMAN_WIZARD.md).

## Non-Goals

The AI Pipeline must not:

- Claim that generated anatomy is observed truth
- Infer identity-related traits as fact without confirmation
- Replace human artistic approval
- Bypass consent or provenance
- Create deceptive replicas
- Introduce character-specific runtime code
- Produce a proprietary actor format separate from `ActorDefinition`
