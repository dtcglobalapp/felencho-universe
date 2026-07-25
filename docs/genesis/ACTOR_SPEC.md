# Genesis Actor Specification

## Purpose

This document defines the canonical actor package consumed by the Genesis
editor and runtime. It describes the current contract and the rules that
future actor capabilities must follow.

`actor.json` is the only source of truth for an actor definition.

## Design Goals

An actor package must be:

- Data-driven
- Portable
- Versioned
- Validatable
- Independent of React and editor UI
- Compatible with the shared Genesis runtime
- Extensible without character-specific engine branches

Bob, Lina, Felencho Virtual, Ramoncito, Fresita, and future actors must use
this same contract.

## Package Layout

The current public actor layout is:

```text
public/actors/
└── <ActorId>/
    ├── actor.json
    └── layers/
        └── <category>/
            └── <asset>.png
```

The actor ID identifies the package directory. Asset paths inside
`actor.json` are public, web-addressable paths.

## Current Actor Definition

The current TypeScript contract is represented by `ActorDefinition`.

```ts
interface ActorDefinition {
  id: string;
  name: string;
  version: string;
  width: number;
  height: number;
  fps: number;
  display: ActorDisplayDefinition;
  layers: ActorLayerDefinition[];
  rig: ActorRigDefinition;
  animations?: ActorAnimationDefinition;
}
```

### Identity

| Field | Meaning |
| --- | --- |
| `id` | Stable machine-readable actor identifier |
| `name` | Human-readable display name |
| `version` | Version of the actor package |

Actor identifiers must be non-empty and stable. Renaming a display name must
not require changing the actor ID.

### Stage Dimensions

| Field | Meaning |
| --- | --- |
| `width` | Native actor coordinate-space width |
| `height` | Native actor coordinate-space height |
| `fps` | Preferred authored playback rate |

Layer transforms are expressed in actor coordinate space. The renderer scales
that space into the current stage.

### Display Configuration

```ts
interface ActorDisplayDefinition {
  scale: number;
  offsetX: number;
  offsetY: number;
  maxStageWidth: number;
  maxStageHeight: number;
}
```

Display configuration controls initial stage fitting and actor placement. It
must not redefine individual layer transforms.

## Layer Definition

```ts
interface ActorLayerDefinition {
  id: string;
  name: string;
  asset: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  transform: ActorTransform;
  metadata?: ActorLayerMetadata;
  animation?: Record<string, unknown>;
  physics?: Record<string, unknown>;
}
```

Every layer must define:

- A unique stable ID
- A human-readable name
- A valid asset path
- A supported layer type
- A deterministic z-index
- Initial visibility
- Normalized opacity
- A complete transform

React components must never contain actor layer IDs, names, image paths,
z-index values, visibility defaults, or transforms.

`locked`, `type`, metadata, animation metadata, and physics metadata are
optional in source JSON. The v0.5 normalizer supplies `type: "image"` and
`locked: false` when omitted. Metadata remains extensible and is preserved
when it is a JSON object.

The current renderer implements the generic `image` layer type. Other layer
types remain in the normalized definition for inspection and diagnostics but
are not rendered until a corresponding generic renderer capability exists.

### Layer Transform

```ts
interface ActorTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  pivotX: number;
  pivotY: number;
}
```

Transforms must contain finite numeric values. Layer opacity is stored at the
layer level and interpreted within the normalized range from `0` to `1`.

Pivot fields define the origin for rotation and scale. Genesis v0.5 applies
them in the Canvas 2D renderer, hit testing, and selection geometry.

## Normalization and Legacy Compatibility

Genesis v0.5 does not require destructive conversion of existing actor
packages.

The normalization boundary supports:

| Legacy source field | Normalized field |
| --- | --- |
| `image` | `asset` |
| `transform.opacity` | `opacity` |
| Missing `type` | `"image"` |
| Missing `locked` | `false` |
| Missing compatible transform fields | Documented safe defaults |
| Missing `display` | Dimensions-based display defaults |

Legacy compatibility is applied in memory. Existing `actor.json` files and
assets are not rewritten during load.

The normalizer also:

- Resolves relative assets inside the active actor package
- Rejects unsafe external or parent-traversal asset paths
- Clamps opacity to the supported range
- Preserves future-safe actor, layer, transform, and metadata fields
- Sorts layers deterministically by z-index and stable ID
- Skips an unusable layer without inventing a random ID

Duplicate stable IDs remain fatal because selection, history, assets, rig
references, and React keys all depend on unambiguous identity.

## Rig Definition

The rig maps semantic roles to layer IDs.

Examples include:

- Root and face
- Eyes and pupils
- Upper and lower eyelids
- Eyebrows
- Lips, teeth, gums, and tongue
- Mustache and beard groups
- Hair groups
- Jaw groups

The renderer and animation systems may use semantic rig roles. They must not
replace those references with hardcoded layer IDs.

Optional rig roles allow actors with different capabilities to use the same
runtime. Missing optional roles must degrade safely.

## Animation Definition

The current actor contract supports optional blink configuration. Future
animation, expression, physics, and lip-sync data must be added through
versioned, typed extensions to the actor definition.

Actor-specific motion values belong in actor data. Evaluation algorithms
belong in shared engines.

## Loading Contract

The Actor Loader must:

1. Fetch the requested `actor.json`.
2. Parse JSON safely.
3. Normalize legacy fields and assign safe defaults.
4. Validate all required actor and layer integrity.
5. Reject duplicate layer IDs.
6. Load every supported declared layer image.
7. Keep images in a lookup keyed by layer ID.
8. Return one authoritative `ActorDefinition` with diagnostics.

Loaded image elements are runtime resources, not actor definitions. They must
remain separate from `ActorDefinition.layers`.

Asset loading is recoverable per layer. A missing image produces a warning,
preserves the layer definition, and allows all other valid layers to load.

## Validation Rules

An actor is invalid when:

- Required identity fields are empty
- Dimensions or FPS are not positive
- A layer ID is duplicated
- A transform contains non-finite values
- A declared animation block violates its contract

Missing assets, unsupported layer types, empty layer collections, and missing
rig targets are non-fatal warnings. Validation errors and warnings must
identify the actor, layer, or property that caused them whenever possible.

## Editor Mutation Rules

The editor may create a working definition derived from `actor.json` for
authoring and history. That working definition remains the only active layer
model.

Every persistent mutation must:

- Update `ActorDefinition`
- Preserve Undo/Redo
- Avoid duplicating layer state
- Be included in exported `actor.json`

Viewport, selection, Highlight, Solo, and other editor-only state must not be
written into the actor definition unless explicitly added to the format.

## Compatibility and Evolution

Future schema changes must define:

- Actor format version
- Runtime support requirements
- Defaults for omitted optional fields
- Migration behavior
- Export behavior
- Backward-compatibility policy

The editor and runtime must never assign different meanings to the same actor
format version.

## Acceptance Criteria for New Actors

A new actor is compatible when it can be added by providing a valid actor
package without changing:

- React components
- Layer-panel logic
- Inspector logic
- Renderer branches based on actor identity
- History behavior
- Export behavior
