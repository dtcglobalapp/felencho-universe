import type {
  ActorAnimationDefinition,
  ActorAssetDefinition,
  ActorAssetSource,
  ActorBlendMode,
  ActorConstructionDefinition,
  ActorDefinition,
  ActorDiagnostic,
  ActorDisplayDefinition,
  ActorFolderDefinition,
  ActorGroupDefinition,
  ActorLayerDefinition,
  ActorLayerMetadata,
  ActorMouthPose,
  ActorNormalizationResult,
  ActorRigDefinition,
  ActorTransform,
} from "./ActorDefinition";

import {
  ACTOR_MOUTH_POSES,
  ACTOR_SCHEMA_VERSION,
} from "./ActorDefinition";

import {
  CUSTOM_CONSTRUCTION_PROFILE,
  DEFAULT_ACTOR_FOLDERS,
  DEFAULT_CONSTRUCTION_PROFILE,
  GENESIS_BLEND_MODES,
} from "../config/ActorEditorConfig";

import {
  ActorDefinitionValidationError,
  assertActorDefinition,
  isActorBlinkDefinition,
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

const mouthPoseSet =
  new Set<string>(ACTOR_MOUTH_POSES);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function actorBlendMode(
  value: unknown,
): ActorBlendMode | undefined {
  return GENESIS_BLEND_MODES.find(
    (mode) => mode === value,
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
  };
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

function normalizeOptionalRecord(
  value: unknown,
  warnings: ActorDiagnostic[],
  code: string,
  path: string,
  message: string,
  layerId: string,
): Record<string, unknown> | undefined {
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
  };
}

function normalizeLayerMetadata(
  value: unknown,
  warnings: ActorDiagnostic[],
  path: string,
  layerId: string,
  layerName: string,
): ActorLayerMetadata | undefined {
  const record =
    normalizeOptionalRecord(
      value,
      warnings,
      "INVALID_LAYER_METADATA",
      path,
      `Layer "${layerName}" has invalid metadata; it was omitted.`,
      layerId,
    );

  if (!record) {
    return undefined;
  }

  const {
    category,
    semanticRole,
    ...futureMetadata
  } = record;

  return {
    ...futureMetadata,
    ...(typeof category ===
    "string"
      ? { category }
      : {}),
    ...(typeof semanticRole ===
    "string"
      ? { semanticRole }
      : {}),
  };
}

function optionalIdentifier(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  return value.trim();
}

function deriveFolderId(
  declaredFolderId: unknown,
  metadata: ActorLayerMetadata | undefined,
  asset: string,
): string | undefined {
  const explicit =
    optionalIdentifier(declaredFolderId);

  if (explicit) {
    return explicit.toLowerCase();
  }

  const category =
    optionalIdentifier(
      metadata?.category,
    );

  if (category) {
    return category.toLowerCase();
  }

  const layerPathMatch =
    asset.match(
      /\/layers\/([^/]+)\//i,
    );

  if (!layerPathMatch?.[1]) {
    return undefined;
  }

  const folder =
    layerPathMatch[1].toLowerCase();

  if (folder === "armor") {
    return "accessories";
  }

  if (folder === "mustache") {
    return "beard";
  }

  return folder;
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
  const blendMode =
    actorBlendMode(
      value.blendMode,
    );

  const futureLayer = {
    ...value,
  };

  delete futureLayer.image;
  delete futureLayer.transform;
  delete futureLayer.metadata;
  delete futureLayer.animation;
  delete futureLayer.physics;

  const metadata =
    normalizeLayerMetadata(
      value.metadata,
      warnings,
      `${path}.metadata`,
      id,
      name,
    );

  const animation =
    normalizeOptionalRecord(
      value.animation,
      warnings,
      "INVALID_LAYER_ANIMATION",
      `${path}.animation`,
      `Layer "${name}" has invalid animation metadata; it was omitted.`,
      id,
    );

  const physics =
    normalizeOptionalRecord(
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
    folderId: deriveFolderId(
      value.folderId,
      metadata,
      declaredAsset,
    ),
    parentId: optionalIdentifier(
      value.parentId,
    ),
    inheritTransform:
      typeof value.inheritTransform ===
      "boolean"
        ? value.inheritTransform
        : true,
    blendMode:
      blendMode ?? "source-over",
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

  if (
    value.blendMode !== undefined &&
    (
      !blendMode
    )
  ) {
    warnings.push(
      diagnostic(
        "UNSUPPORTED_BLEND_MODE",
        `Layer "${name}" uses an unsupported blend mode and defaults to source-over.`,
        `${path}.blendMode`,
        id,
      ),
    );
  }

  return {
    layer,
    warnings,
  };
}

function normalizeFolders(
  value: unknown,
  warnings: ActorDiagnostic[],
): ActorFolderDefinition[] {
  const folders = new Map(
    DEFAULT_ACTOR_FOLDERS.map(
      (folder) => [
        folder.id,
        {
          ...folder,
        },
      ],
    ),
  );

  if (
    value !== undefined &&
    !Array.isArray(value)
  ) {
    warnings.push(
      diagnostic(
        "INVALID_FOLDERS",
        "Actor folders were invalid and received safe defaults.",
        "folders",
      ),
    );
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (!isRecord(entry)) {
        warnings.push(
          diagnostic(
            "INVALID_FOLDER",
            `Folder at position ${index + 1} is invalid and was skipped.`,
            `folders[${index}]`,
          ),
        );
        return;
      }

      const id =
        optionalIdentifier(entry.id);

      if (!id) {
        warnings.push(
          diagnostic(
            "INVALID_FOLDER",
            `Folder at position ${index + 1} has no stable ID and was skipped.`,
            `folders[${index}].id`,
          ),
        );
        return;
      }

      const normalizedId =
        id.toLowerCase();
      const existing =
        folders.get(normalizedId);

      folders.set(normalizedId, {
        id: normalizedId,
        name:
          optionalIdentifier(
            entry.name,
          ) ??
          existing?.name ??
          id,
        parentId:
          optionalIdentifier(
            entry.parentId,
          )?.toLowerCase(),
        order: finiteOrDefault(
          entry.order,
          existing?.order ??
            folders.size,
          warnings,
          "INVALID_FOLDER_ORDER",
          `folders[${index}].order`,
          `Folder "${id}" has an invalid order.`,
        ),
        visible:
          typeof entry.visible ===
          "boolean"
            ? entry.visible
            : existing?.visible ??
              true,
        locked:
          typeof entry.locked ===
          "boolean"
            ? entry.locked
            : existing?.locked ??
              false,
      });
    });
  }

  return [...folders.values()].sort(
    (first, second) =>
      first.order - second.order ||
      first.id.localeCompare(second.id),
  );
}

