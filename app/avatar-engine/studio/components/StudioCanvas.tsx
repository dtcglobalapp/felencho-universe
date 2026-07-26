"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  STUDIO_GRID_SIZE,
  STUDIO_ZOOM_MAXIMUM,
  STUDIO_ZOOM_MINIMUM,
} from "../../config/ActorEditorConfig";
import {
  getEffectiveLayerState,
} from "../../domain/ActorHierarchy";
import {
  sortActorLayers,
} from "../../domain/ActorNormalizer";
import {
  applyActorMatrix,
  createActorTransformResolver,
  invertActorMatrix,
} from "../../domain/ActorTransformResolver";
import {
  renderActor,
} from "../../lib/ActorRenderer";

import type {
  ActorMatrix,
  ActorPoint,
} from "../../domain/ActorTransformResolver";
import type {
  ActorTransform,
  LoadedActor,
} from "../../types/Actor";

export interface StudioViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface StudioGuide {
  id: string;
  axis: "x" | "y";
  value: number;
}

interface StudioCanvasProps {
  actor: LoadedActor | null;
  selectedLayerIds: readonly string[];
  viewport: StudioViewportState;
  showGrid: boolean;
  showSafeArea: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  guides: readonly StudioGuide[];
  dimOthers: boolean;
  soloMode: boolean;
  onViewportChange: (
    viewport: StudioViewportState,
  ) => void;
  onCanvasSelect: (
    layerId: string,
    modifiers: {
      additive: boolean;
      range: boolean;
    },
  ) => readonly string[];
  onClearSelection: () => void;
  onBeginTransform: (
    label: string,
  ) => void;
  onMoveSelection: (
    layerIds: readonly string[],
    deltaX: number,
    deltaY: number,
  ) => boolean;
  onSetSelectionTransform: (
    layerIds: readonly string[],
    patch: Partial<ActorTransform>,
  ) => boolean;
  onEndTransform: (
    changed: boolean,
  ) => void;
  onDuplicateSelection: (
    layerIds: readonly string[],
  ) => readonly string[];
  onDropAsset: (
    assetPath: string,
    actorPoint: ActorPoint,
  ) => void;
  onGuidesChange: (
    guides: readonly StudioGuide[],
  ) => void;
}

interface ActorLayout {
  scale: number;
  originX: number;
  originY: number;
}

interface AlphaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionGeometry {
  layerId: string;
  editable: boolean;
  corners: [
    ActorPoint,
    ActorPoint,
    ActorPoint,
    ActorPoint,
  ];
  pivot: ActorPoint;
  rotationHandle: ActorPoint;
}

type PointerMode =
  | "none"
  | "move"
  | "pan"
  | "scale"
  | "rotate"
  | "guide-x"
  | "guide-y";

interface PointerInteraction {
  mode: PointerMode;
  pointerId: number | null;
  layerIds: string[];
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  appliedX: number;
  appliedY: number;
  startDistance: number;
  startAngle: number;
  startTransform:
    ActorTransform | null;
  changed: boolean;
  guideId: string | null;
}

const RULER_SIZE = 24;
const HANDLE_RADIUS = 9;

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

function calculateActorLayout(
  actor: LoadedActor,
  stageWidth: number,
  stageHeight: number,
  viewport: StudioViewportState,
): ActorLayout {
  const display = actor.definition.display;
  const configuredWidth =
    display.maxStageWidth > 0
      ? Math.min(
          stageWidth,
          display.maxStageWidth,
        )
      : stageWidth;
  const configuredHeight =
    display.maxStageHeight > 0
      ? Math.min(
          stageHeight,
          display.maxStageHeight,
        )
      : stageHeight;
  const fitScale = Math.min(
    configuredWidth /
      actor.definition.width,
    configuredHeight /
      actor.definition.height,
  );
  const scale =
    fitScale *
    display.scale *
    viewport.zoom;

  return {
    scale:
      Number.isFinite(scale) &&
      scale > 0
        ? scale
        : 1,
    originX:
      stageWidth / 2 -
      (
        actor.definition.width *
        scale
      ) /
        2 +
      display.offsetX +
      viewport.panX,
    originY:
      stageHeight / 2 -
      (
        actor.definition.height *
        scale
      ) /
        2 +
      display.offsetY +
      viewport.panY,
  };
}

function actorToStage(
  point: ActorPoint,
  layout: ActorLayout,
): ActorPoint {
  return {
    x:
      layout.originX +
      point.x * layout.scale,
    y:
      layout.originY +
      point.y * layout.scale,
  };
}

function stageToActor(
  point: ActorPoint,
  layout: ActorLayout,
): ActorPoint {
  return {
    x:
      (point.x - layout.originX) /
      layout.scale,
    y:
      (point.y - layout.originY) /
      layout.scale,
  };
}

