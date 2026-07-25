import type {
  ActorAnimationDefinition,
  ActorDefinition,
  ActorDiagnostic,
  ActorDisplayDefinition,
  ActorLayerDefinition,
  ActorLayerMetadata,
  ActorNormalizationResult,
  ActorRigDefinition,
  ActorTransform,
} from "./ActorDefinition";

import {
  ActorDefinitionValidationError,
  assertActorDefinition,
} from "./ActorValidator";

interface NormalizeActorOptions {
  sourceActorId: string;
  assetBasePath?: string;
}

interface NormalizeLayerOptions {
  actorId: string;
  assetBasePath: string;
  index: number;
}

type LayerOrder = "ascending" | "descending";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function diagnostic(
  code: string,
  message: string,
  path: string,
  layerId?: string,
): ActorDiagnostic {
  return {
    severity: "warning",
    code,
    message,
    path,
    layerId,
  };
}

function finiteOrDefault(
  value: unknown,
  fallback: number,
  warnings: ActorDiagnostic[],
  code: string,
  path: string,
  message: string,
  layerId?: string,
): number {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (value !== undefined) {
    warnings.push(
      diagnostic(
        code,
        message,
        path,
        layerId,
      ),
    );
  }

  return fallback;
}

function normalizeAssetPath(
  value: string,
  assetBasePath: string,
  warnings: ActorDiagnostic[],
  path: string,
  layerId: string,
): string {
  const asset = value.trim();

  if (!asset) {
    return "";
  }

  if (
    asset.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(asset)
  ) {
    warnings.push(
      diagnostic(
        "UNSAFE_ASSET_PATH",
        `Layer "${layerId}" uses a non-local asset path and will not be loaded.`,
        path,
        layerId,
      ),
    );

    return "";
  }

  const segments = asset.split("/");

  if (segments.includes("..")) {
    warnings.push(
      diagnostic(
        "UNSAFE_ASSET_PATH",
        `Layer "${layerId}" uses an asset path that escapes its actor package.`,
        path,
        layerId,
      ),
    );

    return "";
  }

  if (asset.startsWith("/")) {
    return asset;
  }

  const cleanBasePath =
    assetBasePath.endsWith("/")
      ? assetBasePath
      : `${assetBasePath}/`;

  return `${cleanBasePath}${segments
    .filter(
      (segment) =>
        segment.length > 0 &&
        segment !== ".",
    )
    .join("/")}`;
}

function normalizeTransform(
  value: unknown,
  warnings: ActorDiagnostic[],
  layerId: string,
  path: string,
): ActorTransform {
  const rawTransform = isRecord(value)
    ? value
    : {};

  if (!isRecord(value) && value !== undefined) {
    warnings.push(
      diagnostic(
        "INVALID_TRANSFORM",
        `Layer "${layerId}" has an invalid transform and received safe defaults.`,
        path,
        layerId,
      ),
    );
  }

  const futureTransform = {
    ...rawTransform,
  };

  delete futureTransform.opacity;

  return {
    ...futureTransform,
    x: finiteOrDefault(
      rawTransform.x,
      0,
      warnings,
      "INVALID_TRANSFORM",
      `${path}.x`,
      `Layer "${layerId}" has an invalid x transform.`,
      layerId,
    ),
    y: finiteOrDefault(
      rawTransform.y,
      0,
      warnings,
      "INVALID_TRANSFORM",
      `${path}.y`,
      `Layer "${layerId}" has an invalid y transform.`,
      layerId,
    ),
    rotation: finiteOrDefault(
      rawTransform.rotation,
      0,
      warnings,
      "INVALID_TRANSFORM",
      `${path}.rotation`,
      `Layer "${layerId}" has an invalid rotation transform.`,
      layerId,
    ),
    scaleX: finiteOrDefault(
      rawTransform.scaleX,
      1,
      warnings,
      "INVALID_TRANSFORM",
      `${path}.scaleX`,
      `Layer "${layerId}" has an invalid horizontal scale.`,
      layerId,
    ),
    scaleY: finiteOrDefault(
      rawTransform.scaleY,
      1,
      warnings,
      "INVALID_TRANSFORM",
      `${path}.scaleY`,
      `Layer "${layerId}" has an invalid vertical scale.`,
      layerId,
    ),
    pivotX: finiteOrDefault(
      rawTransform.pivotX,
      0.5,
      warnings,
      "INVALID_TRANSFORM",
      `${path}.pivotX`,
      `Layer "${layerId}" has an invalid horizontal pivot.`,
      layerId,
    ),
    pivotY: finiteOrDefault(
      rawTransform.pivotY,
      0.5,
      warnings,
      "INVALID_TRANSFORM",
      `${path}.pivotY`,
      `Layer "${layerId}" has an invalid vertical pivot.`,
      layerId,
    ),
  } as ActorTransform;
}

