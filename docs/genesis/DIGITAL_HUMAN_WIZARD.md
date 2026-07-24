# Genesis Digital Human Wizard

## Purpose

The Digital Human Wizard is a **planned guided creation experience** for
building a digital human, fictional character, mascot, creature, or
object-based performer.

It is not currently implemented.

The Wizard must adapt its questions to the chosen source, character category,
purpose, and risk profile. It must never force every character through a
realistic-human questionnaire.

## Relationship to Genesis

The Wizard is a product layer over:

- The future [AI Pipeline](./AI_PIPELINE.md)
- The future Multimodal Actor Builder
- The actor contract in [ACTOR_SPEC.md](./ACTOR_SPEC.md)
- The identity rules in
  [ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md)
- The future [Genesis AI Forge](./GENESIS_AI_FORGE.md)

The Wizard collects intent and approvals. It does not replace engine
validation or human creative control.

## Capability Status

| Area | Status |
| --- | --- |
| Current actor loading and manual layer editing | **Current** |
| Guided multi-step character intake | **Planned** |
| Adaptive question branching | **Planned** |
| AI-assisted trait detection and layer generation | **Experimental** |
| Full-body reconstruction from limited evidence | **Long-term research** |
| Automated production-ready performer creation | **Long-term research** |

## Experience Principles

The Wizard must be:

- Adaptive rather than one-size-fits-all
- Transparent about generated and uncertain output
- Respectful of identity and culture
- Accessible and reversible
- Explicit about consent
- Compatible with fictional and non-human characters
- Able to save progress
- Able to return to any earlier choice

No answer should silently become a permanent actor trait without review.

## Dynamic Question Model

The Wizard builds a question path from:

1. Source type
2. Character category
3. Whether the character represents a real person
4. Intended use
5. Desired realism
6. Available reference coverage
7. Voice requirements
8. Motion requirements
9. Legal and consent requirements

For example:

- A robot should not receive ethnicity questions.
- An animal should receive species and anatomy questions.
- A real-person replica requires identity and consent gates.
- A written fictional character requires design-intent questions rather than
  detected-trait confirmation.
- A child-friendly character requires age-appropriate design and safety
  review.

## Step 1: Source

The user selects one or more source types:

- Photograph
- Video
- Drawing
- Written description
- AI-generated character
- Existing actor package

The Wizard should collect:

- Ownership or license
- Subject authorization
- Source quality
- Number of views
- Whether audio is present
- Whether audio may be used
- Whether the source represents a real person
- Whether generated completion is allowed

An existing actor package should route first through compatibility and
validation checks rather than image generation.

## Step 2: Character Category

The user selects:

- Realistic human
- Stylized human
- Cartoon
- Anime
- Comic
- Child-friendly character
- Animal
- Mascot
- Robot
- Alien
- Fantasy creature
- Object character
- Abstract character

The selected category determines which later questions are relevant.

### Category-Specific Branches

Potential future branches include:

- Species, coat, feathers, tails, or wings for animals
- Materials, panels, lights, and articulation for robots
- Creature anatomy and non-human limbs for fantasy or alien characters
- Object type, face placement, and deformation style for object characters
- Shape language and motion rules for abstract characters

These branches are planned design requirements, not current features.

## Step 3: Physical Specifications for Realistic Humans

All identity-related questions must be optional unless technically required
for a user-requested output.

The Wizard may offer:

- Height in feet and inches or centimeters
- Desired weight
- Apparent age
- Body type
- Body proportions
- Skin tone
- Ethnicity or cultural appearance when voluntarily specified
- Eye color
- Hair color
- Hair style
- Facial hair
- Face shape
- Shoulder width
- Torso proportions
- Arm length
- Leg length
- Hand size
- Distinctive features
- Accessibility devices
- Clothing style
- Jewelry and accessories

### Measurement Rules

- Users must be able to select measurement units.
- Unknown values must remain unknown rather than receiving false precision.
- Desired design values must be distinguished from detected values.
- Weight must never be inferred from an image as fact.
- Apparent age must not be treated as verified legal age.

### Identity-Related Characteristics

Ethnicity, race, cultural appearance, sex, gender presentation, disability,
and other identity-related characteristics must be:

- Optional
- User-controlled
- Handled respectfully
- Never inferred as fact without confirmation
- Never used to create stereotypes

The Wizard must allow a user to decline, use a custom description, or correct
AI suggestions.

Accessibility devices must be treated as intentional character elements, not
automatically removed, hidden, or "corrected."

## Step 4: Cartoon and Stylized Specifications

For cartoon, anime, comic, mascot, and stylized categories, offer:

- Head-to-body ratio
- Eye size
- Limb exaggeration
- Face exaggeration
- Hand and foot proportions
- Squash and stretch
- Symmetry or intentional asymmetry
- Outline style
- Shading style
- Texture style
- Realism level
- Animation intensity

