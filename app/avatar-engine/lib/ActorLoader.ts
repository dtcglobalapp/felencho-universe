import type {
  ActorBlinkDefinition,
  ActorDefinition,
  ActorLayerDefinition,
  LoadedActor,
} from "../types/Actor";

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isNonNegativeNumber(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= 0
  );
}

function isPositiveNumber(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value > 0
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

function isActorLayer(
  value: unknown,
): value is ActorLayerDefinition {
  if (!isRecord(value)) {
    return false;
  }

  const transform = value.transform;

  if (!isRecord(transform)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.image === "string" &&
    value.image.trim().length > 0 &&
    isFiniteNumber(value.zIndex) &&
    typeof value.visible === "boolean" &&
    isFiniteNumber(transform.x) &&
    isFiniteNumber(transform.y) &&
    isFiniteNumber(transform.rotation) &&
    isFiniteNumber(transform.scaleX) &&
    isFiniteNumber(transform.scaleY) &&
    isFiniteNumber(transform.opacity) &&
    isFiniteNumber(transform.pivotX) &&
    isFiniteNumber(transform.pivotY)
  );
}

function isActorBlinkDefinition(
  value: unknown,
): value is ActorBlinkDefinition {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.enabled === "boolean" &&
    isNonNegativeNumber(
      value.minimumDelayMs,
    ) &&
    isNonNegativeNumber(
      value.maximumDelayMs,
    ) &&
    value.maximumDelayMs >=
      value.minimumDelayMs &&
    isPositiveNumber(
      value.closeDurationMs,
    ) &&
    isNonNegativeNumber(
      value.holdDurationMs,
    ) &&
    isPositiveNumber(
      value.openDurationMs,
    ) &&
    isFiniteNumber(value.upperTravel) &&
    isFiniteNumber(value.lowerTravel) &&
    isFiniteNumber(value.upperScaleY) &&
    isFiniteNumber(value.lowerScaleY)
  );
}

function isActorAnimations(
  value: unknown,
): boolean {
  if (value === undefined) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  if (
    value.blink !== undefined &&
    !isActorBlinkDefinition(value.blink)
  ) {
    return false;
  }

  return true;
}

function isActorDefinition(
  value: unknown,
): value is ActorDefinition {
  if (!isRecord(value)) {
    return false;
  }

  const display = value.display;

  if (!isRecord(display)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.version === "string" &&
    value.version.trim().length > 0 &&
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.height) &&
    isPositiveNumber(value.fps) &&
    isFiniteNumber(display.scale) &&
    isFiniteNumber(display.offsetX) &&
    isFiniteNumber(display.offsetY) &&
    isPositiveNumber(
      display.maxStageWidth,
    ) &&
    isPositiveNumber(
      display.maxStageHeight,
    ) &&
    Array.isArray(value.layers) &&
    value.layers.every(isActorLayer) &&
    isRecord(value.rig) &&
    isActorAnimations(value.animations)
  );
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
            `No se pudo cargar la capa: ${source}`,
          ),
        );
      };

      image.src = source;
    },
  );
}

function validateUniqueLayerIds(
  layers: ActorLayerDefinition[],
  actorId: string,
): void {
  const identifiers = new Set<string>();

  for (const layer of layers) {
    if (identifiers.has(layer.id)) {
      throw new Error(
        `El actor ${actorId} contiene una capa duplicada: ${layer.id}`,
      );
    }

    identifiers.add(layer.id);
  }
}

async function loadLayerImage(
  definition: ActorLayerDefinition,
): Promise<
  readonly [string, HTMLImageElement]
> {
  const image = await loadImage(
    definition.image,
  );

  return [
    definition.id,
    image,
  ] as const;
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

  const definitionUrl =
    `/actors/${encodeURIComponent(
      normalizedActorId,
    )}/actor.json`;

  const response = await fetch(
    definitionUrl,
    {
      cache: "no-store",
    },
  );

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

  if (
    !isActorDefinition(
      rawDefinition,
    )
  ) {
    throw new Error(
      `La definición del actor ${normalizedActorId} no es válida.`,
    );
  }

  validateUniqueLayerIds(
    rawDefinition.layers,
    normalizedActorId,
  );

  const loadedLayerImages =
    await Promise.all(
      rawDefinition.layers.map(
        loadLayerImage,
      ),
    );

  return {
    definition:
      rawDefinition,

    layerImages: new Map(
      loadedLayerImages,
    ),
  };
}