function normalizeOpacity(
  value: unknown,
  warnings: ActorDiagnostic[],
  layerId: string,
  path: string,
): number {
  if (!isFiniteNumber(value)) {
    if (value !== undefined) {
      warnings.push(
        diagnostic(
          "INVALID_OPACITY",
          `Layer "${layerId}" has an invalid opacity and received the default value 1.`,
          path,
          layerId,
        ),
      );
    }

    return 1;
  }

  const normalized = Math.min(
    1,
    Math.max(0, value),
  );

  if (normalized !== value) {
    warnings.push(
      diagnostic(
        "INVALID_OPACITY",
        `Layer "${layerId}" opacity was clamped to ${normalized}.`,
        path,
        layerId,
      ),
    );
  }

  return normalized;
}

function normalizeOptionalRecord<T>(
  value: unknown,
  warnings: ActorDiagnostic[],
  code: string,
  path: string,
  message: string,
  layerId: string,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    warnings.push(
      diagnostic(
        code,
        message,
        path,
        layerId,
      ),
    );

    return undefined;
  }

  return {
    ...value,
  } as T;
}

export function normalizeActorLayer(
  value: unknown,
  options: NormalizeLayerOptions,
): {
  layer: ActorLayerDefinition | null;
  warnings: ActorDiagnostic[];
} {
  const warnings: ActorDiagnostic[] = [];
  const path = `layers[${options.index}]`;

  if (!isRecord(value)) {
    warnings.push(
      diagnostic(
        "INVALID_LAYER",
        `Layer at position ${options.index + 1} is not an object and was skipped.`,
        path,
      ),
    );

    return {
      layer: null,
      warnings,
    };
  }

  const id =
    typeof value.id === "string"
      ? value.id.trim()
      : "";

  if (!id) {
    warnings.push(
      diagnostic(
        "MISSING_LAYER_ID",
        `Layer at position ${options.index + 1} has no stable ID and was skipped.`,
        `${path}.id`,
      ),
    );

    return {
      layer: null,
      warnings,
    };
  }

  const name =
    typeof value.name === "string" &&
    value.name.trim()
      ? value.name.trim()
      : id;

  if (name === id && value.name !== id) {
    warnings.push(
      diagnostic(
        "MISSING_LAYER_NAME",
        `Layer "${id}" has no readable name; its ID is used as a fallback.`,
        `${path}.name`,
        id,
      ),
    );
  }

  const rawTransform = isRecord(
    value.transform,
  )
    ? value.transform
    : {};

  const legacyAsset =
    typeof value.image === "string"
      ? value.image
      : "";

  const declaredAsset =
    typeof value.asset === "string"
      ? value.asset
      : legacyAsset;

  const opacitySource =
    value.opacity ??
    rawTransform.opacity;

  const futureLayer = {
    ...value,
  };

  delete futureLayer.image;
  delete futureLayer.transform;
  delete futureLayer.metadata;
  delete futureLayer.animation;
  delete futureLayer.physics;

  const metadata =
    normalizeOptionalRecord<ActorLayerMetadata>(
      value.metadata,
      warnings,
      "INVALID_LAYER_METADATA",
      `${path}.metadata`,
      `Layer "${name}" has invalid metadata; it was omitted.`,
      id,
    );

  const animation =
    normalizeOptionalRecord<
      Record<string, unknown>
    >(
      value.animation,
      warnings,
      "INVALID_LAYER_ANIMATION",
      `${path}.animation`,
      `Layer "${name}" has invalid animation metadata; it was omitted.`,
      id,
    );

  const physics =
    normalizeOptionalRecord<
      Record<string, unknown>
    >(
      value.physics,
      warnings,
      "INVALID_LAYER_PHYSICS",
      `${path}.physics`,
      `Layer "${name}" has invalid physics metadata; it was omitted.`,
      id,
    );

  const layer: ActorLayerDefinition = {
    ...futureLayer,
    id,
    name,
    asset: normalizeAssetPath(
      declaredAsset,
      options.assetBasePath,
      warnings,
      `${path}.asset`,
      id,
    ),
    type:
      typeof value.type === "string" &&
      value.type.trim()
        ? value.type.trim()
        : "image",
    visible:
      typeof value.visible === "boolean"
        ? value.visible
        : true,
    locked:
      typeof value.locked === "boolean"
        ? value.locked
        : false,
    opacity: normalizeOpacity(
      opacitySource,
      warnings,
      id,
      `${path}.opacity`,
    ),
    zIndex: finiteOrDefault(
      value.zIndex,
      options.index,
      warnings,
      "INVALID_Z_INDEX",
      `${path}.zIndex`,
      `Layer "${name}" has an invalid z-index and received ${options.index}.`,
      id,
    ),
    transform: normalizeTransform(
      value.transform,
      warnings,
      id,
      `${path}.transform`,
    ),
    ...(metadata
      ? { metadata }
      : {}),
    ...(animation
      ? { animation }
      : {}),
    ...(physics
      ? { physics }
      : {}),
  };

  if (
    value.visible !== undefined &&
    typeof value.visible !== "boolean"
  ) {
    warnings.push(
      diagnostic(
        "INVALID_VISIBILITY",
        `Layer "${name}" has invalid visibility and defaults to visible.`,
        `${path}.visible`,
        id,
      ),
    );
  }

  if (
    value.locked !== undefined &&
    typeof value.locked !== "boolean"
  ) {
    warnings.push(
      diagnostic(
        "INVALID_LOCK_STATE",
        `Layer "${name}" has an invalid lock state and defaults to unlocked.`,
        `${path}.locked`,
        id,
      ),
    );
  }

  return {
    layer,
    warnings,
  };
}

