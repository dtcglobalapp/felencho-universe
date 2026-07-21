import type {
  ActorDefinition,
  ActorLayerDefinition,
  LoadedActor,
  LoadedActorLayer,
} from "../types/Actor";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isActorLayer(value: unknown): value is ActorLayerDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const layer = value as Record<string, unknown>;
  const transform = layer.transform as
    | Record<string, unknown>
    | undefined;

  return (
    typeof layer.id === "string" &&
    typeof layer.name === "string" &&
    typeof layer.image === "string" &&
    isFiniteNumber(layer.zIndex) &&
    typeof layer.visible === "boolean" &&
    Boolean(transform) &&
    isFiniteNumber(transform?.x) &&
    isFiniteNumber(transform?.y) &&
    isFiniteNumber(transform?.rotation) &&
    isFiniteNumber(transform?.scaleX) &&
    isFiniteNumber(transform?.scaleY) &&
    isFiniteNumber(transform?.opacity) &&
    isFiniteNumber(transform?.pivotX) &&
    isFiniteNumber(transform?.pivotY)
  );
}

function isActorDefinition(value: unknown): value is ActorDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const actor = value as Record<string, unknown>;
  const display = actor.display as
    | Record<string, unknown>
    | undefined;

  return (
    typeof actor.id === "string" &&
    typeof actor.name === "string" &&
    typeof actor.version === "string" &&
    isFiniteNumber(actor.width) &&
    isFiniteNumber(actor.height) &&
    isFiniteNumber(actor.fps) &&
    Boolean(display) &&
    isFiniteNumber(display?.scale) &&
    isFiniteNumber(display?.offsetX) &&
    isFiniteNumber(display?.offsetY) &&
    isFiniteNumber(display?.maxStageWidth) &&
    isFiniteNumber(display?.maxStageHeight) &&
    Array.isArray(actor.layers) &&
    actor.layers.every(isActorLayer) &&
    Boolean(actor.rig) &&
    typeof actor.rig === "object"
  );
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error(`No se pudo cargar la capa: ${source}`));
    };

    image.src = source;
  });
}

export async function loadActor(
  actorId: string,
): Promise<LoadedActor> {
  const definitionUrl = `/actors/${actorId}/actor.json`;

  const response = await fetch(definitionUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${definitionUrl}: HTTP ${response.status}`,
    );
  }

  const rawDefinition: unknown = await response.json();

  if (!isActorDefinition(rawDefinition)) {
    throw new Error(
      `La definición del actor ${actorId} no es válida.`,
    );
  }

  const visibleLayers = rawDefinition.layers
    .filter((layer) => layer.visible)
    .sort((first, second) => first.zIndex - second.zIndex);

  const loadedLayers: LoadedActorLayer[] =
    await Promise.all(
      visibleLayers.map(async (definition) => ({
        definition,
        image: await loadImage(definition.image),
      })),
    );

  return {
    definition: rawDefinition,
    layers: loadedLayers,
  };
}
