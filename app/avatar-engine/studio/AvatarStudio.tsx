"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CSSProperties,
  ReactNode,
} from "react";

import { loadActor } from "../lib/ActorLoader";
import { renderActor } from "../lib/ActorRenderer";

import type {
  LoadedActor,
} from "../types/Actor";

const ACTOR_ID = "Bob";
const STORAGE_KEY = "felencho-avatar-studio:bob:draft";
const HISTORY_LIMIT = 100;

type ActorDefinition = LoadedActor["definition"];
type ActorLayer = ActorDefinition["layers"][number];

interface Point {
  x: number;
  y: number;
}

interface ActorLayout {
  scale: number;
  originX: number;
  originY: number;
}

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

interface PointerState {
  dragging: boolean;
  pointerId: number | null;
  lastX: number;
  lastY: number;
}

interface AlphaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionGeometry {
  corners: [Point, Point, Point, Point];
  center: Point;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function cloneDefinition(
  definition: ActorDefinition,
): ActorDefinition {
  return JSON.parse(
    JSON.stringify(definition),
  ) as ActorDefinition;
}

function restoreActorDefinition(
  actor: LoadedActor,
  definition: ActorDefinition,
): LoadedActor {
  const layerMap = new Map(
    definition.layers.map((layer) => [
      layer.id,
      layer,
    ]),
  );

  return {
    definition: cloneDefinition(definition),

    layers: actor.layers.map((loadedLayer) => ({
      ...loadedLayer,

      definition:
        layerMap.get(loadedLayer.definition.id) ??
        loadedLayer.definition,
    })),
  };
}

function applyStoredDefinition(
  actor: LoadedActor,
): LoadedActor {
  try {
    const stored = window.localStorage.getItem(
      STORAGE_KEY,
    );

    if (!stored) {
      return actor;
    }

    const parsed = JSON.parse(stored) as ActorDefinition;

    if (!parsed || !Array.isArray(parsed.layers)) {
      return actor;
    }

    const storedLayers = new Map(
      parsed.layers.map((layer) => [
        layer.id,
        layer,
      ]),
    );

    const definition: ActorDefinition = {
      ...actor.definition,
      ...parsed,

      layers: actor.definition.layers.map(
        (layer) =>
          storedLayers.get(layer.id) ?? layer,
      ),
    };

    return restoreActorDefinition(actor, definition);
  } catch {
    return actor;
  }
}

function synchronizeActorLayer(
  actor: LoadedActor,
  layerId: string,
  update: (layer: ActorLayer) => ActorLayer,
): LoadedActor {
  const nextDefinitionLayers =
    actor.definition.layers.map((layer) =>
      layer.id === layerId
        ? update(layer)
        : layer,
    );

  const nextLoadedLayers = actor.layers.map(
    (loadedLayer) =>
      loadedLayer.definition.id === layerId
        ? {
            ...loadedLayer,

            definition: update(
              loadedLayer.definition,
            ),
          }
        : loadedLayer,
  );

  return {
    definition: {
      ...actor.definition,
      layers: nextDefinitionLayers,
    },

    layers: nextLoadedLayers,
  };
}

function calculateActorLayout(
  actor: LoadedActor,
  stageWidth: number,
  stageHeight: number,
  viewport: ViewportState,
): ActorLayout {
  const display = actor.definition.display;

  const configuredWidth = display.maxStageWidth;
  const configuredHeight = display.maxStageHeight;

  const availableWidth =
    configuredWidth <= 2
      ? stageWidth * configuredWidth
      : Math.min(stageWidth, configuredWidth);

  const availableHeight =
    configuredHeight <= 2
      ? stageHeight * configuredHeight
      : Math.min(stageHeight, configuredHeight);

  const fitScale = Math.min(
    availableWidth / actor.definition.width,
    availableHeight / actor.definition.height,
  );

  const calculatedScale =
    fitScale *
    display.scale *
    viewport.zoom;

  const scale =
    Number.isFinite(calculatedScale) &&
    calculatedScale > 0
      ? calculatedScale
      : 1;

  return {
    scale,

    originX:
      stageWidth / 2 -
      (actor.definition.width * scale) / 2 +
      display.offsetX +
      viewport.panX,

    originY:
      stageHeight / 2 -
      (actor.definition.height * scale) / 2 +
      display.offsetY +
      viewport.panY,
  };
}

function rotatePoint(
  point: Point,
  angleRadians: number,
): Point {
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);

  return {
    x:
      point.x * cosine -
      point.y * sine,

    y:
      point.x * sine +
      point.y * cosine,
  };
}

function localToStage(
  localPoint: Point,
  layer: ActorLayer,
  layout: ActorLayout,
): Point {
  const transform = layer.transform;

  const scaledPoint = {
    x:
      localPoint.x *
      layout.scale *
      transform.scaleX,

    y:
      localPoint.y *
      layout.scale *
      transform.scaleY,
  };

  const rotated = rotatePoint(
    scaledPoint,
    (transform.rotation * Math.PI) / 180,
  );

  return {
    x:
      layout.originX +
      transform.x * layout.scale +
      rotated.x,

    y:
      layout.originY +
      transform.y * layout.scale +
      rotated.y,
  };
}