export function sortActorLayers(
  layers: readonly ActorLayerDefinition[],
  order: LayerOrder = "ascending",
): ActorLayerDefinition[] {
  const multiplier =
    order === "ascending" ? 1 : -1;

  return [...layers].sort(
    (first, second) => {
      const zOrder =
        first.zIndex - second.zIndex;

      if (zOrder !== 0) {
        return zOrder * multiplier;
      }

      return (
        first.id.localeCompare(second.id) *
        multiplier
      );
    },
  );
}

function normalizeDisplay(
  value: unknown,
  width: number,
  height: number,
  warnings: ActorDiagnostic[],
): ActorDisplayDefinition {
  const display = isRecord(value)
    ? value
    : {};

  if (!isRecord(value)) {
    warnings.push(
      diagnostic(
        "MISSING_DISPLAY",
        "Actor display settings were missing and received safe defaults.",
        "display",
      ),
    );
  }

  const scale =
    isFiniteNumber(display.scale) &&
    display.scale > 0
      ? display.scale
      : 1;

  if (
    display.scale !== undefined &&
    scale !== display.scale
  ) {
    warnings.push(
      diagnostic(
        "INVALID_DISPLAY",
        "Actor display scale was invalid and defaults to 1.",
        "display.scale",
      ),
    );
  }

  const maxStageWidth =
    isFiniteNumber(display.maxStageWidth) &&
    display.maxStageWidth > 0
      ? display.maxStageWidth
      : width;

  const maxStageHeight =
    isFiniteNumber(display.maxStageHeight) &&
    display.maxStageHeight > 0
      ? display.maxStageHeight
      : height;

  return {
    ...display,
    scale,
    offsetX: finiteOrDefault(
      display.offsetX,
      0,
      warnings,
      "INVALID_DISPLAY",
      "display.offsetX",
      "Actor display offsetX was invalid and defaults to 0.",
    ),
    offsetY: finiteOrDefault(
      display.offsetY,
      0,
      warnings,
      "INVALID_DISPLAY",
      "display.offsetY",
      "Actor display offsetY was invalid and defaults to 0.",
    ),
    maxStageWidth,
    maxStageHeight,
  } as ActorDisplayDefinition;
}

