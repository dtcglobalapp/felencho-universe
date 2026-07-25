import {
  normalizeActorDefinition,
} from "../domain/ActorNormalizer";

import type {
  ActorDiagnostic,
  ActorLayerDefinition,
  LoadedActor,
} from "../types/Actor";

interface LoadedLayerImage {
  id: string;
  image?: HTMLImageElement;
  diagnostic?: ActorDiagnostic;
}

function loadImage(
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

async function loadLayerImage(
  layer: ActorLayerDefinition,
): Promise<LoadedLayerImage> {
  if (layer.type !== "image") {
    return {
      id: layer.id,
    };
  }

  if (!layer.asset) {
    return {
      id: layer.id,
    };
  }

  try {
    return {
      id: layer.id,
      image: await loadImage(layer.asset),
    };
  } catch (error: unknown) {
    const technicalMessage =
      error instanceof Error
        ? error.message
        : "Error de recurso desconocido.";

    console.warn(
      `[Genesis ActorLoader] ${technicalMessage}`,
      {
        layerId: layer.id,
        asset: layer.asset,
      },
    );

    return {
      id: layer.id,
      diagnostic: {
        severity: "warning",
        code: "LAYER_ASSET_LOAD_FAILED",
        message: `No se pudo cargar el recurso de la capa "${layer.name}".`,
        path: layer.asset,
        layerId: layer.id,
      },
    };
  }
}

export async function loadActor(
  actorId: string,
): Promise<LoadedActor> {
  const normalizedActorId =
    actorId.trim();

  if (!normalizedActorId) {
    throw new Error(
      "El identificador del actor está vacío.",
    );
  }

  const encodedActorId =
    encodeURIComponent(normalizedActorId);

  const definitionUrl =
    `/actors/${encodedActorId}/actor.json`;

  let response: Response;

  try {
    response = await fetch(
      definitionUrl,
      {
        cache: "no-store",
      },
    );
  } catch (error: unknown) {
    const technicalMessage =
      error instanceof Error
        ? error.message
        : "Error de red desconocido.";

    console.error(
      `[Genesis ActorLoader] ${technicalMessage}`,
    );

    throw new Error(
      `No se pudo solicitar ${definitionUrl}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${definitionUrl}: HTTP ${response.status}`,
    );
  }

  let rawDefinition: unknown;

  try {
    rawDefinition =
      await response.json();
  } catch {
    throw new Error(
      `El archivo ${definitionUrl} no contiene JSON válido.`,
    );
  }

  const normalized =
    normalizeActorDefinition(
      rawDefinition,
      {
        sourceActorId:
          normalizedActorId,
        assetBasePath:
          `/actors/${encodedActorId}/`,
      },
    );

  const layerResults =
    await Promise.all(
      normalized.definition.layers.map(
        loadLayerImage,
      ),
    );

  const layerImages = new Map<
    string,
    HTMLImageElement
  >();

  const diagnostics = [
    ...normalized.warnings,
  ];

  for (const result of layerResults) {
    if (result.image) {
      layerImages.set(
        result.id,
        result.image,
      );
    }

    if (result.diagnostic) {
      diagnostics.push(
        result.diagnostic,
      );
    }
  }

  return {
    definition:
      normalized.definition,
    layerImages,
    diagnostics,
  };
}