function stageToLocal(
  stagePoint: Point,
  layer: ActorLayer,
  layout: ActorLayout,
): Point | null {
  const transform = layer.transform;

  const scaleX =
    layout.scale * transform.scaleX;

  const scaleY =
    layout.scale * transform.scaleY;

  if (
    Math.abs(scaleX) < 0.000001 ||
    Math.abs(scaleY) < 0.000001
  ) {
    return null;
  }

  const translated = {
    x:
      stagePoint.x -
      layout.originX -
      transform.x * layout.scale,

    y:
      stagePoint.y -
      layout.originY -
      transform.y * layout.scale,
  };

  const unrotated = rotatePoint(
    translated,
    (-transform.rotation * Math.PI) / 180,
  );

  return {
    x: unrotated.x / scaleX,
    y: unrotated.y / scaleY,
  };
}

function hitTestImageAlpha(
  image: HTMLImageElement,
  x: number,
  y: number,
  context: CanvasRenderingContext2D,
): boolean {
  if (
    x < 0 ||
    y < 0 ||
    x >= image.naturalWidth ||
    y >= image.naturalHeight
  ) {
    return false;
  }

  context.clearRect(0, 0, 1, 1);

  context.drawImage(
    image,
    -Math.floor(x),
    -Math.floor(y),
  );

  const alpha = context.getImageData(
    0,
    0,
    1,
    1,
  ).data[3];

  return alpha > 20;
}

function findLayerAtPoint(
  actor: LoadedActor,
  stagePoint: Point,
  layout: ActorLayout,
  hitContext: CanvasRenderingContext2D,
): string | null {
  const candidates = [...actor.layers]
    .filter(
      (loadedLayer) =>
        loadedLayer.definition.visible &&
        loadedLayer.definition.transform.opacity > 0,
    )
    .sort(
      (first, second) =>
        second.definition.zIndex -
        first.definition.zIndex,
    );

  for (const loadedLayer of candidates) {
    const localPoint = stageToLocal(
      stagePoint,
      loadedLayer.definition,
      layout,
    );

    if (!localPoint) {
      continue;
    }

    if (
      hitTestImageAlpha(
        loadedLayer.image,
        localPoint.x,
        localPoint.y,
        hitContext,
      )
    ) {
      return loadedLayer.definition.id;
    }
  }

  return null;
}

