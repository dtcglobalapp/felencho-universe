import type {
  ActorRuntimeState,
  LoadedActor,
} from "../types/Actor";

export interface ActorStageMetrics {
  width: number;
  height: number;
}

const DEFAULT_RUNTIME_STATE: ActorRuntimeState = {
  eyeX: 0,
  eyeY: 0,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function renderActor(
  context: CanvasRenderingContext2D,
  actor: LoadedActor,
  stage: ActorStageMetrics,
  runtime: ActorRuntimeState = DEFAULT_RUNTIME_STATE,
): void {
  const { definition, layers } = actor;

  const maximumWidth =
    stage.width * definition.display.maxStageWidth;

  const maximumHeight =
    stage.height * definition.display.maxStageHeight;

  const fitScale = Math.min(
    maximumWidth / definition.width,
    maximumHeight / definition.height,
  );

  const actorScale =
    fitScale * definition.display.scale;

  const actorOriginX =
    stage.width / 2 -
    (definition.width * actorScale) / 2 +
    definition.display.offsetX;

  const actorOriginY =
    stage.height / 2 -
    (definition.height * actorScale) / 2 +
    definition.display.offsetY;

  const normalizedEyeX = clamp(runtime.eyeX, -1, 1);
  const normalizedEyeY = clamp(runtime.eyeY, -1, 1);

  const maximumPupilMovementX = 34;
  const maximumPupilMovementY = 22;

  for (const layer of layers) {
    const { definition: layerDefinition, image } =
      layer;

    const transform = layerDefinition.transform;

    const isPupil =
      layerDefinition.id ===
        definition.rig.leftPupil ||
      layerDefinition.id ===
        definition.rig.rightPupil;

    const runtimeOffsetX = isPupil
      ? normalizedEyeX * maximumPupilMovementX
      : 0;

    const runtimeOffsetY = isPupil
      ? normalizedEyeY * maximumPupilMovementY
      : 0;

    context.save();

    context.globalAlpha = clamp(
      transform.opacity,
      0,
      1,
    );

    const pivotStageX =
      actorOriginX +
      (
        transform.pivotX +
        transform.x +
        runtimeOffsetX
      ) *
        actorScale;

    const pivotStageY =
      actorOriginY +
      (
        transform.pivotY +
        transform.y +
        runtimeOffsetY
      ) *
        actorScale;

    context.translate(
      pivotStageX,
      pivotStageY,
    );

    context.rotate(
      (transform.rotation * Math.PI) / 180,
    );

    context.scale(
      actorScale * transform.scaleX,
      actorScale * transform.scaleY,
    );

    context.drawImage(
      image,
      -transform.pivotX,
      -transform.pivotY,
    );

    context.restore();
  }
}