The Wizard should preserve intentional visual language. It must not normalize
stylized anatomy toward realism unless explicitly requested.

Potential category-specific additions include:

- Line-weight variation
- Limited color palettes
- Cel shading
- Painterly texture
- Graphic shadows
- Manga screentones
- Rubber-hose motion
- Limited-animation style

## Step 5: Personality

Personality configuration may include:

- Temperament
- Energy
- Humor
- Confidence
- Emotional range
- Movement style
- Preferred gestures
- Conversational style

Personality choices should produce editable configuration, not immutable
psychological claims.

The Wizard must distinguish:

- Creator-authored character traits
- AI-suggested traits
- Traits inferred from source performance
- Runtime behavioral configuration

For a real-person replica, personality must not be inferred as fact from
appearance.

## Step 6: Purpose

The user selects one or more intended purposes:

- Podcast host
- Musician
- Teacher
- Virtual assistant
- Child character
- Brand mascot
- Narrator
- Actor
- DJ
- Game character
- Holographic performer
- AR character
- VR guide
- Museum character
- Historical simulation
- Customer-service agent

Purpose affects future recommendations for:

- Expression range
- Motion intensity
- Voice configuration
- Runtime latency
- Output targets
- Disclosure requirements
- Content safety
- Accessibility

Purpose must not bypass identity or consent rules.

## Step 7: Voice

Voice configuration may include:

- Language
- Accent
- Age impression
- Tone
- Speed
- Energy
- Emotional range
- Cloned voice or synthetic voice

### Voice-Cloning Consent

Voice cloning requires consent separate from image or actor consent.

The Wizard must:

- Identify the voice owner
- Record authorization
- Define permitted uses
- Define retention and deletion
- Prevent unauthorized impersonation
- Distinguish cloned and synthetic voices
- Require disclosure where appropriate

Audio in a source video does not automatically authorize cloning.

See [ETHICAL_DIGITAL_IDENTITY.md](./ETHICAL_DIGITAL_IDENTITY.md).

## Step 8: Movement

The user may select:

- Calm
- Natural
- Expressive
- Theatrical
- Cartoon exaggerated
- Physically grounded
- Limited mobility
- Custom motion profile

Movement configuration should influence future animation and physics profiles.
It must not overwrite a user's accessibility choices or assume that limited
mobility is undesirable.

The Wizard should distinguish:

- Performance style
- Physical capability
- Accessibility accommodation
- Animation exaggeration
- Output-specific motion limits

## Step 9: Review

The final review must show:

- Detected traits
- User-selected traits
- AI-generated traits
- Uncertain traits
- Reconstructed areas
- Editable corrections
- Final approval

### Review Categories

Every trait should display one of:

- **Source-observed**
- **User-specified**
- **AI-suggested**
- **AI-reconstructed**
- **Uncertain**
- **Manually corrected**
- **Approved**
- **Rejected**

### Reconstruction Review

The reviewer must be able to inspect overlays identifying:

- Source pixels
- Extracted regions
- Reconstructed regions
- Fully generated regions
- Confidence level
- Model and tool provenance

Generated anatomy and identity-sensitive features require explicit approval.

### Final Approval

Final approval must confirm:

- Actor appearance
- Generated regions
- Identity classification
- Voice authorization
- Intended uses
- Disclosure requirements
- Export rights
- Source and asset rights

The Wizard must not imply that technical completion equals ethical approval.

## Identity Classification

Before actor creation, the user must classify the character as:

- Real person
- Authorized digital replica
- Fictional character
- Historical simulation
- AI-generated identity

The classification must remain attached to the project and export metadata.

## Wizard Output

The Wizard should eventually produce a structured creation brief containing:

- Source manifest
- Character category
- Design specifications
- Personality configuration
- Purpose profile
- Voice profile
- Movement profile
- Consent and rights records
- AI permissions
- Confidence and uncertainty records
- Human approvals

This brief becomes input to the AI Pipeline and Genesis AI Forge. It is not a
replacement for `actor.json`.

## Failure and Recovery

The Wizard must stop or request clarification when:

- Consent is missing
- Source ownership is unknown
- Identity classification is unresolved
- A minor-safety review is required
- Source quality is insufficient
- Reconstruction confidence is too low
- Requested use conflicts with authorization

Users should be able to save a draft without generating an actor.

## Accessibility

The guided experience should support:

- Keyboard navigation
- Screen readers
- Clear language
- Unit selection
- Optional questions
- Non-color-only confidence indicators
- Review at different zoom levels
- Editable text alternatives

## Non-Goals

The Digital Human Wizard must not:

- Infer identity traits as unquestioned fact
- Apply stereotypes
- Treat fictional and real people identically
- Hide AI reconstruction
- Replace technical validation
- Replace human approval
- Create a separate actor runtime format