function computeAlphaBounds(
  image: HTMLImageElement,
): AlphaBounds {
  const maximumSampleSize = 900;

  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  const sampleScale = Math.min(
    1,
    maximumSampleSize /
      Math.max(sourceWidth, sourceHeight),
  );

  const width = Math.max(
    1,
    Math.round(sourceWidth * sampleScale),
  );

  const height = Math.max(
    1,
    Math.round(sourceHeight * sampleScale),
  );

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    return {
      x: 0,
      y: 0,
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(
    0,
    0,
    width,
    height,
  ).data;

  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha =
        pixels[(y * width + x) * 4 + 3];

      if (alpha <= 12) {
        continue;
      }

      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }

  if (
    maximumX < minimumX ||
    maximumY < minimumY
  ) {
    return {
      x: 0,
      y: 0,
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  const inverseScale = 1 / sampleScale;

  return {
    x: minimumX * inverseScale,
    y: minimumY * inverseScale,

    width:
      (maximumX - minimumX + 1) *
      inverseScale,

    height:
      (maximumY - minimumY + 1) *
      inverseScale,
  };
}

function buildSelectionGeometry(
  layer: ActorLayer,
  bounds: AlphaBounds,
  layout: ActorLayout,
): SelectionGeometry {
  const topLeft = localToStage(
    {
      x: bounds.x,
      y: bounds.y,
    },
    layer,
    layout,
  );

  const topRight = localToStage(
    {
      x: bounds.x + bounds.width,
      y: bounds.y,
    },
    layer,
    layout,
  );

  const bottomRight = localToStage(
    {
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height,
    },
    layer,
    layout,
  );

  const bottomLeft = localToStage(
    {
      x: bounds.x,
      y: bounds.y + bounds.height,
    },
    layer,
    layout,
  );

  return {
    corners: [
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    ],

    center: localToStage(
      {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      },
      layer,
      layout,
    ),
  };
}

function drawSelectionGeometry(
  context: CanvasRenderingContext2D,
  geometry: SelectionGeometry,
): void {
  const [
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  ] = geometry.corners;

  context.save();

  context.strokeStyle = "#69dcff";
  context.fillStyle = "#69dcff";
  context.lineWidth = 2;
  context.setLineDash([7, 5]);

  context.beginPath();
  context.moveTo(topLeft.x, topLeft.y);
  context.lineTo(topRight.x, topRight.y);
  context.lineTo(bottomRight.x, bottomRight.y);
  context.lineTo(bottomLeft.x, bottomLeft.y);
  context.closePath();
  context.stroke();

  context.setLineDash([]);

  for (const point of geometry.corners) {
    context.beginPath();

    context.rect(
      point.x - 4,
      point.y - 4,
      8,
      8,
    );

    context.fill();
  }

  context.beginPath();

  context.arc(
    geometry.center.x,
    geometry.center.y,
    5,
    0,
    Math.PI * 2,
  );

  context.fill();

  context.strokeStyle =
    "rgba(255,255,255,0.85)";

  context.lineWidth = 1;

  context.beginPath();

  context.moveTo(
    geometry.center.x - 13,
    geometry.center.y,
  );

  context.lineTo(
    geometry.center.x + 13,
    geometry.center.y,
  );

  context.moveTo(
    geometry.center.x,
    geometry.center.y - 13,
  );

  context.lineTo(
    geometry.center.x,
    geometry.center.y + 13,
  );

  context.stroke();
  context.restore();
}

export default function AvatarStudio() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const actorRef =
    useRef<LoadedActor | null>(null);

  const selectedLayerIdRef =
    useRef<string | null>(null);

  const viewportRef = useRef<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const soloModeRef = useRef(false);
  const dimOthersRef = useRef(true);

  const alphaBoundsCacheRef = useRef<
    Map<string, AlphaBounds>
  >(new Map());

  const pointerRef = useRef<PointerState>({
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  });

  const historyPastRef = useRef<
    ActorDefinition[]
  >([]);

  const historyFutureRef = useRef<
    ActorDefinition[]
  >([]);

  const [actor, setActor] =
    useState<LoadedActor | null>(null);

  const [
    selectedLayerId,
    setSelectedLayerId,
  ] = useState<string | null>(null);

  const [status, setStatus] = useState(
    "Cargando a Bob...",
  );

  const [viewport, setViewport] =
    useState<ViewportState>({
      zoom: 1,
      panX: 0,
      panY: 0,
    });

  const [showGrid, setShowGrid] =
    useState(true);

  const [soloMode, setSoloMode] =
    useState(false);

  const [dimOthers, setDimOthers] =
    useState(true);

  const [savedAt, setSavedAt] =
    useState<string | null>(null);

  const [historyVersion, setHistoryVersion] =
    useState(0);

  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  useEffect(() => {
    selectedLayerIdRef.current =
      selectedLayerId;
  }, [selectedLayerId]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    soloModeRef.current = soloMode;
  }, [soloMode]);

  useEffect(() => {
    dimOthersRef.current = dimOthers;
  }, [dimOthers]);

  const refreshHistoryState = useCallback(() => {
    setHistoryVersion((value) => value + 1);
  }, []);

  const pushHistorySnapshot = useCallback(
    (definition: ActorDefinition) => {
      historyPastRef.current = [
        ...historyPastRef.current,
        cloneDefinition(definition),
      ].slice(-HISTORY_LIMIT);

      historyFutureRef.current = [];
      refreshHistoryState();
    },
    [refreshHistoryState],
  );

  const undo = useCallback(() => {
    const currentActor = actorRef.current;

    if (
      !currentActor ||
      historyPastRef.current.length === 0
    ) {
      setStatus("No hay cambios para deshacer");
      return;
    }

    const previous =
      historyPastRef.current[
        historyPastRef.current.length - 1
      ];

    historyPastRef.current =
      historyPastRef.current.slice(0, -1);

    historyFutureRef.current = [
      cloneDefinition(currentActor.definition),
      ...historyFutureRef.current,
    ].slice(0, HISTORY_LIMIT);

    const restored = restoreActorDefinition(
      currentActor,
      previous,
    );

    actorRef.current = restored;
    setActor(restored);
    refreshHistoryState();

    setStatus("Cambio deshecho");
  }, [refreshHistoryState]);

  const redo = useCallback(() => {
    const currentActor = actorRef.current;

    if (
      !currentActor ||
      historyFutureRef.current.length === 0
    ) {
      setStatus("No hay cambios para rehacer");
      return;
    }

    const next = historyFutureRef.current[0];

    historyFutureRef.current =
      historyFutureRef.current.slice(1);

    historyPastRef.current = [
      ...historyPastRef.current,
      cloneDefinition(currentActor.definition),
    ].slice(-HISTORY_LIMIT);

    const restored = restoreActorDefinition(
      currentActor,
      next,
    );

    actorRef.current = restored;
    setActor(restored);
    refreshHistoryState();

    setStatus("Cambio rehecho");
  }, [refreshHistoryState]);

  const updateLayer = useCallback(
    (
      layerId: string,
      update: (layer: ActorLayer) => ActorLayer,
      recordHistory = true,
    ) => {
      setActor((current) => {
        if (!current) {
          return current;
        }

        if (recordHistory) {
          pushHistorySnapshot(current.definition);
        }

        const nextActor = synchronizeActorLayer(
          current,
          layerId,
          update,
        );

        actorRef.current = nextActor;

        return nextActor;
      });
    },
    [pushHistorySnapshot],
  );

  const updateTransform = useCallback(
    (
      key:
        | "x"
        | "y"
        | "rotation"
        | "scaleX"
        | "scaleY"
        | "opacity"
        | "pivotX"
        | "pivotY",
      value: number,
    ) => {
      if (!selectedLayerId) {
        return;
      }

      updateLayer(
        selectedLayerId,
        (layer) => ({
          ...layer,

          transform: {
            ...layer.transform,
            [key]: value,
          },
        }),
      );
    },
    [
      selectedLayerId,
      updateLayer,
    ],
  );

  const nudgeLayer = useCallback(
    (
      deltaX: number,
      deltaY: number,
    ) => {
      const layerId =
        selectedLayerIdRef.current;

      if (!layerId) {
        return;
      }

      updateLayer(
        layerId,
        (layer) => ({
          ...layer,

          transform: {
            ...layer.transform,

            x:
              layer.transform.x +
              deltaX,

            y:
              layer.transform.y +
              deltaY,
          },
        }),
      );
    },
    [updateLayer],
  );

  useEffect(() => {
    let active = true;

    loadActor(ACTOR_ID)
      .then((loadedActor) => {
        if (!active) {
          return;
        }

        const prepared =
          applyStoredDefinition(loadedActor);

        actorRef.current = prepared;
        setActor(prepared);

        historyPastRef.current = [];
        historyFutureRef.current = [];
        refreshHistoryState();

        const firstLayer = [
          ...prepared.definition.layers,
        ].sort(
          (first, second) =>
            second.zIndex - first.zIndex,
        )[0];

        setSelectedLayerId(
          firstLayer?.id ?? null,
        );

        setStatus(
          `${prepared.layers.length} capas cargadas · History Engine ONLINE`,
        );
      })
      .catch((error: unknown) => {
        setStatus(
          error instanceof Error
            ? error.message
            : "Error cargando a Bob.",
        );
      });

    return () => {
      active = false;
    };
  }, [refreshHistoryState]);

  useEffect(() => {
    if (!actor) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(actor.definition),
      );

      setSavedAt(
        new Date().toLocaleTimeString(),
      );
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [actor]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const target = event.target as HTMLElement;

      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const commandKey =
        event.ctrlKey || event.metaKey;

      if (
        commandKey &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }

        return;
      }

      if (
        commandKey &&
        event.key.toLowerCase() === "y"
      ) {
        event.preventDefault();
        redo();
        return;
      }

      if (isTyping) {
        return;
      }

      const amount =
        event.shiftKey ? 10 : 1;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeLayer(-amount, 0);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeLayer(amount, 0);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeLayer(0, -amount);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeLayer(0, amount);
      }

      if (
        event.key.toLowerCase() === "s" &&
        !commandKey
      ) {
        setSoloMode((current) => !current);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    nudgeLayer,
    redo,
    undo,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const hitCanvas =
      document.createElement("canvas");

    hitCanvas.width = 1;
    hitCanvas.height = 1;

    const hitContext = hitCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      },
    );

    if (!hitContext) {
      return;
    }

    let frameRequest = 0;

    const resizeCanvas = () => {
      const bounds =
        canvas.getBoundingClientRect();

      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2,
      );

      canvas.width = Math.max(
        1,
        Math.round(bounds.width * pixelRatio),
      );

      canvas.height = Math.max(
        1,
        Math.round(bounds.height * pixelRatio),
      );

      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0,
      );
    };

    const drawGrid = (
      width: number,
      height: number,
    ) => {
      if (!showGrid) {
        return;
      }

      context.save();
      context.lineWidth = 1;

      const gridSize = 40;
      const majorGridSize = 200;

      for (
        let x = 0;
        x <= width;
        x += gridSize
      ) {
        context.beginPath();

        context.strokeStyle =
          x % majorGridSize === 0
            ? "rgba(60,210,255,0.18)"
            : "rgba(255,255,255,0.04)";

        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, height);
        context.stroke();
      }

      for (
        let y = 0;
        y <= height;
        y += gridSize
      ) {
        context.beginPath();

        context.strokeStyle =
          y % majorGridSize === 0
            ? "rgba(60,210,255,0.18)"
            : "rgba(255,255,255,0.04)";

        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
        context.stroke();
      }

      context.restore();
    };

    const render = () => {
      const bounds =
        canvas.getBoundingClientRect();

      const width = bounds.width;
      const height = bounds.height;

      context.clearRect(0, 0, width, height);

      const background =
        context.createRadialGradient(
          width / 2,
          height / 2,
          20,
          width / 2,
          height / 2,
          Math.max(width, height),
        );

      background.addColorStop(0, "#14232d");
      background.addColorStop(0.5, "#080d12");
      background.addColorStop(1, "#020304");

      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      drawGrid(width, height);

      const currentActor = actorRef.current;
      const selectedId =
        selectedLayerIdRef.current;

      if (currentActor) {
        const visibleIds = new Set(
          currentActor.definition.layers
            .filter((layer) => layer.visible)
            .map((layer) => layer.id),
        );

        const previewLayers = currentActor.layers
          .filter((loadedLayer) => {
            const id =
              loadedLayer.definition.id;

            if (!visibleIds.has(id)) {
              return false;
            }

            if (
              soloModeRef.current &&
              selectedId
            ) {
              return id === selectedId;
            }

            return true;
          })
          .map((loadedLayer) => {
            const id =
              loadedLayer.definition.id;

            if (
              !selectedId ||
              id === selectedId ||
              !dimOthersRef.current ||
              soloModeRef.current
            ) {
              return loadedLayer;
            }

            return {
              ...loadedLayer,

              definition: {
                ...loadedLayer.definition,

                transform: {
                  ...loadedLayer.definition.transform,

                  opacity:
                    loadedLayer.definition.transform
                      .opacity * 0.22,
                },
              },
            };
          })
          .sort(
            (first, second) =>
              first.definition.zIndex -
              second.definition.zIndex,
          );

        const currentViewport =
          viewportRef.current;

        const previewActor: LoadedActor = {
          ...currentActor,

          definition: {
            ...currentActor.definition,

            display: {
              ...currentActor.definition.display,

              scale:
                currentActor.definition.display
                  .scale *
                currentViewport.zoom,

              offsetX:
                currentActor.definition.display
                  .offsetX +
                currentViewport.panX,

              offsetY:
                currentActor.definition.display
                  .offsetY +
                currentViewport.panY,
            },
          },

          layers: previewLayers,
        };

        renderActor(
          context,
          previewActor,
          {
            width,
            height,
          },
        );

        if (selectedId) {
          const loadedLayer =
            currentActor.layers.find(
              (candidate) =>
                candidate.definition.id ===
                selectedId,
            );

          if (loadedLayer) {
            let alphaBounds =
              alphaBoundsCacheRef.current.get(
                selectedId,
              );

            if (!alphaBounds) {
              alphaBounds = computeAlphaBounds(
                loadedLayer.image,
              );

              alphaBoundsCacheRef.current.set(
                selectedId,
                alphaBounds,
              );
            }

            const layout = calculateActorLayout(
              currentActor,
              width,
              height,
              currentViewport,
            );

            const geometry =
              buildSelectionGeometry(
                loadedLayer.definition,
                alphaBounds,
                layout,
              );

            drawSelectionGeometry(
              context,
              geometry,
            );
          }
        }
      }

      frameRequest =
        window.requestAnimationFrame(render);
    };

    const stagePointFromEvent = (
      event: PointerEvent,
    ): Point => {
      const bounds =
        canvas.getBoundingClientRect();

      return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
    };

    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      const currentActor = actorRef.current;

      if (!currentActor) {
        return;
      }

      const bounds =
        canvas.getBoundingClientRect();

      const stagePoint =
        stagePointFromEvent(event);

      const layout = calculateActorLayout(
        currentActor,
        bounds.width,
        bounds.height,
        viewportRef.current,
      );

      const selectedId = findLayerAtPoint(
        currentActor,
        stagePoint,
        layout,
        hitContext,
      );

      if (!selectedId) {
        setSelectedLayerId(null);

        pointerRef.current = {
          dragging: false,
          pointerId: null,
          lastX: event.clientX,
          lastY: event.clientY,
        };

        return;
      }

      setSelectedLayerId(selectedId);
      selectedLayerIdRef.current = selectedId;

      pushHistorySnapshot(
        currentActor.definition,
      );

      pointerRef.current = {
        dragging: true,
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };

      canvas.setPointerCapture(
        event.pointerId,
      );
    };

    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      const pointer = pointerRef.current;
      const currentActor = actorRef.current;
      const layerId =
        selectedLayerIdRef.current;

      if (
        !pointer.dragging ||
        pointer.pointerId !== event.pointerId ||
        !currentActor ||
        !layerId
      ) {
        return;
      }

      const bounds =
        canvas.getBoundingClientRect();

      const layout = calculateActorLayout(
        currentActor,
        bounds.width,
        bounds.height,
        viewportRef.current,
      );

      const deltaX =
        (event.clientX - pointer.lastX) /
        layout.scale;

      const deltaY =
        (event.clientY - pointer.lastY) /
        layout.scale;

      pointerRef.current = {
        dragging: true,
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };

      updateLayer(
        layerId,
        (layer) => ({
          ...layer,

          transform: {
            ...layer.transform,

            x:
              layer.transform.x +
              deltaX,

            y:
              layer.transform.y +
              deltaY,
          },
        }),
        false,
      );
    };

    const stopDragging = (
      event: PointerEvent,
    ) => {
      pointerRef.current = {
        dragging: false,
        pointerId: null,
        lastX: pointerRef.current.lastX,
        lastY: pointerRef.current.lastY,
      };

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

    const handleWheel = (
      event: WheelEvent,
    ) => {
      event.preventDefault();

      const currentActor = actorRef.current;

      if (!currentActor) {
        return;
      }

      const bounds =
        canvas.getBoundingClientRect();

      const cursorX =
        event.clientX - bounds.left;

      const cursorY =
        event.clientY - bounds.top;

      const oldViewport =
        viewportRef.current;

      const oldLayout = calculateActorLayout(
        currentActor,
        bounds.width,
        bounds.height,
        oldViewport,
      );

      const actorPointX =
        (cursorX - oldLayout.originX) /
        oldLayout.scale;

      const actorPointY =
        (cursorY - oldLayout.originY) /
        oldLayout.scale;

      const zoomMultiplier =
        Math.exp(-event.deltaY * 0.0015);

      const nextZoom = clamp(
        oldViewport.zoom * zoomMultiplier,
        0.25,
        4,
      );

      const temporaryViewport: ViewportState = {
        zoom: nextZoom,
        panX: 0,
        panY: 0,
      };

      const baseLayout = calculateActorLayout(
        currentActor,
        bounds.width,
        bounds.height,
        temporaryViewport,
      );

      const nextViewport: ViewportState = {
        zoom: nextZoom,

        panX:
          cursorX -
          actorPointX * baseLayout.scale -
          baseLayout.originX,

        panY:
          cursorY -
          actorPointY * baseLayout.scale -
          baseLayout.originY,
      };

      viewportRef.current = nextViewport;
      setViewport(nextViewport);
    };

    resizeCanvas();

    const resizeObserver =
      new ResizeObserver(resizeCanvas);

    resizeObserver.observe(canvas);

    canvas.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    canvas.addEventListener(
      "pointermove",
      handlePointerMove,
    );

    canvas.addEventListener(
      "pointerup",
      stopDragging,
    );

    canvas.addEventListener(
      "pointercancel",
      stopDragging,
    );

    canvas.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      },
    );

    frameRequest =
      window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(
        frameRequest,
      );

      resizeObserver.disconnect();

      canvas.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      canvas.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      canvas.removeEventListener(
        "pointerup",
        stopDragging,
      );

      canvas.removeEventListener(
        "pointercancel",
        stopDragging,
      );

      canvas.removeEventListener(
        "wheel",
        handleWheel,
      );
    };
  }, [
    pushHistorySnapshot,
    showGrid,
    updateLayer,
  ]);

  const orderedLayers = useMemo(() => {
    if (!actor) {
      return [];
    }

    return [...actor.definition.layers].sort(
      (first, second) =>
        second.zIndex - first.zIndex,
    );
  }, [actor]);

  const selectedLayer = useMemo(() => {
    if (!actor || !selectedLayerId) {
      return null;
    }

    return (
      actor.definition.layers.find(
        (layer) =>
          layer.id === selectedLayerId,
      ) ?? null
    );
  }, [
    actor,
    selectedLayerId,
  ]);

  const canUndo =
    historyPastRef.current.length > 0;

  const canRedo =
    historyFutureRef.current.length > 0;

  void historyVersion;

  const exportActor = () => {
    if (!actor) {
      return;
    }

    const content = JSON.stringify(
      actor.definition,
      null,
      2,
    );

    const blob = new Blob([content], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "actor.json";

    document.body.appendChild(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setStatus("actor.json exportado");
  };

  const resetViewport = () => {
    const nextViewport = {
      zoom: 1,
      panX: 0,
      panY: 0,
    };

    viewportRef.current = nextViewport;
    setViewport(nextViewport);

    setStatus("Vista restaurada");
  };

  const resetDraft = async () => {
    const confirmed = window.confirm(
      "¿Restaurar las posiciones originales de Bob?",
    );

    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    alphaBoundsCacheRef.current.clear();

    setStatus("Restaurando a Bob...");

    try {
      const original = await loadActor(
        ACTOR_ID,
      );

      if (actorRef.current) {
        pushHistorySnapshot(
          actorRef.current.definition,
        );
      }

      actorRef.current = original;
      setActor(original);

      const firstLayer = [
        ...original.definition.layers,
      ].sort(
        (first, second) =>
          second.zIndex - first.zIndex,
      )[0];

      setSelectedLayerId(
        firstLayer?.id ?? null,
      );

      resetViewport();
      setStatus("Bob restaurado");
    } catch (error: unknown) {
      setStatus(
        error instanceof Error
          ? error.message
          : "No se pudo restaurar.",
      );
    }
  };

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "58px 1fr 32px",
        color: "#ffffff",
        background: "#030506",
        fontFamily:
          "Inter, Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          padding: "0 18px",
          borderBottom:
            "1px solid rgba(70,210,255,0.2)",
          background:
            "linear-gradient(90deg,#071117,#020405)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              border:
                "1px solid rgba(69,218,255,0.5)",
              color: "#62dcff",
              fontWeight: 900,
            }}
          >
            F
          </div>

          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              FELENCHO AVATAR STUDIO
            </div>

            <div
              style={{
                color:
                  "rgba(255,255,255,0.42)",
                fontSize: 10,
                letterSpacing: "0.18em",
              }}
            >
              GENESIS v0.3 · HISTORY & VIEWPORT
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            style={{
              ...toolbarButton,

              opacity: canUndo ? 1 : 0.35,
              cursor:
                canUndo
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            UNDO
          </button>

          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            style={{
              ...toolbarButton,

              opacity: canRedo ? 1 : 0.35,
              cursor:
                canRedo
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            REDO
          </button>

          <button
            type="button"
            onClick={() =>
              setDimOthers((value) => !value)
            }
            style={{
              ...toolbarButton,

              color: dimOthers
                ? "#6ee6ff"
                : "rgba(255,255,255,0.65)",
            }}
          >
            {dimOthers
              ? "HIGHLIGHT ON"
              : "HIGHLIGHT OFF"}
          </button>

          <button
            type="button"
            onClick={() =>
              setSoloMode((value) => !value)
            }
            style={{
              ...toolbarButton,

              color: soloMode
                ? "#6effb5"
                : "rgba(255,255,255,0.65)",
            }}
          >
            {soloMode
              ? "SOLO ON"
              : "SOLO OFF"}
          </button>

          <button
            type="button"
            onClick={resetViewport}
            style={toolbarButton}
          >
            RESET VIEW
          </button>

          <button
            type="button"
            onClick={resetDraft}
            style={toolbarButton}
          >
            RESET ACTOR
          </button>

          <button
            type="button"
            onClick={exportActor}
            style={{
              ...toolbarButton,
              color: "#03202a",
              background: "#65dcff",
              borderColor: "#65dcff",
              fontWeight: 800,
            }}
          >
            EXPORT ACTOR.JSON
          </button>
        </div>
      </header>

      <section
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns:
            "270px minmax(0,1fr) 310px",
        }}
      >
        <aside
          style={{
            minHeight: 0,
            overflow: "auto",
            borderRight:
              "1px solid rgba(70,210,255,0.14)",
            background: "#070b0e",
          }}
        >
          <PanelTitle
            title="LAYERS"
            subtitle={`${orderedLayers.length}`}
          />

          <div
            style={{
              padding: "8px 10px 20px",
            }}
          >
            {orderedLayers.map((layer) => {
              const selected =
                layer.id === selectedLayerId;

              return (
                <div
                  key={layer.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setSelectedLayerId(layer.id)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();

                      setSelectedLayerId(
                        layer.id,
                      );
                    }
                  }}
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns:
                      "34px 1fr 42px",
                    alignItems: "center",
                    gap: 8,
                    boxSizing: "border-box",
                    padding: "5px 8px",
                    marginBottom: 4,

                    color: selected
                      ? "#ffffff"
                      : "rgba(255,255,255,0.68)",

                    border: selected
                      ? "1px solid rgba(78,213,255,0.65)"
                      : "1px solid transparent",

                    borderRadius: 6,

                    background: selected
                      ? "rgba(41,175,218,0.18)"
                      : "transparent",

                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <button
                    type="button"
                    title={
                      layer.visible
                        ? "Ocultar capa"
                        : "Mostrar capa"
                    }
                    onClick={(event) => {
                      event.stopPropagation();

                      updateLayer(
                        layer.id,
                        (currentLayer) => ({
                          ...currentLayer,

                          visible:
                            !currentLayer.visible,
                        }),
                      );
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                      borderRadius: 5,

                      border:
                        "1px solid rgba(255,255,255,0.08)",

                      color: layer.visible
                        ? "#67e6b5"
                        : "rgba(255,255,255,0.28)",

                      background: layer.visible
                        ? "rgba(64,220,164,0.09)"
                        : "rgba(255,255,255,0.025)",

                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    {layer.visible ? "◉" : "○"}
                  </button>

                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,

                      opacity: layer.visible
                        ? 1
                        : 0.42,
                    }}
                  >
                    {layer.name}
                  </span>

                  <span
                    style={{
                      color:
                        "rgba(255,255,255,0.34)",
                      fontSize: 10,
                      textAlign: "right",
                    }}
                  >
                    Z {layer.zIndex}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <section
          style={{
            minWidth: 0,
            minHeight: 0,
            position: "relative",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              width: "100%",
              height: "100%",

              cursor: selectedLayer
                ? "move"
                : "crosshair",

              touchAction: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              padding: "9px 11px",
              borderRadius: 6,

              border:
                "1px solid rgba(75,214,255,0.22)",

              background:
                "rgba(2,6,8,0.78)",

              color:
                "rgba(255,255,255,0.65)",

              fontSize: 11,
              lineHeight: 1.65,
              pointerEvents: "none",
            }}
          >
            Rueda: Zoom al cursor
            <br />
            Ctrl/Cmd + Z: Undo
            <br />
            Ctrl/Cmd + Shift + Z: Redo
            <br />
            Flechas: 1 px · Shift: 10 px
          </div>

          <div
            style={{
              position: "absolute",
              right: 14,
              bottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              borderRadius: 7,

              background:
                "rgba(2,6,8,0.82)",

              border:
                "1px solid rgba(75,214,255,0.2)",
            }}
          >
            <span
              style={{
                color:
                  "rgba(255,255,255,0.45)",
                fontSize: 11,
              }}
            >
              ZOOM
            </span>

            <input
              type="range"
              min="0.25"
              max="4"
              step="0.05"
              value={viewport.zoom}
              onChange={(event) => {
                const nextViewport = {
                  ...viewportRef.current,

                  zoom: Number(
                    event.target.value,
                  ),
                };

                viewportRef.current =
                  nextViewport;

                setViewport(nextViewport);
              }}
            />

            <span
              style={{
                minWidth: 45,
                fontSize: 11,
              }}
            >
              {Math.round(
                viewport.zoom * 100,
              )}
              %
            </span>
          </div>
        </section>

        <aside
          style={{
            minHeight: 0,
            overflow: "auto",

            borderLeft:
              "1px solid rgba(70,210,255,0.14)",

            background: "#070b0e",
          }}
        >
          <PanelTitle
            title="INSPECTOR"
            subtitle={
              selectedLayer
                ? selectedLayer.name
                : "NO SELECTION"
            }
          />

          {selectedLayer ? (
            <div
              style={{
                padding: "14px 16px 28px",
              }}
            >
              <SectionLabel>
                TRANSFORM
              </SectionLabel>

              <NumberField
                label="Position X"
                value={
                  selectedLayer.transform.x
                }
                onChange={(value) =>
                  updateTransform("x", value)
                }
              />

              <NumberField
                label="Position Y"
                value={
                  selectedLayer.transform.y
                }
                onChange={(value) =>
                  updateTransform("y", value)
                }
              />

              <NumberField
                label="Rotation"
                value={
                  selectedLayer.transform
                    .rotation
                }
                step={0.5}
                onChange={(value) =>
                  updateTransform(
                    "rotation",
                    value,
                  )
                }
              />

              <NumberField
                label="Scale X"
                value={
                  selectedLayer.transform
                    .scaleX
                }
                step={0.01}
                onChange={(value) =>
                  updateTransform(
                    "scaleX",
                    value,
                  )
                }
              />

              <NumberField
                label="Scale Y"
                value={
                  selectedLayer.transform
                    .scaleY
                }
                step={0.01}
                onChange={(value) =>
                  updateTransform(
                    "scaleY",
                    value,
                  )
                }
              />

              <NumberField
                label="Opacity"
                value={
                  selectedLayer.transform
                    .opacity
                }
                min={0}
                max={1}
                step={0.05}
                onChange={(value) =>
                  updateTransform(
                    "opacity",
                    clamp(value, 0, 1),
                  )
                }
              />

              <SectionLabel>
                LAYER
              </SectionLabel>

              <NumberField
                label="Z Index"
                value={selectedLayer.zIndex}
                step={1}
                onChange={(value) =>
                  updateLayer(
                    selectedLayer.id,
                    (layer) => ({
                      ...layer,

                      zIndex: Math.round(value),
                    }),
                  )
                }
              />

              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 6,

                  border:
                    "1px solid rgba(255,255,255,0.07)",

                  color:
                    "rgba(255,255,255,0.4)",

                  background:
                    "rgba(255,255,255,0.025)",

                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                La visibilidad ahora se controla
                directamente desde el panel de capas.
              </div>

              <SectionLabel>
                PRECISION
              </SectionLabel>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: 7,
                }}
              >
                <span />

                <NudgeButton
                  label="↑"
                  onClick={() =>
                    nudgeLayer(0, -1)
                  }
                />

                <span />

                <NudgeButton
                  label="←"
                  onClick={() =>
                    nudgeLayer(-1, 0)
                  }
                />

                <NudgeButton
                  label="•"
                  onClick={() => {
                    const current =
                      actorRef.current;

                    if (!current) {
                      return;
                    }

                    pushHistorySnapshot(
                      current.definition,
                    );

                    setActor((actorState) => {
                      if (!actorState) {
                        return actorState;
                      }

                      let next =
                        synchronizeActorLayer(
                          actorState,
                          selectedLayer.id,
                          (layer) => ({
                            ...layer,

                            transform: {
                              ...layer.transform,
                              x: 0,
                              y: 0,
                            },
                          }),
                        );

                      actorRef.current = next;
                      return next;
                    });
                  }}
                />

                <NudgeButton
                  label="→"
                  onClick={() =>
                    nudgeLayer(1, 0)
                  }
                />

                <span />

                <NudgeButton
                  label="↓"
                  onClick={() =>
                    nudgeLayer(0, 1)
                  }
                />

                <span />
              </div>

              <SectionLabel>
                IDENTIFICATION
              </SectionLabel>

              <InfoRow
                label="ID"
                value={selectedLayer.id}
              />

              <InfoRow
                label="Image"
                value={selectedLayer.image}
              />
            </div>
          ) : (
            <div
              style={{
                padding: 18,
                color:
                  "rgba(255,255,255,0.4)",
              }}
            >
              Haz clic sobre una pieza de Bob.
            </div>
          )}
        </aside>
      </section>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",

          borderTop:
            "1px solid rgba(70,210,255,0.16)",

          background: "#05090b",

          color:
            "rgba(255,255,255,0.45)",

          fontFamily:
            "ui-monospace, monospace",

          fontSize: 10,
          letterSpacing: "0.06em",
        }}
      >
        <span>{status}</span>

        <span>
          HISTORY {historyPastRef.current.length}/
          {HISTORY_LIMIT}
          {" · "}
          {selectedLayer
            ? `SELECTED: ${selectedLayer.name}`
            : "NO LAYER SELECTED"}
          {" · "}
          {savedAt
            ? `DRAFT SAVED ${savedAt}`
            : "GENESIS ONLINE"}
        </span>
      </footer>
    </main>
  );
}