function positiveRequiredNumber(
  value: unknown,
  path: string,
  actorId: string,
): number {
  if (
    isFiniteNumber(value) &&
    value > 0
  ) {
    return value;
  }

  const error: ActorDiagnostic = {
    severity: "error",
    code: "INVALID_ACTOR_DIMENSIONS",
    message: `Actor "${actorId}" requires a positive finite ${path}.`,
    path,
  };

  throw new ActorDefinitionValidationError(
    error.message,
    [error],
  );
}

export function normalizeActorDefinition(
  value: unknown,
  options: NormalizeActorOptions,
): ActorNormalizationResult {
  if (!isRecord(value)) {
    const error: ActorDiagnostic = {
      severity: "error",
      code: "INVALID_ACTOR_DEFINITION",
      message:
        "Actor definition must be a JSON object.",
    };

    throw new ActorDefinitionValidationError(
      error.message,
      [error],
    );
  }

  if (!Array.isArray(value.layers)) {
    const error: ActorDiagnostic = {
      severity: "error",
      code: "MISSING_LAYERS_ARRAY",
      message:
        "Actor definition requires a layers array.",
      path: "layers",
    };

    throw new ActorDefinitionValidationError(
      error.message,
      [error],
    );
  }

  const sourceActorId =
    options.sourceActorId.trim();

  const id =
    typeof value.id === "string" &&
    value.id.trim()
      ? value.id.trim()
      : sourceActorId;

  if (!id) {
    const error: ActorDiagnostic = {
      severity: "error",
      code: "MISSING_ACTOR_ID",
      message:
        "Actor definition requires a stable ID.",
      path: "id",
    };

    throw new ActorDefinitionValidationError(
      error.message,
      [error],
    );
  }

  const warnings: ActorDiagnostic[] = [];
  const width = positiveRequiredNumber(
    value.width,
    "width",
    id,
  );
  const height = positiveRequiredNumber(
    value.height,
    "height",
    id,
  );

  const assetBasePath =
    options.assetBasePath ??
    `/actors/${encodeURIComponent(
      sourceActorId || id,
    )}/`;

  const normalizedLayers =
    value.layers.flatMap(
      (rawLayer, index) => {
        const result = normalizeActorLayer(
          rawLayer,
          {
            actorId: id,
            assetBasePath,
            index,
          },
        );

        warnings.push(...result.warnings);

        return result.layer
          ? [result.layer]
          : [];
      },
    );

  const rig: ActorRigDefinition =
    isRecord(value.rig)
      ? {
          ...value.rig,
        } as ActorRigDefinition
      : {};

  if (!isRecord(value.rig)) {
    warnings.push(
      diagnostic(
        "INVALID_RIG",
        `Actor "${id}" has no valid rig object; an empty rig is used.`,
        "rig",
      ),
    );
  }

  const animations =
    isRecord(value.animations)
      ? {
          ...value.animations,
        } as ActorAnimationDefinition
      : undefined;

  if (
    value.animations !== undefined &&
    !isRecord(value.animations)
  ) {
    warnings.push(
      diagnostic(
        "INVALID_ANIMATIONS",
        `Actor "${id}" has invalid animation data; it was omitted.`,
        "animations",
      ),
    );
  }

  const fps =
    isFiniteNumber(value.fps) &&
    value.fps > 0
      ? value.fps
      : 60;

  if (fps !== value.fps) {
    warnings.push(
      diagnostic(
        "INVALID_ACTOR_FPS",
        `Actor "${id}" has invalid FPS and defaults to 60.`,
        "fps",
      ),
    );
  }

  const futureDefinition = {
    ...value,
  };

  delete futureDefinition.layers;
  delete futureDefinition.display;
  delete futureDefinition.rig;
  delete futureDefinition.animations;

  const definition: ActorDefinition = {
    ...futureDefinition,
    id,
    name:
      typeof value.name === "string" &&
      value.name.trim()
        ? value.name.trim()
        : id,
    version:
      typeof value.version === "string" &&
      value.version.trim()
        ? value.version.trim()
        : "1.0.0",
    width,
    height,
    fps,
    display: normalizeDisplay(
      value.display,
      width,
      height,
      warnings,
    ),
    layers: sortActorLayers(
      normalizedLayers,
    ),
    rig,
    ...(animations
      ? { animations }
      : {}),
  } as ActorDefinition;

  warnings.push(
    ...assertActorDefinition(definition),
  );

  return {
    definition,
    warnings,
  };
}
