import type {
  ActorDefinition,
  ActorDiagnosticSeverity,
} from "../../domain/ActorDefinition";

export type StudioDiagnosticArea =
  | "asset"
  | "performance"
  | "package";

export interface StudioDiagnostic {
  area: StudioDiagnosticArea;
  severity: ActorDiagnosticSeverity;
  code: string;
  message: string;
  assetPath?: string;
  layerId?: string;
}

export interface StudioPerformanceMetrics {
  layerCount: number;
  assetCount: number;
  knownSourceBytes: number;
  estimatedDecodedBytes: number;
  declaredPixels: number;
  maximumTextureWidth: number;
  maximumTextureHeight: number;
}

export interface StudioDiagnosticsResult {
  diagnostics: StudioDiagnostic[];
  performance:
    StudioPerformanceMetrics;
  packageReady: boolean;
}

function formatMiB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export function diagnoseStudioActor(
  definition: ActorDefinition,
  availableAssetPaths:
    ReadonlySet<string>,
  structuralErrorCount = 0,
): StudioDiagnosticsResult {
  const diagnostics:
    StudioDiagnostic[] = [];
  const usedPaths = new Set(
    definition.layers
      .map((layer) => layer.asset)
      .filter(Boolean),
  );
  let knownSourceBytes = 0;
  let estimatedDecodedBytes = 0;
  let declaredPixels = 0;
  let maximumTextureWidth = 0;
  let maximumTextureHeight = 0;

  for (const asset of definition.assets) {
    const width = asset.width ?? 0;
    const height = asset.height ?? 0;
    const pixels = width * height;

    knownSourceBytes +=
      asset.byteLength ?? 0;
    declaredPixels += pixels;
    estimatedDecodedBytes +=
      pixels * 4;
    maximumTextureWidth = Math.max(
      maximumTextureWidth,
      width,
    );
    maximumTextureHeight = Math.max(
      maximumTextureHeight,
      height,
    );

    if (
      !availableAssetPaths.has(
        asset.path,
      )
    ) {
      diagnostics.push({
        area: "asset",
        severity: "error",
        code: "ASSET_UNAVAILABLE",
        message: `${asset.name} is declared but unavailable.`,
        assetPath: asset.path,
      });
    }

    if (!width || !height) {
      diagnostics.push({
        area: "asset",
        severity: "warning",
        code:
          "ASSET_DIMENSIONS_UNKNOWN",
        message: `${asset.name} has no recorded dimensions.`,
        assetPath: asset.path,
      });
    }

    if (!usedPaths.has(asset.path)) {
      diagnostics.push({
        area: "asset",
        severity: "warning",
        code: "UNUSED_ASSET",
        message: `${asset.name} is not used by any layer.`,
        assetPath: asset.path,
      });
    }

    if (width > 4096 || height > 4096) {
      diagnostics.push({
        area: "performance",
        severity: "warning",
        code: "OVERSIZED_TEXTURE",
        message: `${asset.name} is ${width}×${height}; validate it on target hardware.`,
        assetPath: asset.path,
      });
    }

    if (
      width >= definition.width &&
      height >= definition.height &&
      definition.layers.length > 12
    ) {
      diagnostics.push({
        area: "performance",
        severity: "warning",
        code: "FULL_CANVAS_ASSET",
        message: `${asset.name} occupies the full actor canvas. Crop transparent padding when possible.`,
        assetPath: asset.path,
      });
    }
  }

  for (const layer of definition.layers) {
    if (
      layer.asset &&
      !definition.assets.some(
        (asset) =>
          asset.path === layer.asset,
      )
    ) {
      diagnostics.push({
        area: "package",
        severity: "error",
        code:
          "UNDECLARED_LAYER_ASSET",
        message: `${layer.name} references an asset that is not declared in the package.`,
        layerId: layer.id,
        assetPath: layer.asset,
      });
    }

    if (
      !layer.metadata
        ?.semanticRole
    ) {
      diagnostics.push({
        area: "package",
        severity: "error",
        code:
          "MISSING_SEMANTIC_ROLE",
        message: `${layer.name} has no semantic role.`,
        layerId: layer.id,
      });
    }
  }

  for (const role of
    definition.construction
      .requiredRoles) {
    const target =
      definition.rig[role];

    if (
      !target ||
      (
        Array.isArray(target) &&
        target.length === 0
      )
    ) {
      diagnostics.push({
        area: "package",
        severity: "error",
        code:
          "REQUIRED_RIG_ROLE_UNMAPPED",
        message: `Required rig role "${role}" is not mapped.`,
      });
    }
  }

  for (const pose of
    definition.construction
      .requiredMouthPoses) {
    if (
      !definition.construction
        .mouthPoses[pose]
    ) {
      diagnostics.push({
        area: "package",
        severity: "error",
        code:
          "REQUIRED_MOUTH_POSE_UNMAPPED",
        message: `Required mouth pose "${pose}" is not mapped.`,
      });
    }
  }

  if (
    estimatedDecodedBytes >
    512 * 1024 * 1024
  ) {
    diagnostics.push({
      area: "performance",
      severity: "error",
      code:
        "EXCESSIVE_DECODED_MEMORY",
      message: `Estimated decoded texture memory is ${formatMiB(estimatedDecodedBytes)}.`,
    });
  } else if (
    estimatedDecodedBytes >
    256 * 1024 * 1024
  ) {
    diagnostics.push({
      area: "performance",
      severity: "warning",
      code: "HIGH_DECODED_MEMORY",
      message: `Estimated decoded texture memory is ${formatMiB(estimatedDecodedBytes)}.`,
    });
  }

  if (definition.layers.length > 100) {
    diagnostics.push({
      area: "performance",
      severity: "warning",
      code: "HIGH_LAYER_COUNT",
      message: `${definition.layers.length} layers may require runtime optimization.`,
    });
  }

  if (structuralErrorCount > 0) {
    diagnostics.push({
      area: "package",
      severity: "error",
      code:
        "STRUCTURAL_ERRORS_PRESENT",
      message: `${structuralErrorCount} structural error${structuralErrorCount === 1 ? "" : "s"} must be resolved before release.`,
    });
  }

  const packageReady =
    diagnostics.every(
      (item) =>
        item.severity !== "error",
    ) &&
    structuralErrorCount === 0;

  if (packageReady) {
    diagnostics.push({
      area: "package",
      severity: "warning",
      code: "PACKAGE_PREFLIGHT_READY",
      message:
        "Package preflight passed. Warnings should still be reviewed on target hardware.",
    });
  }

  return {
    diagnostics,
    performance: {
      layerCount:
        definition.layers.length,
      assetCount:
        definition.assets.length,
      knownSourceBytes,
      estimatedDecodedBytes,
      declaredPixels,
      maximumTextureWidth,
      maximumTextureHeight,
    },
    packageReady,
  };
}
