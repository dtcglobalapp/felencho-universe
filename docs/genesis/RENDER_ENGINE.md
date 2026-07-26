# Genesis Render Engine

## Purpose

The Render Engine converts a validated actor definition, loaded assets, stage
metrics, and transient runtime state into a visual digital human.

Rendering is independent of the Genesis Studio UI.

## Current Status

The current production renderer uses the Canvas 2D API. Its implemented
responsibilities include:

- Stage fitting
- Actor placement
- Layer ordering
- Visibility
- Opacity
- Translation, rotation, and scale
- Pivot-aware transforms
- Parent and transform-group inheritance
- Effective folder, group, and layer visibility
- Typed Canvas 2D blend modes
- Eye movement
- Blink deformation
- Head movement
- Idle body motion

Future render backends may be added, but they must consume the same actor and
runtime contracts.

## Inputs

The renderer receives:

```ts
renderActor(
  context,
  actor,
  stage,
  runtime,
)
```

### Canvas Context

The drawing destination and current browser rendering surface.

### Loaded Actor

The loaded actor contains:

- One authoritative `ActorDefinition`
- A layer-image lookup keyed by layer ID
- An asset-image and runtime-URL lookup keyed by logical asset path
- Normalization and asset diagnostics

The renderer must never maintain its own copy of layer definitions.

### Stage Metrics

Stage metrics define the available rendering width and height.

### Runtime State

Runtime state contains transient values such as gaze, blinking, head motion,
body motion, and future expression or lip-sync channels.

Runtime state must not mutate actor configuration.

## Render Pipeline

The current pipeline is:

1. Read actor display configuration.
2. Calculate the scale required to fit the actor into the stage.
3. Apply the configured display scale and offsets.
4. Calculate the actor center.
5. Apply head and idle body transforms.
6. Build runtime transform overrides for semantic rig roles.
7. Resolve effective folder, group, and layer visibility through
   `ActorHierarchy`.
8. Resolve each layer world matrix through `ActorTransformResolver`.
9. Sort `ActorDefinition.layers` by z-index and stable ID.
10. Skip invisible, unsupported, or unavailable layers.
11. Resolve the layer image by ID.
12. Apply layer opacity and its supported blend mode.
13. Apply the resolved world transform and draw the image.
14. Restore canvas state.

Every canvas `save()` operation must have a corresponding `restore()`.

## Layer Ordering

Z-index is read exclusively from the normalized actor definition derived from
`actor.json`.

The renderer sorts current layer definitions before drawing. Changing z-index
in the editor therefore affects rendering without changing loaded asset order.

Equal z-index values are resolved deterministically by stable layer ID.

## Coordinate Systems

Genesis uses distinct coordinate spaces:

### Layer-Local Space

Coordinates relative to the layer bitmap.

### Actor Space

The native coordinate system defined by actor width and height.

### Stage Space

CSS-pixel coordinates within the rendered canvas.

### Device-Pixel Space

Physical canvas backing-store pixels after device-pixel-ratio scaling.

Conversions between these spaces must be explicit. Editor hit testing and
selection geometry must agree with renderer transforms.

## Hierarchy and Shared Transform Resolution

Folders are organizational and never contribute a transform. Logical groups
and parented layers form the actor transform hierarchy.

`ActorHierarchy` validates effective visibility and locking and rejects
self-parenting, missing references, and cycles. `ActorTransformResolver`
composes local transforms into actor-space world matrices with caching and
recursion protection.

ActorRenderer and StudioCanvas use these shared systems. A hierarchy rule must
not be reimplemented independently in the editor, because selection handles,
hit testing, and final rendering must agree.

Deleting a transform parent clears child references through
`ActorDocumentCommands`. Invalid external hierarchy data is reported by
ActorValidator before rendering.

## Blend Modes

The Canvas 2D renderer supports and exports only:

- `source-over`
- `multiply`
- `screen`
- `overlay`
- `darken`
- `lighten`

These values map to `globalCompositeOperation`. Unsupported source values
receive a safe `source-over` normalization warning rather than being exported
as a working feature.

## Semantic Rig Behavior

The renderer may apply behavior based on semantic rig references such as:

- Left and right pupils
- Upper and lower eyelids
- Future mouth or expression roles

These references come from the actor rig. Layer IDs must never be hardcoded in
renderer logic.

## Visibility and Missing Assets

Invisible layers are skipped.

If a loaded image cannot be resolved for a layer, the renderer skips that
layer safely. The loader reports the underlying asset warning while allowing
the remaining actor to reach a usable ready state.

The current renderer supports `type: "image"`. Unsupported future layer types
are preserved for inspection but skipped with diagnostics.

Bundled assets resolve from public URLs. Local and packaged assets resolve from
blobs owned by `ActorAssetRepository`. A missing blob produces a diagnostic;
the renderer receives no image for that asset and safely skips it.

## Performance Rules

The renderer runs inside an animation frame and must:

- Avoid network access
- Avoid JSON parsing
- Avoid React state updates
- Avoid unnecessary image decoding
- Avoid character-specific branching
- Keep allocations measurable and bounded
- Cache expensive stable calculations when profiling supports it

Optimization must preserve visual correctness and data-driven behavior.

## Editor Preview

Highlight and Solo are preview modes. The Studio produces a transient preview
definition with filtered layers or adjusted opacity, while the authoritative
working definition remains unchanged.

Preview-only changes must not enter history or exported actor data.

## Future Rendering Capabilities

Planned capabilities include:

- Masks and clipping
- Mesh deformation
- Animation blending
- Physics results
- Expression blending
- Lip-sync channels
- WebGL or GPU-accelerated backends
- Broadcast and hologram outputs

Every capability must enter through typed data or runtime state rather than
actor-specific code.

## Render Backend Contract

A future backend must:

- Consume the same actor definition
- Respect the same ordering and visibility semantics
- Apply the same runtime channels
- Produce deterministic output for equivalent inputs
- Remain independent of Studio components

Backend-specific caches and GPU resources are allowed. Backend-specific actor
definitions are not.
