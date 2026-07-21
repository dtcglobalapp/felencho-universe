import type { LoadedActor } from "../types/Actor";

export interface ActorStageMetrics {
  width: number;
  height: number;
}

export function renderActor(
  context: CanvasRenderingContext2D,
  actor: LoadedActor,
  stage: ActorStageMetrics,
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

  for (const layer of layers) {
    const { definition: layerDefinition, image } = layer;
    const transform = layerDefinition.transform;

    context.save();

    context.globalAlpha = Math.max(
      0,
      Math.min(1, transform.opacity),
    );

    const pivotStageX =
      actorOriginX +
      (transform.pivotX + transform.x) * actorScale;

    const pivotStageY =
      actorOriginY +
      (transform.pivotY + transform.y) * actorScale;

    context.translate(pivotStageX, pivotStageY);

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