function normalizeGroups(
  value: unknown,
  warnings: ActorDiagnostic[],
): ActorGroupDefinition[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    warnings.push(
      diagnostic(
        "INVALID_GROUPS",
        "Actor groups were invalid and were omitted.",
        "groups",
      ),
    );
    return [];
  }

  return value.flatMap(
    (entry, index) => {
      if (!isRecord(entry)) {
        warnings.push(
          diagnostic(
            "INVALID_GROUP",
            `Group at position ${index + 1} is invalid and was skipped.`,
            `groups[${index}]`,
          ),
        );
        return [];
      }

      const id =
        optionalIdentifier(entry.id);

      if (!id) {
        warnings.push(
          diagnostic(
            "INVALID_GROUP",
            `Group at position ${index + 1} has no stable ID and was skipped.`,
            `groups[${index}].id`,
          ),
        );
        return [];
      }

      return [
        {
          id,
          name:
            optionalIdentifier(
              entry.name,
            ) ?? id,
          parentId:
            optionalIdentifier(
              entry.parentId,
            ),
          visible:
            typeof entry.visible ===
            "boolean"
              ? entry.visible
              : true,
          locked:
            typeof entry.locked ===
            "boolean"
              ? entry.locked
              : false,
          transform: normalizeTransform(
            entry.transform,
            warnings,
            id,
            `groups[${index}].transform`,
          ),
        },
      ];
    },
  );
}

