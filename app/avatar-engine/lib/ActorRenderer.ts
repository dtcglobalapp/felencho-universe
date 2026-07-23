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

  blinkLeft: 0,
  blinkRight: 0,

  eyebrowLeft: 0,
  eyebrowRight: 0,

  jawOpen: 0,

  smile: 0,
  sadness: 0,
  anger: 0,
  surprise: 0,

  headX: 0,
  headY: 0,
  headRotation: 0,

  bodyOffsetY: 0,
  bodyScale: 1,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function interpolate(
  start: number,
  end: number,
  amount: number,
): number {
  return start + (end - start) * amount;
}

export function renderActor(
  context: CanvasRenderingContext2D,
  actor: LoadedActor,
  stage: ActorStageMetrics,
  runtime: ActorRuntimeState =
    DEFAULT_RUNTIME_STATE,
): void {
  const { definition, layers } = actor;

  const maximumWidth =
    stage.width *
    definition.display.maxStageWidth;

  const maximumHeight =
    stage.height *
    definition.display.maxStageHeight;

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

  const normalizedEyeX = clamp(
    runtime.eyeX,
    -1,
    1,
  );

  const normalizedEyeY = clamp(
    runtime.eyeY,
    -1,
    1,
  );

  const blinkLeft = clamp(
    runtime.blinkLeft,
    0,
    1,
  );

  const blinkRight = clamp(
    runtime.blinkRight,
    0,
    1,
  );

  const maximumPupilMovementX = 34;
  const maximumPupilMovementY = 22;

  const blinkDefinition =
    definition.animations?.blink;

  const actorCenterX =
    actorOriginX +
    (definition.width * actorScale) / 2;

  const actorCenterY =
    actorOriginY +
    (definition.height * actorScale) / 2;

  context.save();

  context.translate(
    actorCenterX +
      runtime.headX * actorScale,
    actorCenterY +
      (runtime.headY +
        runtime.bodyOffsetY) *
        actorScale,
  );

  context.rotate(
    (runtime.headRotation * Math.PI) /
      180,
  );

  const bodyScale = clamp(
    runtime.bodyScale,
    0.95,
    1.05,
  );

  context.scale(bodyScale, bodyScale);

  context.translate(
    -actorCenterX,
    -actorCenterY,
  );

  for (const layer of layers) {
    const {
      definition: layerDefinition,
      image,
    } = layer;

    const transform =
      layerDefinition.transform;

    const isLeftPupil =
      layerDefinition.id ===
      definition.rig.leftPupil;

    const isRightPupil =
      layerDefinition.id ===
      definition.rig.rightPupil;

    const isPupil =
      isLeftPupil || isRightPupil;

    const isLeftUpperEyelid =
      layerDefinition.id ===
      definition.rig.leftUpperEyelid;

    const isRightUpperEyelid =
      layerDefinition.id ===
      definition.rig.rightUpperEyelid;

    const isLeftLowerEyelid =
      layerDefinition.id ===
      definition.rig.leftLowerEyelid;

    const isRightLowerEyelid =
      layerDefinition.id ===
      definition.rig.rightLowerEyelid;

    const blinkAmount =
      isLeftUpperEyelid ||
      isLeftLowerEyelid
        ? blinkLeft
        : isRightUpperEyelid ||
            isRightLowerEyelid
          ? blinkRight
          : 0;

    const runtimeOffsetX = isPupil
      ? normalizedEyeX *
        maximumPupilMovementX
      : 0;

    let runtimeOffsetY = isPupil
      ? normalizedEyeY *
        maximumPupilMovementY
      : 0;

    let runtimeScaleY = 1;

    if (
      blinkDefinition &&
      (isLeftUpperEyelid ||
        isRightUpperEyelid)
    ) {
      runtimeOffsetY +=
        blinkDefinition.upperTravel *
        blinkAmount;

      runtimeScaleY = interpolate(
        1,
        blinkDefinition.upperScaleY,
        blinkAmount,
      );
    }

    if (
      blinkDefinition &&
      (isLeftLowerEyelid ||
        isRightLowerEyelid)
    ) {
      runtimeOffsetY +=
        blinkDefinition.lowerTravel *
        blinkAmount;

      runtimeScaleY = interpolate(
        1,
        blinkDefinition.lowerScaleY,
        blinkAmount,
      );
    }

    context.save();

    context.globalAlpha = clamp(
      transform.opacity,
      0,
      1,
    );

    const layerX =
      actorOriginX +
      (transform.x + runtimeOffsetX) *
        actorScale;

    const layerY =
      actorOriginY +
      (transform.y + runtimeOffsetY) *
        actorScale;

    context.translate(layerX, layerY);

    context.rotate(
      (transform.rotation * Math.PI) /
        180,
    );

    context.scale(
      actorScale * transform.scaleX,
      actorScale *
        transform.scaleY *
        runtimeScaleY,
    );

    context.drawImage(image, 0, 0);

    context.restore();
  }

  context.restore();
}