function distance(
  first: ActorPoint,
  second: ActorPoint,
): number {
  return Math.hypot(
    second.x - first.x,
    second.y - first.y,
  );
}

function computeAlphaBounds(
  image: HTMLImageElement,
): AlphaBounds {
  const maximumSample = 900;
  const sampleScale = Math.min(
    1,
    maximumSample /
      Math.max(
        image.naturalWidth,
        image.naturalHeight,
      ),
  );
  const width = Math.max(
    1,
    Math.round(
      image.naturalWidth *
        sampleScale,
    ),
  );
  const height = Math.max(
    1,
    Math.round(
      image.naturalHeight *
        sampleScale,
    ),
  );
  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext(
    "2d",
    {
      willReadFrequently: true,
    },
  );

  if (!context) {
    return {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height,
  );

  const pixels = context.getImageData(
    0,
    0,
    width,
    height,
  ).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (
    let y = 0;
    y < height;
    y += 1
  ) {
    for (
      let x = 0;
      x < width;
      x += 1
    ) {
      if (
        (
          pixels[
            (y * width + x) * 4 +
              3
          ] ?? 0
        ) <= 12
      ) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  return {
    x: minX / sampleScale,
    y: minY / sampleScale,
    width:
      (maxX - minX + 1) /
      sampleScale,
    height:
      (maxY - minY + 1) /
      sampleScale,
  };
}

function buildSelectionGeometry(
  layerId: string,
  editable: boolean,
  matrix: ActorMatrix,
  bounds: AlphaBounds,
  pivot: ActorPoint,
  layout: ActorLayout,
): SelectionGeometry {
  const actorCorners:
    SelectionGeometry["corners"] = [
      applyActorMatrix(matrix, {
        x: bounds.x,
        y: bounds.y,
      }),
      applyActorMatrix(matrix, {
        x:
          bounds.x +
          bounds.width,
        y: bounds.y,
      }),
      applyActorMatrix(matrix, {
        x:
          bounds.x +
          bounds.width,
        y:
          bounds.y +
          bounds.height,
      }),
      applyActorMatrix(matrix, {
        x: bounds.x,
        y:
          bounds.y +
          bounds.height,
      }),
    ];
  const corners:
    SelectionGeometry["corners"] = [
      actorToStage(
        actorCorners[0],
        layout,
      ),
      actorToStage(
        actorCorners[1],
        layout,
      ),
      actorToStage(
        actorCorners[2],
        layout,
      ),
      actorToStage(
        actorCorners[3],
        layout,
      ),
    ];
  const topCenter = {
    x:
      (corners[0].x +
        corners[1].x) /
      2,
    y:
      (corners[0].y +
        corners[1].y) /
      2,
  };
  const center = {
    x:
      corners.reduce(
        (sum, point) =>
          sum + point.x,
        0,
      ) / 4,
    y:
      corners.reduce(
        (sum, point) =>
          sum + point.y,
        0,
      ) / 4,
  };
  const directionLength =
    Math.max(
      1,
      distance(center, topCenter),
    );

  return {
    layerId,
    editable,
    corners,
    pivot: actorToStage(
      applyActorMatrix(
        matrix,
        pivot,
      ),
      layout,
    ),
    rotationHandle: {
      x:
        topCenter.x +
        (
          (topCenter.x - center.x) /
          directionLength
        ) *
          26,
      y:
        topCenter.y +
        (
          (topCenter.y - center.y) /
          directionLength
        ) *
          26,
    },
  };
}

function drawSelection(
  context: CanvasRenderingContext2D,
  geometry: SelectionGeometry,
  primary: boolean,
): void {
  const [
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  ] = geometry.corners;

  context.save();
  context.strokeStyle = primary
    ? "#69dcff"
    : "rgba(105,220,255,0.7)";
  context.fillStyle = "#69dcff";
  context.lineWidth = primary ? 2 : 1;
  context.setLineDash(
    primary ? [] : [5, 4],
  );
  context.beginPath();
  context.moveTo(
    topLeft.x,
    topLeft.y,
  );
  context.lineTo(
    topRight.x,
    topRight.y,
  );
  context.lineTo(
    bottomRight.x,
    bottomRight.y,
  );
  context.lineTo(
    bottomLeft.x,
    bottomLeft.y,
  );
  context.closePath();
  context.stroke();
  context.setLineDash([]);

  if (primary && geometry.editable) {
    for (
      const point of geometry.corners
    ) {
      context.fillRect(
        point.x - 4,
        point.y - 4,
        8,
        8,
      );
    }

    const topCenter = {
      x:
        (topLeft.x + topRight.x) /
        2,
      y:
        (topLeft.y + topRight.y) /
        2,
    };

    context.beginPath();
    context.moveTo(
      topCenter.x,
      topCenter.y,
    );
    context.lineTo(
      geometry.rotationHandle.x,
      geometry.rotationHandle.y,
    );
    context.stroke();
    context.beginPath();
    context.arc(
      geometry.rotationHandle.x,
      geometry.rotationHandle.y,
      5,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.strokeStyle =
    "rgba(255,255,255,0.9)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(
    geometry.pivot.x,
    geometry.pivot.y,
    5,
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.beginPath();
  context.moveTo(
    geometry.pivot.x - 10,
    geometry.pivot.y,
  );
  context.lineTo(
    geometry.pivot.x + 10,
    geometry.pivot.y,
  );
  context.moveTo(
    geometry.pivot.x,
    geometry.pivot.y - 10,
  );
  context.lineTo(
    geometry.pivot.x,
    geometry.pivot.y + 10,
  );
  context.stroke();
  context.restore();
}

function hitTestImage(
  image: HTMLImageElement,
  localPoint: ActorPoint,
  context: CanvasRenderingContext2D,
): boolean {
  if (
    localPoint.x < 0 ||
    localPoint.y < 0 ||
    localPoint.x >=
      image.naturalWidth ||
    localPoint.y >=
      image.naturalHeight
  ) {
    return false;
  }

  context.clearRect(0, 0, 1, 1);
  context.drawImage(
    image,
    -Math.floor(localPoint.x),
    -Math.floor(localPoint.y),
  );

  return (
    context.getImageData(
      0,
      0,
      1,
      1,
    ).data[3] ?? 0
  ) > 20;
}

function initialPointer():
  PointerInteraction {
  return {
    mode: "none",
    pointerId: null,
    layerIds: [],
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    appliedX: 0,
    appliedY: 0,
    startDistance: 0,
    startAngle: 0,
    startTransform: null,
    changed: false,
    guideId: null,
  };
}

export default function StudioCanvas({
  actor,
  selectedLayerIds,
  viewport,
  showGrid,
  showSafeArea,
  showRulers,
  snapToGrid,
  guides,
  dimOthers,
  soloMode,
  onViewportChange,
  onCanvasSelect,
  onClearSelection,
  onBeginTransform,
  onMoveSelection,
  onSetSelectionTransform,
  onEndTransform,
  onDuplicateSelection,
  onDropAsset,
  onGuidesChange,
}: StudioCanvasProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );
  const actorRef = useRef(actor);
  const selectionRef = useRef([
    ...selectedLayerIds,
  ]);
  const viewportRef =
    useRef(viewport);
  const guidesRef = useRef([
    ...guides,
  ]);
  const spacePressedRef =
    useRef(false);
  const [
    spacePressed,
    setSpacePressed,
  ] = useState(false);
  const pointerRef =
    useRef<PointerInteraction>(
      initialPointer(),
    );
  const alphaBoundsRef = useRef(
    new WeakMap<
      HTMLImageElement,
      AlphaBounds
    >(),
  );
  const geometryRef = useRef<
    SelectionGeometry[]
  >([]);

  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  useEffect(() => {
    selectionRef.current = [
      ...selectedLayerIds,
    ];
  }, [selectedLayerIds]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    guidesRef.current = [
      ...guides,
    ];
  }, [guides]);

  useEffect(() => {
    const down = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target instanceof
        HTMLElement
          ? event.target
          : null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName ===
          "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (
        event.code === "Space" &&
        !typing
      ) {
        event.preventDefault();
        spacePressedRef.current =
          true;
        setSpacePressed(true);
      }
    };
    const up = (
      event: KeyboardEvent,
    ) => {
      if (event.code === "Space") {
        spacePressedRef.current =
          false;
        setSpacePressed(false);
      }
    };

    window.addEventListener(
      "keydown",
      down,
    );
    window.addEventListener(
      "keyup",
      up,
    );

    return () => {
      spacePressedRef.current =
        false;
      window.removeEventListener(
        "keydown",
        down,
      );
      window.removeEventListener(
        "keyup",
        up,
      );
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    let frame = 0;

    const resize = () => {
      const bounds =
        canvas.getBoundingClientRect();
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        2,
      );

      canvas.width = Math.max(
        1,
        Math.round(bounds.width * ratio),
      );
      canvas.height = Math.max(
        1,
        Math.round(
          bounds.height * ratio,
        ),
      );
      context.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0,
      );
      window.cancelAnimationFrame(
        frame,
      );
      frame =
        window.requestAnimationFrame(
          draw,
        );
    };

    const drawGrid = (
      width: number,
      height: number,
      layout: ActorLayout | null,
    ) => {
      if (!showGrid || !layout) {
        return;
      }

      const spacing =
        STUDIO_GRID_SIZE *
        layout.scale;

      if (spacing < 5) {
        return;
      }

      context.save();
      context.lineWidth = 1;
      let index = 0;

      for (
        let x =
          (
            layout.originX %
            spacing
          ) -
          spacing;
        x < width + spacing;
        x += spacing
      ) {
        context.strokeStyle =
          index % 5 === 0
            ? "rgba(60,210,255,0.17)"
            : "rgba(255,255,255,0.04)";
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(
          x + 0.5,
          height,
        );
        context.stroke();
        index += 1;
      }

      index = 0;

      for (
        let y =
          (
            layout.originY %
            spacing
          ) -
          spacing;
        y < height + spacing;
        y += spacing
      ) {
        context.strokeStyle =
          index % 5 === 0
            ? "rgba(60,210,255,0.17)"
            : "rgba(255,255,255,0.04)";
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(
          width,
          y + 0.5,
        );
        context.stroke();
        index += 1;
      }

      context.restore();
    };

    const drawSafeArea = (
      currentActor: LoadedActor,
      layout: ActorLayout,
    ) => {
      if (!showSafeArea) {
        return;
      }

      const insetX =
        currentActor.definition.width *
        0.05;
      const insetY =
        currentActor.definition.height *
        0.05;
      const topLeft = actorToStage(
        {
          x: insetX,
          y: insetY,
        },
        layout,
      );

      context.save();
      context.strokeStyle =
        "rgba(255,211,106,0.55)";
      context.setLineDash([8, 6]);
      context.strokeRect(
        topLeft.x,
        topLeft.y,
        (
          currentActor.definition
            .width -
          insetX * 2
        ) * layout.scale,
        (
          currentActor.definition
            .height -
          insetY * 2
        ) * layout.scale,
      );
      context.restore();
    };

    const drawGuides = (
      width: number,
      height: number,
      layout: ActorLayout,
    ) => {
      context.save();
      context.strokeStyle =
        "rgba(255,92,206,0.82)";
      context.lineWidth = 1;

      for (
        const guide of guidesRef.current
      ) {
        const point = actorToStage(
          guide.axis === "x"
            ? {
                x: guide.value,
                y: 0,
              }
            : {
                x: 0,
                y: guide.value,
              },
          layout,
        );

        context.beginPath();

        if (guide.axis === "x") {
          context.moveTo(point.x, 0);
          context.lineTo(
            point.x,
            height,
          );
        } else {
          context.moveTo(0, point.y);
          context.lineTo(
            width,
            point.y,
          );
        }

        context.stroke();
      }

      context.restore();
    };

    const drawRulers = (
      width: number,
      height: number,
      layout: ActorLayout,
    ) => {
      if (!showRulers) {
        return;
      }

      context.save();
      context.fillStyle =
        "rgba(4,9,12,0.94)";
      context.fillRect(
        0,
        0,
        width,
        RULER_SIZE,
      );
      context.fillRect(
        0,
        0,
        RULER_SIZE,
        height,
      );
      context.strokeStyle =
        "rgba(92,216,255,0.24)";
      context.fillStyle =
        "rgba(255,255,255,0.48)";
      context.font =
        "8px ui-monospace, monospace";
      const increment =
        layout.scale >= 0.5
          ? 100
          : layout.scale >= 0.1
            ? 500
            : 1000;
      const left =
        stageToActor(
          {
            x: RULER_SIZE,
            y: 0,
          },
          layout,
        ).x;
      const right =
        stageToActor(
          {
            x: width,
            y: 0,
          },
          layout,
        ).x;

      for (
        let value =
          Math.floor(left / increment) *
          increment;
        value <= right;
        value += increment
      ) {
        const point = actorToStage(
          {
            x: value,
            y: 0,
          },
          layout,
        );

        context.beginPath();
        context.moveTo(
          point.x,
          RULER_SIZE - 6,
        );
        context.lineTo(
          point.x,
          RULER_SIZE,
        );
        context.stroke();
        context.fillText(
          String(value),
          point.x + 2,
          9,
        );
      }

      const top =
        stageToActor(
          {
            x: 0,
            y: RULER_SIZE,
          },
          layout,
        ).y;
      const bottom =
        stageToActor(
          {
            x: 0,
            y: height,
          },
          layout,
        ).y;

      for (
        let value =
          Math.floor(top / increment) *
          increment;
        value <= bottom;
        value += increment
      ) {
        const point = actorToStage(
          {
            x: 0,
            y: value,
          },
          layout,
        );

        context.beginPath();
        context.moveTo(
          RULER_SIZE - 6,
          point.y,
        );
        context.lineTo(
          RULER_SIZE,
          point.y,
        );
        context.stroke();
        context.save();
        context.translate(
          8,
          point.y + 2,
        );
        context.rotate(
          -Math.PI / 2,
        );
        context.fillText(
          String(value),
          0,
          0,
        );
        context.restore();
      }

      context.restore();
    };

    const draw = () => {
      const bounds =
        canvas.getBoundingClientRect();
      const width = bounds.width;
      const height = bounds.height;
      const background =
        context.createRadialGradient(
          width / 2,
          height / 2,
          20,
          width / 2,
          height / 2,
          Math.max(width, height),
        );

      context.clearRect(
        0,
        0,
        width,
        height,
      );
      background.addColorStop(
        0,
        "#14232d",
      );
      background.addColorStop(
        0.5,
        "#080d12",
      );
      background.addColorStop(
        1,
        "#020304",
      );
      context.fillStyle = background;
      context.fillRect(
        0,
        0,
        width,
        height,
      );

      const currentActor =
        actorRef.current;
      const selectedIds =
        selectionRef.current;
      const layout = currentActor
        ? calculateActorLayout(
            currentActor,
            width,
            height,
            viewportRef.current,
          )
        : null;

      drawGrid(width, height, layout);

      if (currentActor && layout) {
        const selectedSet =
          new Set(selectedIds);
        const previewLayers =
          currentActor.definition.layers
            .filter((layer) => {
              if (
                soloMode &&
                selectedSet.size > 0
              ) {
                return selectedSet.has(
                  layer.id,
                );
              }

              return true;
            })
            .map((layer) => {
              if (
                selectedSet.size === 0 ||
                selectedSet.has(
                  layer.id,
                ) ||
                !dimOthers ||
                soloMode
              ) {
                return layer;
              }

              return {
                ...layer,
                opacity:
                  layer.opacity * 0.22,
              };
            });
        const previewActor: LoadedActor = {
          ...currentActor,
          definition: {
            ...currentActor.definition,
            layers: previewLayers,
            display: {
              ...currentActor.definition
                .display,
              scale:
                currentActor.definition
                  .display.scale *
                viewportRef.current.zoom,
              offsetX:
                currentActor.definition
                  .display.offsetX +
                viewportRef.current.panX,
              offsetY:
                currentActor.definition
                  .display.offsetY +
                viewportRef.current.panY,
            },
          },
        };

        renderActor(
          context,
          previewActor,
          {
            width,
            height,
          },
        );
        drawSafeArea(
          currentActor,
          layout,
        );
        drawGuides(
          width,
          height,
          layout,
        );

        const resolveTransform =
          createActorTransformResolver(
            currentActor.definition,
          );
        const geometries:
          SelectionGeometry[] = [];

        for (
          const layerId of selectedIds
        ) {
          const layer =
            currentActor.definition.layers.find(
              (item) =>
                item.id === layerId,
            );
          const image =
            currentActor.layerImages.get(
              layerId,
            );

          if (!layer || !image) {
            continue;
          }

          let alphaBounds =
            alphaBoundsRef.current.get(
              image,
            );

          if (!alphaBounds) {
            alphaBounds =
              computeAlphaBounds(image);
            alphaBoundsRef.current.set(
              image,
              alphaBounds,
            );
          }

          geometries.push(
            buildSelectionGeometry(
              layerId,
              !getEffectiveLayerState(
                currentActor.definition,
                layer,
              ).locked,
              resolveTransform(
                layerId,
              ),
              alphaBounds,
              {
                x:
                  layer.transform
                    .pivotX,
                y:
                  layer.transform
                    .pivotY,
              },
              layout,
            ),
          );
        }

        geometryRef.current =
          geometries;

        geometries.forEach(
          (geometry, index) =>
            drawSelection(
              context,
              geometry,
              index ===
                geometries.length - 1,
            ),
        );
        drawRulers(
          width,
          height,
          layout,
        );
      } else {
        geometryRef.current = [];
      }
    };

    const observer =
      new ResizeObserver(resize);

    observer.observe(canvas);
    resize();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [
    actor,
    dimOthers,
    guides,
    selectedLayerIds,
    showGrid,
    showRulers,
    showSafeArea,
    soloMode,
    viewport,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const hitCanvas =
      document.createElement("canvas");

    hitCanvas.width = 1;
    hitCanvas.height = 1;
    const hitContext =
      hitCanvas.getContext("2d", {
        willReadFrequently: true,
      });

    if (!hitContext) {
      return;
    }

    const pointFromEvent = (
      event:
        | PointerEvent
        | WheelEvent
        | DragEvent,
    ): ActorPoint => {
      const bounds =
        canvas.getBoundingClientRect();

      return {
        x:
          event.clientX -
          bounds.left,
        y:
          event.clientY -
          bounds.top,
      };
    };

    const findLayerAtPoint = (
      point: ActorPoint,
      currentActor: LoadedActor,
      layout: ActorLayout,
    ): string | null => {
      const actorPoint =
        stageToActor(point, layout);
      const resolveTransform =
        createActorTransformResolver(
          currentActor.definition,
        );
      const candidates =
        sortActorLayers(
          currentActor.definition.layers,
          "descending",
        );

      for (const layer of candidates) {
        if (
          !getEffectiveLayerState(
            currentActor.definition,
            layer,
          ).visible
        ) {
          continue;
        }

        const image =
          currentActor.layerImages.get(
            layer.id,
          );
        const inverse =
          invertActorMatrix(
            resolveTransform(layer.id),
          );

        if (!image || !inverse) {
          continue;
        }

        if (
          hitTestImage(
            image,
            applyActorMatrix(
              inverse,
              actorPoint,
            ),
            hitContext,
          )
        ) {
          return layer.id;
        }
      }

      return null;
    };

    const beginPointer = (
      event: PointerEvent,
      mode: PointerMode,
      layerIds: readonly string[],
      startTransform:
        ActorTransform | null = null,
      geometry:
        SelectionGeometry | null = null,
      guideId: string | null = null,
    ) => {
      const point =
        pointFromEvent(event);
      const center = geometry
        ? geometry.pivot
        : point;

      pointerRef.current = {
        mode,
        pointerId: event.pointerId,
        layerIds: [...layerIds],
        lastX: event.clientX,
        lastY: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        appliedX: 0,
        appliedY: 0,
        startDistance: distance(
          center,
          point,
        ),
        startAngle: Math.atan2(
          point.y - center.y,
          point.x - center.x,
        ),
        startTransform,
        changed: false,
        guideId,
      };

      canvas.setPointerCapture(
        event.pointerId,
      );
    };

    const pointerDown = (
      event: PointerEvent,
    ) => {
      const currentActor =
        actorRef.current;

      if (!currentActor) {
        return;
      }

      const bounds =
        canvas.getBoundingClientRect();
      const point =
        pointFromEvent(event);
      const layout =
        calculateActorLayout(
          currentActor,
          bounds.width,
          bounds.height,
          viewportRef.current,
        );

      if (
        spacePressedRef.current ||
        event.button === 1
      ) {
        beginPointer(
          event,
          "pan",
          [],
        );
        return;
      }

      if (
        showRulers &&
        point.x <= RULER_SIZE &&
        point.y > RULER_SIZE
      ) {
        const guideId =
          `guide-${Date.now()}-y`;
        const guide: StudioGuide = {
          id: guideId,
          axis: "y",
          value:
            stageToActor(
              point,
              layout,
            ).y,
        };
        const next = [
          ...guidesRef.current,
          guide,
        ];

        guidesRef.current = next;
        onGuidesChange(next);
        beginPointer(
          event,
          "guide-y",
          [],
          null,
          null,
          guideId,
        );
        return;
      }

      if (
        showRulers &&
        point.y <= RULER_SIZE &&
        point.x > RULER_SIZE
      ) {
        const guideId =
          `guide-${Date.now()}-x`;
        const guide: StudioGuide = {
          id: guideId,
          axis: "x",
          value:
            stageToActor(
              point,
              layout,
            ).x,
        };
        const next = [
          ...guidesRef.current,
          guide,
        ];

        guidesRef.current = next;
        onGuidesChange(next);
        beginPointer(
          event,
          "guide-x",
          [],
          null,
          null,
          guideId,
        );
        return;
      }

      const primaryGeometry =
        geometryRef.current.at(-1);
      const primaryLayer =
        primaryGeometry
          ? currentActor.definition.layers.find(
              (layer) =>
                layer.id ===
                primaryGeometry.layerId,
            )
          : undefined;

      if (
        primaryGeometry &&
        primaryGeometry.editable &&
        primaryLayer &&
        selectionRef.current.length ===
          1 &&
        distance(
          point,
          primaryGeometry
            .rotationHandle,
        ) <= HANDLE_RADIUS
      ) {
        onBeginTransform(
          "Rotate layer",
        );
        beginPointer(
          event,
          "rotate",
          [primaryLayer.id],
          {
            ...primaryLayer.transform,
          },
          primaryGeometry,
        );
        return;
      }

      if (
        primaryGeometry &&
        primaryGeometry.editable &&
        primaryLayer &&
        selectionRef.current.length ===
          1 &&
        primaryGeometry.corners.some(
          (corner) =>
            distance(point, corner) <=
            HANDLE_RADIUS,
        )
      ) {
        onBeginTransform(
          "Scale layer",
        );
        beginPointer(
          event,
          "scale",
          [primaryLayer.id],
          {
            ...primaryLayer.transform,
          },
          primaryGeometry,
        );
        return;
      }

      const hitLayerId =
        findLayerAtPoint(
          point,
          currentActor,
          layout,
        );

      if (!hitLayerId) {
        if (
          !event.metaKey &&
          !event.ctrlKey
        ) {
          onClearSelection();
        }
        return;
      }

      let layerIds =
        selectionRef.current;

      if (
        !layerIds.includes(
          hitLayerId,
        ) ||
        event.metaKey ||
        event.ctrlKey
      ) {
        layerIds = [
          ...onCanvasSelect(
            hitLayerId,
            {
              additive:
                event.metaKey ||
                event.ctrlKey,
              range: false,
            },
          ),
        ];
        selectionRef.current = [
          ...layerIds,
        ];
      }

      let transformStarted = false;

      if (event.altKey) {
        onBeginTransform(
          "Duplicate and move layers",
        );
        transformStarted = true;
        layerIds = [
          ...onDuplicateSelection(
            layerIds,
          ),
        ];
        selectionRef.current = [
          ...layerIds,
        ];
      }

      const editableIds = event.altKey
        ? [...layerIds]
        : layerIds.filter((id) => {
            const layer =
              currentActor.definition.layers.find(
                (item) =>
                  item.id === id,
              );

            return (
              layer &&
              !getEffectiveLayerState(
                currentActor.definition,
                layer,
              ).locked
            );
          });

      if (editableIds.length === 0) {
        return;
      }

      if (!transformStarted) {
        onBeginTransform(
          "Move layers",
        );
      }
      beginPointer(
        event,
        "move",
        editableIds,
      );
    };

    const pointerMove = (
      event: PointerEvent,
    ) => {
      const pointer =
        pointerRef.current;
      const currentActor =
        actorRef.current;

      if (
        pointer.mode === "none" ||
        pointer.pointerId !==
          event.pointerId ||
        !currentActor
      ) {
        return;
      }

      const bounds =
        canvas.getBoundingClientRect();
      const layout =
        calculateActorLayout(
          currentActor,
          bounds.width,
          bounds.height,
          viewportRef.current,
        );

      if (pointer.mode === "pan") {
        const next = {
          ...viewportRef.current,
          panX:
            viewportRef.current.panX +
            event.clientX -
            pointer.lastX,
          panY:
            viewportRef.current.panY +
            event.clientY -
            pointer.lastY,
        };

        viewportRef.current = next;
        onViewportChange(next);
        pointer.lastX = event.clientX;
        pointer.lastY = event.clientY;
        return;
      }

      if (
        pointer.mode === "guide-x" ||
        pointer.mode === "guide-y"
      ) {
        const guideId =
          pointer.guideId;

        if (!guideId) {
          return;
        }

        const actorPoint =
          stageToActor(
            pointFromEvent(event),
            layout,
          );
        const next =
          guidesRef.current.map(
            (guide) =>
              guide.id === guideId
                ? {
                    ...guide,
                    value:
                      pointer.mode ===
                      "guide-x"
                        ? actorPoint.x
                        : actorPoint.y,
                  }
                : guide,
          );

        guidesRef.current = next;
        onGuidesChange(next);
        return;
      }

      if (pointer.mode === "move") {
        let totalX =
          (event.clientX -
            pointer.startX) /
          layout.scale;
        let totalY =
          (event.clientY -
            pointer.startY) /
          layout.scale;

        if (snapToGrid) {
          totalX =
            Math.round(
              totalX /
                STUDIO_GRID_SIZE,
            ) * STUDIO_GRID_SIZE;
          totalY =
            Math.round(
              totalY /
                STUDIO_GRID_SIZE,
            ) * STUDIO_GRID_SIZE;
        }

        const deltaX =
          totalX - pointer.appliedX;
        const deltaY =
          totalY - pointer.appliedY;

        if (
          deltaX !== 0 ||
          deltaY !== 0
        ) {
          pointer.changed =
            onMoveSelection(
              pointer.layerIds,
              deltaX,
              deltaY,
            ) || pointer.changed;
          pointer.appliedX = totalX;
          pointer.appliedY = totalY;
        }
        return;
      }

      const geometry =
        geometryRef.current.find(
          (item) =>
            item.layerId ===
            pointer.layerIds[0],
        );
      const start =
        pointer.startTransform;

      if (!geometry || !start) {
        return;
      }

      const point =
        pointFromEvent(event);

      if (pointer.mode === "scale") {
        const nextDistance =
          distance(
            geometry.pivot,
            point,
          );
        const ratio =
          pointer.startDistance > 0
            ? nextDistance /
              pointer.startDistance
            : 1;

        pointer.changed =
          onSetSelectionTransform(
            pointer.layerIds,
            {
              scaleX:
                start.scaleX * ratio,
              scaleY:
                start.scaleY * ratio,
            },
          ) || pointer.changed;
      }

      if (pointer.mode === "rotate") {
        const angle = Math.atan2(
          point.y - geometry.pivot.y,
          point.x - geometry.pivot.x,
        );
        const degrees =
          (
            angle -
            pointer.startAngle
          ) *
          (180 / Math.PI);

        pointer.changed =
          onSetSelectionTransform(
            pointer.layerIds,
            {
              rotation:
                start.rotation +
                degrees,
            },
          ) || pointer.changed;
      }
    };

    const pointerEnd = (
      event: PointerEvent,
    ) => {
      const pointer =
        pointerRef.current;

      if (
        pointer.pointerId !==
        event.pointerId
      ) {
        return;
      }

      if (
        pointer.mode === "move" ||
        pointer.mode === "scale" ||
        pointer.mode === "rotate"
      ) {
        onEndTransform(
          pointer.changed,
        );
      }

      pointerRef.current =
        initialPointer();

      if (
        canvas.hasPointerCapture(
          event.pointerId,
        )
      ) {
        canvas.releasePointerCapture(
          event.pointerId,
        );
      }
    };

    const wheel = (
      event: WheelEvent,
    ) => {
      event.preventDefault();
      const currentActor =
        actorRef.current;

      if (!currentActor) {
        return;
      }

      const bounds =
        canvas.getBoundingClientRect();
      const cursor =
        pointFromEvent(event);
      const old =
        viewportRef.current;
      const oldLayout =
        calculateActorLayout(
          currentActor,
          bounds.width,
          bounds.height,
          old,
        );
      const actorPoint =
        stageToActor(
          cursor,
          oldLayout,
        );
      const zoom = clamp(
        old.zoom *
          Math.exp(
            -event.deltaY * 0.0015,
          ),
        STUDIO_ZOOM_MINIMUM,
        STUDIO_ZOOM_MAXIMUM,
      );
      const base =
        calculateActorLayout(
          currentActor,
          bounds.width,
          bounds.height,
          {
            zoom,
            panX: 0,
            panY: 0,
          },
        );
      const next = {
        zoom,
        panX:
          cursor.x -
          actorPoint.x * base.scale -
          base.originX,
        panY:
          cursor.y -
          actorPoint.y * base.scale -
          base.originY,
      };

      viewportRef.current = next;
      onViewportChange(next);
    };

    const dragOver = (
      event: DragEvent,
    ) => {
      if (
        event.dataTransfer?.types.includes(
          "application/x-genesis-asset",
        )
      ) {
        event.preventDefault();
        event.dataTransfer.dropEffect =
          "copy";
      }
    };

    const drop = (event: DragEvent) => {
      const assetPath =
        event.dataTransfer?.getData(
          "application/x-genesis-asset",
        );
      const currentActor =
        actorRef.current;

      if (!assetPath || !currentActor) {
        return;
      }

      event.preventDefault();
      const bounds =
        canvas.getBoundingClientRect();
      const layout =
        calculateActorLayout(
          currentActor,
          bounds.width,
          bounds.height,
          viewportRef.current,
        );

      onDropAsset(
        assetPath,
        stageToActor(
          pointFromEvent(event),
          layout,
        ),
      );
    };

    canvas.addEventListener(
      "pointerdown",
      pointerDown,
    );
    canvas.addEventListener(
      "pointermove",
      pointerMove,
    );
    canvas.addEventListener(
      "pointerup",
      pointerEnd,
    );
    canvas.addEventListener(
      "pointercancel",
      pointerEnd,
    );
    canvas.addEventListener(
      "wheel",
      wheel,
      {
        passive: false,
      },
    );
    canvas.addEventListener(
      "dragover",
      dragOver,
    );
    canvas.addEventListener(
      "drop",
      drop,
    );

    return () => {
      canvas.removeEventListener(
        "pointerdown",
        pointerDown,
      );
      canvas.removeEventListener(
        "pointermove",
        pointerMove,
      );
      canvas.removeEventListener(
        "pointerup",
        pointerEnd,
      );
      canvas.removeEventListener(
        "pointercancel",
        pointerEnd,
      );
      canvas.removeEventListener(
        "wheel",
        wheel,
      );
      canvas.removeEventListener(
        "dragover",
        dragOver,
      );
      canvas.removeEventListener(
        "drop",
        drop,
      );
    };
  }, [
    onBeginTransform,
    onCanvasSelect,
    onClearSelection,
    onDropAsset,
    onDuplicateSelection,
    onEndTransform,
    onGuidesChange,
    onMoveSelection,
    onSetSelectionTransform,
    onViewportChange,
    showRulers,
    snapToGrid,
  ]);

  const hasEditableSelection =
    actor
      ? selectedLayerIds.some(
          (layerId) => {
            const layer =
              actor.definition.layers.find(
                (item) =>
                  item.id === layerId,
              );

            return (
              layer &&
              !getEffectiveLayerState(
                actor.definition,
                layer,
              ).locked
            );
          },
        )
      : false;

  return (
    <canvas
      ref={canvasRef}
      aria-label="Genesis professional actor editing canvas"
      tabIndex={0}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        cursor: spacePressed
          ? "grab"
          : hasEditableSelection
            ? "move"
            : "crosshair",
        touchAction: "none",
      }}
    />
  );
}