function normalizeAssetSource(
  value: unknown,
): ActorAssetSource {
  return value === "local" ||
    value === "packaged"
    ? value
    : "bundled";
}

function normalizeAssets(
  value: unknown,
  layers: readonly ActorLayerDefinition[],
  assetBasePath: string,
  warnings: ActorDiagnostic[],
): ActorAssetDefinition[] {
  const assets = new Map<
    string,
    ActorAssetDefinition
  >();

  if (
    value !== undefined &&
    !Array.isArray(value)
  ) {
    warnings.push(
      diagnostic(
        "INVALID_ASSETS",
        "Actor assets were invalid and were reconstructed from layer references.",
        "assets",
      ),
    );
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (!isRecord(entry)) {
        warnings.push(
          diagnostic(
            "INVALID_ASSET",
            `Asset at position ${index + 1} is invalid and was skipped.`,
            `assets[${index}]`,
          ),
        );
        return;
      }

      const declaredPath =
        optionalIdentifier(entry.path);

      if (!declaredPath) {
        warnings.push(
          diagnostic(
            "INVALID_ASSET",
            `Asset at position ${index + 1} has no path and was skipped.`,
            `assets[${index}].path`,
          ),
        );
        return;
      }

      const path = normalizeAssetPath(
        declaredPath,
        assetBasePath,
        warnings,
        `assets[${index}].path`,
        `asset-${index + 1}`,
      );

      if (!path) {
        return;
      }

      const fileName =
        path.split("/").at(-1) ??
        `asset-${index + 1}.png`;

      assets.set(path, {
        path,
        name:
          optionalIdentifier(
            entry.name,
          ) ?? fileName,
        mediaType: "image/png",
        source: normalizeAssetSource(
          entry.source,
        ),
        ...(isFiniteNumber(
          entry.width,
        ) &&
        entry.width > 0
          ? { width: entry.width }
          : {}),
        ...(isFiniteNumber(
          entry.height,
        ) &&
        entry.height > 0
          ? { height: entry.height }
          : {}),
        ...(typeof entry.hasAlpha ===
        "boolean"
          ? {
              hasAlpha:
                entry.hasAlpha,
            }
          : {}),
        ...(isFiniteNumber(
          entry.byteLength,
        ) &&
        entry.byteLength >= 0
          ? {
              byteLength:
                entry.byteLength,
            }
          : {}),
      });
    });
  }

  for (const layer of layers) {
    if (!layer.asset) {
      continue;
    }

    if (!assets.has(layer.asset)) {
      assets.set(layer.asset, {
        path: layer.asset,
        name:
          layer.asset
            .split("/")
            .at(-1) ??
          layer.name,
        mediaType: "image/png",
        source: "bundled",
      });
    }
  }

  return [...assets.values()].sort(
    (first, second) =>
      first.path.localeCompare(
        second.path,
      ),
  );
}

