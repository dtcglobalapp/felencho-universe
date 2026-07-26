import type {
  ActorDefinition,
  ActorDiagnostic,
} from "../domain/ActorDefinition";
import type {
  ActorAssetRepository,
} from "./ActorAssetRepository";

export interface ResolvedActorAssets {
  layerImages: Map<
    string,
    HTMLImageElement
  >;
  assetImages: Map<
    string,
    HTMLImageElement
  >;
  assetUrls: Map<string, string>;
  diagnostics: ActorDiagnostic[];
  objectUrls: string[];
}

export function loadActorImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.decoding = "async";

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            `No se pudo cargar el recurso "${source}".`,
          ),
        );
      };

      image.src = source;
    },
  );
}

export async function resolveActorAssets(
  definition: ActorDefinition,
  repository?: ActorAssetRepository,
): Promise<ResolvedActorAssets> {
  const assetImages = new Map<
    string,
    HTMLImageElement
  >();
  const assetUrls =
    new Map<string, string>();
  const diagnostics: ActorDiagnostic[] =
    [];
  const objectUrls: string[] = [];
  const assetDefinitions = new Map(
    definition.assets.map((asset) => [
      asset.path,
      asset,
    ]),
  );
  const uniquePaths = [
    ...new Set(
      [
        ...definition.assets.map(
          (asset) => asset.path,
        ),
        ...definition.layers.map(
          (layer) => layer.asset,
        ),
      ]
        .filter(Boolean),
    ),
  ];

  await Promise.all(
    uniquePaths.map(async (path) => {
      const asset =
        assetDefinitions.get(path);
      let source = path;
      let objectUrl:
        string | null = null;

      if (
        repository &&
        asset &&
        asset?.source !== "bundled"
      ) {
        try {
          const blob =
            await repository.getAssetBlob(
              definition.id,
              path,
            );

          if (blob) {
            source =
              URL.createObjectURL(blob);
            objectUrl = source;
          } else {
            diagnostics.push({
              severity: "warning",
              code:
                "LOCAL_ASSET_MISSING",
              message: `El recurso local "${asset.name}" no está disponible en este navegador.`,
              path,
            });
            return;
          }
        } catch (error: unknown) {
          diagnostics.push({
            severity: "warning",
            code:
              "ASSET_STORAGE_UNAVAILABLE",
            message:
              error instanceof Error
                ? error.message
                : `No se pudo leer el recurso local "${path}".`,
            path,
          });
          return;
        }
      }

      try {
        const image =
          await loadActorImage(source);

        assetImages.set(path, image);
        assetUrls.set(path, source);
        if (objectUrl) {
          objectUrls.push(objectUrl);
        }
      } catch {
        if (objectUrl) {
          URL.revokeObjectURL(
            objectUrl,
          );
        }

        diagnostics.push({
          severity: "warning",
          code:
            "LAYER_ASSET_LOAD_FAILED",
          message: `No se pudo cargar el recurso "${asset?.name ?? path}".`,
          path,
        });
      }
    }),
  );

  const layerImages = new Map<
    string,
    HTMLImageElement
  >();

  for (const layer of definition.layers) {
    const image =
      assetImages.get(layer.asset);

    if (image) {
      layerImages.set(layer.id, image);
    } else if (
      layer.type === "image" &&
      layer.asset
    ) {
      const diagnostic =
        diagnostics.find(
          (item) =>
            item.path ===
            layer.asset,
        );

      if (diagnostic) {
        diagnostic.layerId ??=
          layer.id;
      }
    }
  }

  return {
    layerImages,
    assetImages,
    assetUrls,
    diagnostics,
    objectUrls,
  };
}
