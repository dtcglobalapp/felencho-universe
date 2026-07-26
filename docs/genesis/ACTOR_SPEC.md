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

Bundled actors use the public layout:

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

Genesis v0.6 also exports a portable actor package:

```text
<ActorId>.genesis.zip
├── actor.json
└── <actor-relative asset paths>.png
```

The portable package rewrites asset references to package-relative paths and
marks them as `packaged`. Export stops if any declared asset blob is
unavailable; Genesis must not label an incomplete archive portable.

The standalone `actor.json` export remains available. It preserves the current
authoring document but cannot carry browser-local binary artwork by itself.

## Schema and Product Versioning

The actor schema and Genesis Studio release are independent versions.

- `schemaVersion` describes the meaning of the actor document.
- `version` describes the revision of that individual actor package.
- The Genesis Studio version is application configuration and is never inferred
  from either actor field.

Genesis v0.6 writes actor schema `1.0.0`. Older definitions may omit
`schemaVersion`; `ActorNormalizer` upgrades them in memory without rewriting
their source files. A future Studio release may continue to support the same
actor schema, and a future actor schema must define explicit compatibility and
migration behavior.

## Current Actor Definition

The current TypeScript contract is represented by `ActorDefinition`.

```ts
interface ActorDefinition {
  schemaVersion: string;
  id: string;
  name: string;
  version: string;
  width: number;
  height: number;
  fps: number;
  display: ActorDisplayDefinition;
  assets: ActorAssetDefinition[];
  folders: ActorFolderDefinition[];
  groups: ActorGroupDefinition[];
  layers: ActorLayerDefinition[];
  rig: ActorRigDefinition;
  construction: ActorConstructionDefinition;
  animations?: ActorAnimationDefinition;
}
```

### Identity

| Field | Meaning |
| --- | --- |
| `id` | Stable machine-readable actor identifier |
| `name` | Human-readable display name |
| `version` | Version of the actor package |
| `schemaVersion` | Version of the Genesis actor-data contract |

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
  folderId?: string;
  parentId?: string;
  inheritTransform: boolean;
  blendMode: ActorBlendMode;
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

`locked`, `type`, `folderId`, `parentId`, `inheritTransform`, `blendMode`,
metadata, animation metadata, and physics metadata are optional in legacy
source JSON. The v0.6 normalizer supplies safe defaults. Metadata remains
extensible and is preserved when it is a JSON object.

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

Pivot fields define the origin for rotation and scale. Genesis v0.6 applies
them through the shared `ActorTransformResolver` used by the Canvas 2D
renderer, Studio hit testing, and selection geometry.

## Asset Manifest

```ts
interface ActorAssetDefinition {
  path: string;
  name: string;
  mediaType: "image/png";
  source: "bundled" | "local" | "packaged";
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  byteLength?: number;
}
```

The manifest gives actor data a portable, typed description of every image.
Layer definitions refer to assets by logical `path`.

- `bundled` assets are web-addressable files distributed with the application.
- `local` assets are imported PNG blobs stored in the current browser.
- `packaged` assets came from an imported portable actor package.

IndexedDB stores only binary blobs and metadata needed to recover those blobs.
It is isolated behind `ActorAssetRepository`; it is not an alternative actor
document and it must not own layers, hierarchy, rig, construction, or other
structural data. Logical asset paths must not expose IndexedDB keys.

Unavailable or corrupted local storage and missing blobs are recoverable
diagnostics. They may make the actor incomplete or prevent a portable export,
but they must not crash the Studio or delete the layer definition.

## Organization and Transform Hierarchy

Genesis deliberately distinguishes three concepts.

### Organizational Folders

`ActorFolderDefinition` organizes the Layers panel. A folder has a stable ID,
name, ordering value, optional parent folder, visibility, and lock state.

Folder membership is stored in `layer.folderId`. Moving a layer into a folder
does not change its transform. Folder nesting is not transform inheritance.
Folder visibility and lock state affect editor/render eligibility but do not
make a folder a transform node.

### Logical Transform Groups

`ActorGroupDefinition` is a named transform node with visibility, locking, an
optional transform parent, and a complete transform. A group is not a folder.
Layers and other groups can reference a group by `parentId`.

### Parent-Child Relationships

`layer.parentId` and `group.parentId` form the transform hierarchy.
`inheritTransform` controls whether a layer inherits its declared parent
transform. Parent references may target supported actor nodes but must never
form cycles or self-references.

`ActorHierarchy` validates relationships and effective visibility/locking.
`ActorTransformResolver` computes world transforms. StudioCanvas and
ActorRenderer must use those same rules so authoring geometry and rendered
output cannot diverge.

Deleting a parent clears affected child references. Commands must prevent
self-parenting, circular assignment, invalid references, and orphaned
relationships.