const toolbarButton: CSSProperties = {
  padding: "8px 11px",
  borderRadius: 5,

  border:
    "1px solid rgba(92,216,255,0.26)",

  color:
    "rgba(255,255,255,0.76)",

  background:
    "rgba(255,255,255,0.04)",

  fontSize: 10,
  letterSpacing: "0.08em",
  cursor: "pointer",
};

function PanelTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        minHeight: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "0 14px",

        borderBottom:
          "1px solid rgba(70,210,255,0.13)",
      }}
    >
      <strong
        style={{
          fontSize: 11,
          letterSpacing: "0.16em",
          color: "#73ddff",
        }}
      >
        {title}
      </strong>

      <span
        style={{
          maxWidth: 150,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",

          color:
            "rgba(255,255,255,0.38)",

          fontSize: 10,
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}

function SectionLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        margin: "18px 0 10px",
        paddingBottom: 6,

        borderBottom:
          "1px solid rgba(70,210,255,0.12)",

        color: "#67d9ff",
        fontSize: 10,
        letterSpacing: "0.16em",
      }}
    >
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 110px",
        alignItems: "center",
        gap: 10,
        marginBottom: 9,

        color:
          "rgba(255,255,255,0.62)",

        fontSize: 12,
      }}
    >
      <span>{label}</span>

      <input
        type="number"
        value={
          Number.isInteger(value)
            ? value
            : Number(value.toFixed(4))
        }
        step={step}
        min={min}
        max={max}
        onChange={(event) => {
          const nextValue = Number(
            event.target.value,
          );

          if (Number.isFinite(nextValue)) {
            onChange(nextValue);
          }
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px 8px",
          borderRadius: 4,

          border:
            "1px solid rgba(255,255,255,0.13)",

          color: "#ffffff",
          background: "#10171b",
          outline: "none",
        }}
      />
    </label>
  );
}

function NudgeButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 34,
        borderRadius: 4,

        border:
          "1px solid rgba(81,214,255,0.2)",

        color: "#ffffff",

        background:
          "rgba(255,255,255,0.04)",

        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        marginBottom: 9,
      }}
    >
      <div
        style={{
          color:
            "rgba(255,255,255,0.35)",

          fontSize: 9,
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          overflowWrap: "anywhere",

          color:
            "rgba(255,255,255,0.68)",

          fontFamily:
            "ui-monospace, monospace",

          fontSize: 10,
        }}
      >
        {value}
      </div>
    </div>
  );
}
