import type {
  ActorBlinkDefinition,
  ActorDefinition,
  ActorDiagnostic,
  ActorLayerDefinition,
  ActorTransform,
} from "./ActorDefinition";

import {
  ACTOR_SCHEMA_VERSION,
} from "./ActorDefinition";
import {
  GENESIS_BLEND_MODES,
} from "../config/ActorEditorConfig";
import {
  inspectActorHierarchy,
} from "./ActorHierarchy";

export interface ActorValidationResult {
  errors: ActorDiagnostic[];
  warnings: ActorDiagnostic[];
}

export class ActorDefinitionValidationError extends Error {
  public readonly diagnostics: readonly ActorDiagnostic[];

  public constructor(
    message: string,
    diagnostics: readonly ActorDiagnostic[],
  ) {
    super(message);
    this.name = "ActorDefinitionValidationError";
    this.diagnostics = diagnostics;
  }
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function isActorBlinkDefinition(
  value: unknown,
): value is ActorBlinkDefinition {
  return (
    isRecord(value) &&
    typeof value.enabled ===
      "boolean" &&
    isFiniteNumber(
      value.minimumDelayMs,
    ) &&
    value.minimumDelayMs >= 0 &&
    isFiniteNumber(
      value.maximumDelayMs,
    ) &&
    value.maximumDelayMs >=
      value.minimumDelayMs &&
    isFiniteNumber(
      value.closeDurationMs,
    ) &&
    value.closeDurationMs > 0 &&
    isFiniteNumber(
      value.holdDurationMs,
    ) &&
    value.holdDurationMs >= 0 &&
    isFiniteNumber(
      value.openDurationMs,
    ) &&
    value.openDurationMs > 0 &&
    isFiniteNumber(
      value.upperTravel,
    ) &&
    isFiniteNumber(
      value.lowerTravel,
    ) &&
    isFiniteNumber(
      value.upperScaleY,
    ) &&
    isFiniteNumber(
      value.lowerScaleY,
    )
  );
}

function validateLayer(
  layer: ActorLayerDefinition,
  index: number,
): ActorValidationResult {
  const errors: ActorDiagnostic[] = [];
  const warnings: ActorDiagnostic[] = [];
  const path = `layers[${index}]`;

  if (!layer.id.trim()) {
    errors.push({
      severity: "error",
      code: "MISSING_LAYER_ID",
      message: `Layer at position ${index + 1} has no stable ID.`,
      path: `${path}.id`,
    });
  }

  if (!layer.name.trim()) {
    errors.push({
      severity: "error",
      code: "MISSING_LAYER_NAME",
      message: `Layer "${layer.id}" has no readable name.`,
      path: `${path}.name`,
      layerId: layer.id,
    });
  }

  if (!layer.asset.trim()) {
    warnings.push({
      severity: "warning",
      code: "MISSING_LAYER_ASSET",
      message: `Layer "${layer.name}" does not declare an asset path.`,
      path: `${path}.asset`,
      layerId: layer.id,
    });
  }

  if (layer.type !== "image") {
    warnings.push({
      severity: "warning",
      code: "UNSUPPORTED_LAYER_TYPE",
      message: `Layer "${layer.name}" uses unsupported type "${layer.type}".`,
      path: `${path}.type`,
      layerId: layer.id,
    });
  }

  if (
    !isFiniteNumber(layer.opacity) ||
    layer.opacity < 0 ||
    layer.opacity > 1
  ) {
    errors.push({
      severity: "error",
      code: "INVALID_OPACITY",
      message: `Layer "${layer.name}" has an invalid normalized opacity.`,
      path: `${path}.opacity`,
      layerId: layer.id,
    });
  }

  if (!isFiniteNumber(layer.zIndex)) {
    errors.push({
      severity: "error",
      code: "INVALID_Z_INDEX",
      message: `Layer "${layer.name}" has an invalid z-index.`,
      path: `${path}.zIndex`,
      layerId: layer.id,
    });
  }

  if (
    !GENESIS_BLEND_MODES.includes(
      layer.blendMode,
    )
  ) {
    errors.push({
      severity: "error",
      code: "UNSUPPORTED_BLEND_MODE",
      message: `Layer "${layer.name}" uses unsupported blend mode "${layer.blendMode}".`,
      path: `${path}.blendMode`,
      layerId: layer.id,
    });
  }

  const transformEntries = [
    ["x", layer.transform.x],
    ["y", layer.transform.y],
    [
      "rotation",
      layer.transform.rotation,
    ],
    ["scaleX", layer.transform.scaleX],
    ["scaleY", layer.transform.scaleY],
    ["pivotX", layer.transform.pivotX],
    ["pivotY", layer.transform.pivotY],
  ] as const;

  for (const [key, value] of transformEntries) {
    if (!isFiniteNumber(value)) {
      errors.push({
        severity: "error",
        code: "INVALID_TRANSFORM",
        message: `Layer "${layer.name}" has an invalid ${key} transform value.`,
        path: `${path}.transform.${key}`,
        layerId: layer.id,
      });
    }
  }

  return {
    errors,
    warnings,
  };
}

function validateTransform(
  transform: ActorTransform,
  path: string,
  label: string,
): ActorDiagnostic[] {
  const errors: ActorDiagnostic[] = [];

  for (
    const [key, value] of
    Object.entries(transform)
  ) {
    if (!isFiniteNumber(value)) {
      errors.push({
        severity: "error",
        code: "INVALID_TRANSFORM",
        message: `${label} has an invalid ${key} transform value.`,
        path: `${path}.${key}`,
      });
    }
  }

  return errors;
}

export function validateActorDefinition(
  definition: ActorDefinition,
): ActorValidationResult {
  const errors: ActorDiagnostic[] = [];
  const warnings: ActorDiagnostic[] = [];

  if (
    definition.schemaVersion !==
    ACTOR_SCHEMA_VERSION
  ) {
    errors.push({
      severity: "error",
      code: "UNSUPPORTED_SCHEMA_VERSION",
      message: `Actor "${definition.id}" uses unsupported normalized schema version "${definition.schemaVersion}".`,
      path: "schemaVersion",
    });
  }

  if (!definition.id.trim()) {
    errors.push({
      severity: "error",
      code: "MISSING_ACTOR_ID",
      message: "The actor definition has no stable ID.",
      path: "id",
    });
  }

  if (!definition.name.trim()) {
    errors.push({
      severity: "error",
      code: "MISSING_ACTOR_NAME",
      message: "The actor definition has no readable name.",
      path: "name",
    });
  }

  if (
    !isFiniteNumber(definition.width) ||
    definition.width <= 0 ||
    !isFiniteNumber(definition.height) ||
    definition.height <= 0
  ) {
    errors.push({
      severity: "error",
      code: "INVALID_ACTOR_DIMENSIONS",
      message:
        "Actor width and height must be positive finite numbers.",
      path: "width",
    });
  }

  const displayValues = [
    [
      "scale",
      definition.display.scale,
    ],
    [
      "offsetX",
      definition.display.offsetX,
    ],
    [
      "offsetY",
      definition.display.offsetY,
    ],
    [
      "maxStageWidth",
      definition.display
        .maxStageWidth,
    ],
    [
      "maxStageHeight",
      definition.display
        .maxStageHeight,
    ],
  ] as const;

  for (
    const [key, value] of displayValues
  ) {
    if (!isFiniteNumber(value)) {
      errors.push({
        severity: "error",
        code: "INVALID_DISPLAY",
        message: `Actor "${definition.id}" has an invalid display.${key} value.`,
        path: `display.${key}`,
      });
    }
  }

  if (
    definition.display.scale <= 0 ||
    definition.display.maxStageWidth <=
      0 ||
    definition.display.maxStageHeight <=
      0
  ) {
    errors.push({
      severity: "error",
      code: "INVALID_DISPLAY",
      message:
        "Actor display scale and maximum dimensions must be positive.",
      path: "display",
    });
  }

  const blink =
    definition.animations?.blink;

  if (blink !== undefined) {
    if (
      !isActorBlinkDefinition(
        blink,
      )
    ) {
      errors.push({
        severity: "error",
        code:
          "INVALID_BLINK_DEFINITION",
        message: `Actor "${definition.id}" has an invalid blink animation definition.`,
        path: "animations.blink",
      });
    }
  }

  if (
    !isFiniteNumber(definition.fps) ||
    definition.fps <= 0
  ) {
    errors.push({
      severity: "error",
      code: "INVALID_ACTOR_FPS",
      message:
        "Actor FPS must be a positive finite number.",
      path: "fps",
    });
  }

  const identifiers = new Set<string>();
  const groupIdentifiers =
    new Set<string>();
  const layerIdentifiers =
    new Set<string>();
  const folderIdentifiers =
    new Set<string>();
  const assetPaths = new Set<string>();

  definition.assets.forEach(
    (asset, index) => {
      if (!asset.path.trim()) {
        errors.push({
          severity: "error",
          code: "INVALID_ASSET",
          message: `Asset at position ${index + 1} has no path.`,
          path: `assets[${index}].path`,
        });
      }

      if (
        asset.mediaType !==
        "image/png"
      ) {
        errors.push({
          severity: "error",
          code: "UNSUPPORTED_ASSET_TYPE",
          message: `Asset "${asset.name}" is not a supported PNG asset.`,
          path: `assets[${index}].mediaType`,
        });
      }

      if (assetPaths.has(asset.path)) {
        errors.push({
          severity: "error",
          code: "DUPLICATE_ASSET_PATH",
          message: `Actor "${definition.id}" contains duplicate asset path "${asset.path}".`,
          path: `assets[${index}].path`,
        });
      }

      assetPaths.add(asset.path);
    },
  );

  definition.folders.forEach(
    (folder, index) => {
      if (!folder.id.trim()) {
        errors.push({
          severity: "error",
          code: "INVALID_FOLDER",
          message: `Folder at position ${index + 1} has no stable ID.`,
          path: `folders[${index}].id`,
        });
      }

      if (
        folderIdentifiers.has(
          folder.id,
        )
      ) {
        errors.push({
          severity: "error",
          code: "DUPLICATE_FOLDER_ID",
          message: `Actor "${definition.id}" contains duplicate folder ID "${folder.id}".`,
          path: `folders[${index}].id`,
        });
      }

      folderIdentifiers.add(
        folder.id,
      );
    },
  );

  definition.folders.forEach(
    (folder, index) => {
      if (
        folder.parentId &&
        !folderIdentifiers.has(
          folder.parentId,
        )
      ) {
        warnings.push({
          severity: "warning",
          code: "MISSING_FOLDER_PARENT",
          message: `Folder "${folder.name}" references missing parent folder "${folder.parentId}".`,
          path: `folders[${index}].parentId`,
        });
      }
    },
  );

  definition.groups.forEach(
    (group, index) => {
      if (!group.id.trim()) {
        errors.push({
          severity: "error",
          code: "INVALID_GROUP",
          message: `Group at position ${index + 1} has no stable ID.`,
          path: `groups[${index}].id`,
        });
      }

      if (identifiers.has(group.id)) {
        errors.push({
          severity: "error",
          code: "DUPLICATE_NODE_ID",
          message: `Actor "${definition.id}" contains duplicate node ID "${group.id}".`,
          path: `groups[${index}].id`,
        });
      }

      identifiers.add(group.id);
      groupIdentifiers.add(group.id);
      errors.push(
        ...validateTransform(
          group.transform,
          `groups[${index}].transform`,
          `Group "${group.name}"`,
        ),
      );
    },
  );

  definition.layers.forEach((layer, index) => {
    const result = validateLayer(layer, index);

    errors.push(...result.errors);
    warnings.push(...result.warnings);

    if (identifiers.has(layer.id)) {
      const duplicateGroup =
        groupIdentifiers.has(layer.id);

      errors.push({
        severity: "error",
        code: duplicateGroup
          ? "DUPLICATE_NODE_ID"
          : "DUPLICATE_LAYER_ID",
        message: duplicateGroup
          ? `Actor "${definition.id}" contains duplicate layer or group ID "${layer.id}".`
          : `Actor "${definition.id}" contains duplicate layer ID "${layer.id}".`,
        path: `layers[${index}].id`,
        layerId: layer.id,
      });
    }

    identifiers.add(layer.id);
    layerIdentifiers.add(layer.id);

    if (
      layer.folderId &&
      !folderIdentifiers.has(
        layer.folderId,
      )
    ) {
      warnings.push({
        severity: "warning",
        code: "MISSING_LAYER_FOLDER",
        message: `Layer "${layer.name}" references missing folder "${layer.folderId}".`,
        path: `layers[${index}].folderId`,
        layerId: layer.id,
      });
    }

    if (
      layer.asset &&
      !assetPaths.has(layer.asset)
    ) {
      warnings.push({
        severity: "warning",
        code: "UNDECLARED_LAYER_ASSET",
        message: `Layer "${layer.name}" references an asset missing from the asset manifest.`,
        path: `layers[${index}].asset`,
        layerId: layer.id,
      });
    }
  });

  for (
    const issue of
    inspectActorHierarchy(definition)
  ) {
    errors.push({
      severity: "error",
      code: issue.code,
      message:
        issue.code === "SELF_PARENT"
          ? `Node "${issue.nodeId}" cannot be its own parent.`
          : issue.code ===
              "MISSING_PARENT"
            ? `Node "${issue.nodeId}" references missing parent "${issue.parentId}".`
            : `Actor hierarchy contains a cycle: ${issue.path.join(" → ")}.`,
      path:
        issue.path.length > 0
          ? issue.path.join(".")
          : issue.nodeId,
      layerId: definition.layers.some(
        (layer) =>
          layer.id === issue.nodeId,
      )
        ? issue.nodeId
        : undefined,
    });
  }

  for (
    const [role, targets] of Object.entries(
      definition.rig,
    )
  ) {
    const targetIds = Array.isArray(targets)
      ? targets
      : typeof targets === "string"
        ? [targets]
        : [];

    for (const targetId of targetIds) {
      if (
        !layerIdentifiers.has(targetId)
      ) {
        warnings.push({
          severity: "warning",
          code: "MISSING_RIG_TARGET",
          message: `Rig role "${role}" references missing layer "${targetId}".`,
          path: `rig.${role}`,
          layerId: targetId,
        });
      }
    }
  }

  for (
    const pose of
    definition.construction
      .requiredMouthPoses
  ) {
    const layerId =
      definition.construction
        .mouthPoses[pose];

    if (
      !layerId ||
      !layerIdentifiers.has(layerId)
    ) {
      warnings.push({
        severity: "warning",
        code:
          "MISSING_REQUIRED_MOUTH_POSE",
        message: `Required mouth pose "${pose}" is not mapped to an existing layer.`,
        path: `construction.mouthPoses.${pose}`,
        layerId,
      });
    }
  }

  for (
    const [pose, layerId] of
    Object.entries(
      definition.construction
        .mouthPoses,
    )
  ) {
    if (
      layerId &&
      !layerIdentifiers.has(layerId)
    ) {
      warnings.push({
        severity: "warning",
        code:
          "MISSING_MOUTH_POSE_TARGET",
        message: `Mouth pose "${pose}" references missing layer "${layerId}".`,
        path: `construction.mouthPoses.${pose}`,
        layerId,
      });
    }
  }

  if (definition.layers.length === 0) {
    warnings.push({
      severity: "warning",
      code: "EMPTY_LAYER_COLLECTION",
      message: `Actor "${definition.name}" contains no layers.`,
      path: "layers",
    });
  }

  return {
    errors,
    warnings,
  };
}

export function assertActorDefinition(
  definition: ActorDefinition,
): ActorDiagnostic[] {
  const result =
    validateActorDefinition(definition);

  if (result.errors.length > 0) {
    throw new ActorDefinitionValidationError(
      `Actor "${definition.id || "unknown"}" failed validation: ${result.errors[0].message}`,
      result.errors,
    );
  }

  return result.warnings;
}
