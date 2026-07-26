import {
  normalizeActorDefinition,
} from "../domain/ActorNormalizer";
import {
  resolveActorAssets,
} from "./ActorAssetResolver";

import type {
  LoadedActor,
} from "../types/Actor";
import type {
  ActorAssetRepository,
} from "./ActorAssetRepository";

export async function loadActor(
  actorId: string,
  repository?: ActorAssetRepository,
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

    throw new Error(
      `No se pudo solicitar ${definitionUrl}: ${technicalMessage}`,
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

  const resolved =
    await resolveActorAssets(
      normalized.definition,
      repository,
    );

  return {
    definition:
      normalized.definition,
    layerImages:
      resolved.layerImages,
    assetImages:
      resolved.assetImages,
    assetUrls: resolved.assetUrls,
    diagnostics: [
      ...normalized.warnings,
      ...resolved.diagnostics,
    ],
    objectUrls: resolved.objectUrls,
  };
}
