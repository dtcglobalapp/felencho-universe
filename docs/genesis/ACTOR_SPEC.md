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
  image: string;
  zIndex: number;
  visible: boolean;
  transform: ActorTransform;
}
```

Every layer must define:

- A unique stable ID
- A human-readable name
- A valid asset path
- A deterministic z-index
- Initial visibility
- A complete transform

React components must never contain actor layer IDs, names, image paths,
z-index values, visibility defaults, or transforms.

### Layer Transform

```ts
interface ActorTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  pivotX: number;
  pivotY: number;
}
```

Transforms must contain finite numeric values. Opacity is interpreted within
the normalized range from `0` to `1`.

Pivot fields belong to the actor contract even where a current rendering path
does not yet apply them. Future transform work must preserve backward
compatibility.

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
3. Validate all required fields.
4. Reject duplicate layer IDs.
5. Load every declared layer image.
6. Keep images in a lookup keyed by layer ID.
7. Return one authoritative `ActorDefinition`.

Loaded image elements are runtime resources, not actor definitions. They must
remain separate from `ActorDefinition.layers`.

## Validation Rules

An actor is invalid when:

- Required identity fields are empty
- Dimensions or FPS are not positive
- A layer ID is duplicated
- A layer has an invalid asset path
- A transform contains non-finite values
- Visibility is not boolean
- A declared animation block violates its contract

Validation errors must identify the actor or layer that failed whenever
possible.

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