function normalizeConstruction(
  value: unknown,
  warnings: ActorDiagnostic[],
): ActorConstructionDefinition {
  const raw = isRecord(value)
    ? value
    : {};

  if (
    value !== undefined &&
    !isRecord(value)
  ) {
    warnings.push(
      diagnostic(
        "INVALID_CONSTRUCTION",
        "Actor construction settings were invalid and received safe defaults.",
        "construction",
      ),
    );
  }

  const profile =
    optionalIdentifier(raw.profile) ??
    DEFAULT_CONSTRUCTION_PROFILE.profile;

  const base =
    profile === "custom"
      ? CUSTOM_CONSTRUCTION_PROFILE
      : DEFAULT_CONSTRUCTION_PROFILE;

  const stringArray = (
    source: unknown,
    fallback: readonly string[],
  ): string[] =>
    Array.isArray(source)
      ? source.flatMap((item) => {
          const normalized =
            optionalIdentifier(item);
          return normalized
            ? [normalized]
            : [];
        })
      : [...fallback];

  const requiredMouthPoses =
    stringArray(
      raw.requiredMouthPoses,
      base.requiredMouthPoses,
    ).filter(
      (
        pose,
      ): pose is ActorMouthPose =>
        mouthPoseSet.has(pose),
    );

  const mouthPoses: Partial<
    Record<ActorMouthPose, string>
  > = {};

  if (isRecord(raw.mouthPoses)) {
    for (
      const [pose, layerId] of
      Object.entries(raw.mouthPoses)
    ) {
      const normalizedPose =
        ACTOR_MOUTH_POSES.find(
          (item) => item === pose,
        );
      const normalizedLayerId =
        optionalIdentifier(layerId);

      if (
        normalizedPose &&
        normalizedLayerId
      ) {
        mouthPoses[
          normalizedPose
        ] = normalizedLayerId;
      }
    }
  }

  return {
    profile,
    requiredRoles: stringArray(
      raw.requiredRoles,
      base.requiredRoles,
    ),
    optionalRoles: stringArray(
      raw.optionalRoles,
      base.optionalRoles,
    ),
    requiredMouthPoses,
    mouthPoses,
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
  };
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

function normalizeRig(
  value: unknown,
  warnings: ActorDiagnostic[],
  actorId: string,
): ActorRigDefinition {
  if (!isRecord(value)) {
    warnings.push(
      diagnostic(
        "INVALID_RIG",
        `Actor "${actorId}" has no valid rig object; an empty rig is used.`,
        "rig",
      ),
    );
    return {};
  }

  const rig: ActorRigDefinition = {};

  for (
    const [role, target] of
    Object.entries(value)
  ) {
    if (
      typeof target === "string" &&
      target.trim()
    ) {
      rig[role] = target.trim();
      continue;
    }

    if (
      Array.isArray(target) &&
      target.every(
        (item) =>
          typeof item === "string" &&
          Boolean(item.trim()),
      )
    ) {
      rig[role] = target.map(
        (item) => item.trim(),
      );
      continue;
    }

    if (target !== undefined) {
      warnings.push(
        diagnostic(
          "INVALID_RIG_TARGET",
          `Rig role "${role}" has an invalid target and was omitted.`,
          `rig.${role}`,
        ),
      );
    }
  }

  return rig;
}

function normalizeAnimations(
  value: unknown,
  actorId: string,
  warnings: ActorDiagnostic[],
): ActorAnimationDefinition | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    warnings.push(
      diagnostic(
        "INVALID_ANIMATIONS",
        `Actor "${actorId}" has invalid animation data; it was omitted.`,
        "animations",
      ),
    );
    return undefined;
  }

  const {
    blink,
    ...futureAnimations
  } = value;

  if (blink === undefined) {
    return futureAnimations;
  }

  if (!isActorBlinkDefinition(blink)) {
    const error: ActorDiagnostic = {
      severity: "error",
      code:
        "INVALID_BLINK_DEFINITION",
      message: `Actor "${actorId}" has an invalid blink animation definition.`,
      path: "animations.blink",
    };

    throw new ActorDefinitionValidationError(
      error.message,
      [error],
    );
  }

  return {
    ...futureAnimations,
    blink,
  };
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

  const rig = normalizeRig(
    value.rig,
    warnings,
    id,
  );
  const animations =
    normalizeAnimations(
      value.animations,
      id,
      warnings,
    );

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
  delete futureDefinition.assets;
  delete futureDefinition.folders;
  delete futureDefinition.groups;
  delete futureDefinition.construction;
  delete futureDefinition.display;
  delete futureDefinition.rig;
  delete futureDefinition.animations;

  const definition: ActorDefinition = {
    ...futureDefinition,
    schemaVersion:
      ACTOR_SCHEMA_VERSION,
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
    assets: normalizeAssets(
      value.assets,
      normalizedLayers,
      assetBasePath,
      warnings,
    ),
    folders: normalizeFolders(
      value.folders,
      warnings,
    ),
    groups: normalizeGroups(
      value.groups,
      warnings,
    ),
    layers: sortActorLayers(
      normalizedLayers,
    ),
    rig,
    construction:
      normalizeConstruction(
        value.construction,
        warnings,
      ),
    ...(animations
      ? { animations }
      : {}),
  };

  warnings.push(
    ...assertActorDefinition(definition),
  );

  return {
    definition,
    warnings,
  };
}