## Construction and Mouth Poses

`ActorConstructionDefinition` describes authoring completeness separately from
structural validity.

```ts
interface ActorConstructionDefinition {
  profile: string;
  requiredRoles: string[];
  optionalRoles: string[];
  requiredMouthPoses: ActorMouthPose[];
  mouthPoses: Partial<Record<ActorMouthPose, string>>;
}
```

Supported mouth-pose keys are:

`REST`, `AA`, `EE`, `OO`, `FV`, `L`, `MBP`, `SMILE`, `SAD`, and `OPEN`.

Mappings point explicitly to layer IDs. A layer name does not have to match a
pose name, and an unmapped layer remains valid. The built-in
`digital-human` profile defines documented role and mouth-pose requirements;
the `custom` profile has no assumed anatomy. Actor-specific requirements may
be supplied in data.

`ActorValidator` reports structural integrity. `ActorCompleteness` calculates
construction progress from the selected profile's exact required roles and
mouth poses. A structurally valid actor may be incomplete.

## Blend Modes

Genesis v0.6 exports only the Canvas 2D modes implemented by the renderer:

- `source-over`
- `multiply`
- `screen`
- `overlay`
- `darken`
- `lighten`

The list is typed and shared by normalization, validation, Inspector controls,
and rendering. Unsupported values are normalized safely and must not be
exported as if they worked.

## Normalization and Legacy Compatibility

Genesis v0.6 does not require destructive conversion of existing actor
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
| Missing `schemaVersion` | Current supported actor schema version |
| Missing asset manifest | Manifest derived from declared layer assets |
| Missing folders | Standard organizational folders assigned by metadata/path |
| Missing groups | Empty transform-group collection |
| Missing construction data | Documented profile defaults |
| Missing `inheritTransform` | `true` |
| Missing `blendMode` | `"source-over"` |

Legacy compatibility is applied in memory. Existing `actor.json` files and
assets are not rewritten during load.

The normalizer also:

- Resolves relative assets inside the active actor package
- Rejects unsafe external or parent-traversal asset paths
- Clamps opacity to the supported range
- Preserves future-safe actor, layer, transform, and metadata fields
- Sorts layers deterministically by z-index and stable ID
- Skips an unusable layer without inventing a random ID
- Adds schema, assets, folders, groups, and construction defaults in memory

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
6. Resolve bundled, local, or packaged assets through the asset boundary.
7. Load every supported declared layer image.
8. Keep images in lookups keyed by asset path and layer ID.
9. Return one authoritative `ActorDefinition` with diagnostics.

Loaded image elements are runtime resources, not actor definitions. They must
remain separate from `ActorDefinition.layers`.

Asset loading is recoverable per layer. A missing image produces a warning,
preserves the layer definition, and allows all other valid layers to load.

## Validation Rules

An actor is invalid when:

- Required identity fields are empty
- Dimensions or FPS are not positive
- A layer ID is duplicated
- A layer and group reuse the same transform-node ID
- A transform contains non-finite values
- A transform parent reference is invalid
- A parent relationship is circular or self-referential
- A declared blend mode is unsupported
- A declared animation block violates its contract

Missing assets, missing folder/rig/mouth references, unsupported layer types,
empty layer collections, and missing required construction mappings are
non-fatal warnings. Validation errors and warnings must identify the actor,
layer, or property that caused them whenever possible.

## Editor Mutation Rules

The editor may create a working definition derived from `actor.json` for
authoring and history. That working definition remains the only active layer
model.

Every persistent mutation must pass through `ActorDocumentCommands` and:

- Update `ActorDefinition`
- Preserve Undo/Redo
- Avoid duplicating layer state
- Be included in exported `actor.json`
- Preserve or repair hierarchy and rig references
- Represent a continuous gesture as one history transaction

Viewport, selection, Highlight, Solo, and other editor-only state must not be
written into the actor definition unless explicitly added to the format.

`StudioSelection` owns selected stable IDs and the range-selection anchor. It
is not actor data. History restores document and selection snapshots for
meaningful commands; it remains session-scoped in Genesis v0.6.

## Compatibility and Evolution

Future schema changes must define:

- Actor format version
- Runtime support requirements
- Defaults for omitted optional fields
- Migration behavior
- Export behavior
- Backward-compatibility policy

The editor and runtime must never assign different meanings to the same actor
schema version. Bob, Lina, and Felencho Virtual legacy JSON remains unchanged
and is upgraded only in memory.

## Acceptance Criteria for New Actors

A new actor is compatible when it can be added by providing a valid actor
package without changing:

- React components
- Layer-panel logic
- Inspector logic
- Renderer branches based on actor identity
- History behavior
- Export behavior
