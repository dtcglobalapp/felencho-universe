import type {
  ActorDefinition,
  ActorDiagnostic,
  ActorLayerDefinition,
} from "./ActorDefinition";

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

export function validateActorDefinition(
  definition: ActorDefinition,
): ActorValidationResult {
  const errors: ActorDiagnostic[] = [];
  const warnings: ActorDiagnostic[] = [];

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
    const rawBlink: unknown = blink;

    const blinkIsValid =
      isRecord(rawBlink) &&
      typeof rawBlink.enabled ===
        "boolean" &&
      isFiniteNumber(
        rawBlink.minimumDelayMs,
      ) &&
      rawBlink.minimumDelayMs >= 0 &&
      isFiniteNumber(
        rawBlink.maximumDelayMs,
      ) &&
      rawBlink.maximumDelayMs >=
        rawBlink.minimumDelayMs &&
      isFiniteNumber(
        rawBlink.closeDurationMs,
      ) &&
      rawBlink.closeDurationMs > 0 &&
      isFiniteNumber(
        rawBlink.holdDurationMs,
      ) &&
      rawBlink.holdDurationMs >= 0 &&
      isFiniteNumber(
        rawBlink.openDurationMs,
      ) &&
      rawBlink.openDurationMs > 0 &&
      isFiniteNumber(
        rawBlink.upperTravel,
      ) &&
      isFiniteNumber(
        rawBlink.lowerTravel,
      ) &&
      isFiniteNumber(
        rawBlink.upperScaleY,
      ) &&
      isFiniteNumber(
        rawBlink.lowerScaleY,
      );

    if (!blinkIsValid) {
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

  definition.layers.forEach((layer, index) => {
    const result = validateLayer(layer, index);

    errors.push(...result.errors);
    warnings.push(...result.warnings);

    if (identifiers.has(layer.id)) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_LAYER_ID",
        message: `Actor "${definition.id}" contains duplicate layer ID "${layer.id}".`,
        path: `layers[${index}].id`,
        layerId: layer.id,
      });
    }

    identifiers.add(layer.id);
  });

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
      if (!identifiers.has(targetId)) {
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
