# Ethical Digital Identity Standard

## Purpose

This document establishes mandatory rules for creating, operating, exporting,
and deleting realistic digital humans within Genesis and Felencho.ai.

These safeguards apply to product design, engineering, AI workflows, storage,
runtime behavior, export, and human review.

They are not optional enhancements.

## Scope

This standard applies when an actor:

- Represents a living real person
- Reproduces a person's recognizable face or body
- Uses a cloned or recognizable voice
- Simulates a deceased person
- Represents a minor
- Reconstructs a historical identity
- Combines biometric traits into a synthetic identity
- Could reasonably be mistaken for a real person

Fictional and abstract characters still require provenance and disclosure but
may follow different consent requirements when they do not appropriate a real
identity.

## Capability Status

### Current

The current Genesis Studio provides actor editing and runtime foundations. It
does not provide a complete consent, provenance, audit, identity-classification,
or synthetic-content disclosure system.

### Planned

Identity classification, consent records, voice authorization, provenance,
human-approval gates, deletion controls, and export restrictions are planned
prerequisites for realistic AI-assisted creation.

### Experimental

Any prototype involving biometric analysis, identity matching, generated
anatomy, or identity-drift detection must remain isolated from production
publication and export until reviewed for security, privacy, accuracy, bias,
and consent.

### Long-Term Research

Privacy-preserving provenance, portable authorization manifests, reliable
synthetic-media disclosure, and cross-platform revocation are long-term
research goals. Documentation of these goals does not imply that Genesis can
currently enforce them outside systems under its control.

## Identity Classification

Every actor project must be visibly classified as one of:

### Real Person

Source material depicts a real person, but the actor is not yet approved as a
digital replica.

### Authorized Digital Replica

A recognizable digital representation created with documented authorization
from the person or authorized rights holder.

### Fictional Character

A creator-defined identity not intended to represent a real person.

### Historical Simulation

An educational, artistic, or documentary reconstruction of a historical or
deceased person, clearly disclosed as a simulation.

### AI-Generated Identity

A synthetic identity generated without the intention of representing a
specific real person.

Classification must be visible in the project review, audit record, and
appropriate exports. It must not be hidden in internal metadata only.

## Informed Consent

Consent must be:

- Informed
- Specific
- Verifiable
- Revocable where applicable
- Bound to defined uses
- Separate from unrelated terms
- Recorded with date and scope

Consent for photography, video, employment, performance, or platform access
does not automatically authorize a digital replica.

Authorization must identify:

- The person granting permission
- The identity or rights being used
- Permitted media and contexts
- Permitted duration
- Permitted territories where relevant
- Whether editing and generation are allowed
- Whether commercial use is allowed
- Whether transfer or sublicensing is allowed
- Revocation and deletion procedures

## Identity Ownership

Genesis must not treat a person's identity as an ordinary platform asset.

Project and export rights must distinguish:

- Rights in source photography or video
- Rights in artwork
- Rights in the person's likeness
- Rights in voice
- Rights in generated assets
- Rights in actor configuration
- Platform and provider licenses

Possession of an image file does not establish likeness rights.

## Voice-Cloning Consent

Voice cloning requires consent separate from visual-replica consent.

The record must define:

- Authorized voice owner
- Source recordings
- Permitted uses
- Languages and performance contexts where relevant
- Commercial permissions
- Retention
- Deletion
- Whether real-time use is allowed

Synthetic voices must be distinguished from cloned voices.

Audio present in a video or podcast does not automatically authorize voice
cloning.

## Deceased-Person Considerations

Digital representations of deceased people require:

- Applicable rights review
- Family, estate, or authorized representative involvement where appropriate
- Historical and cultural context
- Source provenance
- Clear simulation disclosure
- Restrictions on fabricated statements
- Sensitivity to grief, dignity, and reputation

Authorization requirements vary by jurisdiction and context. Product design
must support legal and ethical review rather than assuming public figures are
unrestricted.

## Minor Protection

Realistic digital replicas of minors require heightened protection.

Mandatory safeguards include:

- Verified parent or legal guardian authorization
- Age-appropriate purpose
- Strict usage boundaries
- Restricted sharing and export
- Minimal data retention
- Strong deletion controls
- No sexualized generation or presentation
- No adult-context repurposing
- No open-ended voice-cloning permission
- Review of every generated anatomy region

Apparent age estimated by AI must not substitute for verified age.

When age or authority is uncertain, processing must stop.

## Biometric Privacy

Face geometry, voiceprints, body measurements, motion signatures, and similar
identity data may be biometric information.

Systems must:

- Minimize collection
- Limit access
- Encrypt protected data
- Define retention periods
- Avoid unnecessary raw biometric storage
- Record processing purpose
- Support deletion
- Prevent reuse outside authorized scope
- Separate private biometric evidence from public actor packages

Model providers must not receive biometric data without appropriate
authorization and data-processing controls.

## Source-Image Provenance

Every real-person source must record:

- Source owner
- Subject
- License or authorization
- Capture or publication origin when known
- File hash
- Import date
- Permitted use
- Transformations
- Associated consent record

Unknown provenance must remain visible and block finalization when identity
rights cannot be established.

## AI Reconstruction

Generated or reconstructed regions must be labeled.

The system must distinguish:

- Source-observed pixels
- Extracted pixels
- Inferred regions
- Reconstructed regions
- Fully generated regions

Generated anatomy and identity-sensitive features require explicit human
approval. See [AI_PIPELINE.md](./AI_PIPELINE.md).

## Impersonation Prevention

Genesis and Felencho.ai must prohibit:

- Unauthorized real-person replicas
- Unauthorized voice clones
- Fraudulent identity use
- False endorsements
- Deceptive political or commercial impersonation
- Circumvention of identity verification
- Removal of required synthetic-content disclosure
- Export intended to conceal origin or authorization

High-risk requests should be blocked and recorded according to applicable
privacy and safety requirements.

## Synthetic-Content Disclosure

Disclosure must be appropriate to the medium and risk.

Potential disclosure mechanisms include:

- Visible project classification
- On-screen labels
- Watermarks
- Metadata
- Provenance manifests
- Spoken or written disclosure
- Platform publication labels

An authorized replica may still require disclosure. Authorization does not
make synthetic media non-synthetic.

## Audit Records

High-risk workflows must record:

- Source imports
- Consent verification
- Identity classification
- Models and tools used
- Generated regions
- Confidence levels
- Human corrections
- Approvals and rejections
- Voice-cloning authorization
- Exports
- Publication or runtime use when supported
- Revocation and deletion actions

Audit records must be protected from unauthorized modification and must not
expose unnecessary private data.

## Deletion Rights

Authorized users must have a documented process to request deletion of:

- Source assets
- Generated candidate assets
- Actor packages
- Voice data
- Biometric data
- Provider-side copies where contractually supported
- Published or exported copies under platform control

Deletion behavior, exceptions, backups, and legal retention must be explained
clearly.

Revocation cannot guarantee deletion of copies exported outside platform
control. The product must disclose that limitation before export.

## Export Rights

Export must require confirmation that the user has rights to export:

- Source-derived assets
- Likeness
- Voice
- Artwork
- Generated content
- Third-party fonts, music, clothing designs, or marks where relevant

Exports should include identity classification, provenance references, and
usage restrictions in a protected manifest where supported.

## Family Authorization

Family authorization may be appropriate for:

- Deceased-person simulations
- Community or family archives
- Cultural storytelling
- Sensitive historical reconstruction
- Projects involving a person unable to consent

Family authorization does not replace legal rights review or community
consultation where required.

## Cultural and Historical Representation

Historical or cultural simulations must:

- Cite documented sources
- Identify uncertainty
- Avoid presenting generated dialogue as authentic quotation
- Respect cultural restrictions
- Include community review where appropriate
- Avoid stereotypes
- Disclose simulation

## Restrictions on Deceptive Use

Digital humans must not be used to mislead people about:

- Whether they are interacting with a human
- Who is speaking
- Whether words were actually spoken by the represented person
- Whether an endorsement is authentic
- Whether a historical statement is documented
- Whether generated anatomy or imagery is source-observed

Runtime experiences should disclose synthetic identity when a reasonable user
could otherwise misunderstand.

## Human Approval Gates

Mandatory approval is required before:

- Finalizing generated anatomy
- Finalizing an authorized digital replica
- Activating a cloned voice
- Exporting identity-sensitive assets
- Publishing a historical simulation
- Using a minor's replica
- Changing permitted use

Approval must be explicit, attributable, and recorded.

## Security Requirements

Identity-sensitive systems should implement:

- Role-based access
- Least privilege
- Protected secrets
- Encrypted transport
- Secure storage
- Rate limits
- Export controls
- Audit integrity
- Incident response
- Revocation handling

## Product Status

The current Genesis Studio does not implement a complete identity-consent,
provenance, or audit system.

These controls are **planned architectural requirements** for future AI Forge,
Digital Human Wizard, Multimodal Actor Builder, and realistic-human creation
workflows.

No future realistic-replica workflow should be released without the required
safety controls.

## Cross-References

- [AI_PIPELINE.md](./AI_PIPELINE.md)
- [DIGITAL_HUMAN_WIZARD.md](./DIGITAL_HUMAN_WIZARD.md)
- [GENESIS_AI_FORGE.md](./GENESIS_AI_FORGE.md)
- [FELENCHO_AI_PLATFORM_VISION.md](./FELENCHO_AI_PLATFORM_VISION.md)
- [ACTOR_SPEC.md](./ACTOR_SPEC.md)

## Definition of Compliance

A digital-identity workflow is compliant only when:

- Identity classification is visible
- Required consent is verified
- Voice authorization is separate
- Provenance is recorded
- Generated regions are disclosed
- Human approvals are complete
- Intended use is authorized
- Deletion and export rules are clear
- Deceptive use is restricted
- The actor remains compatible with the shared Genesis architecture
