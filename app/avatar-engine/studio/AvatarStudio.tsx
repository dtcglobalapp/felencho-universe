"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  normalizeActorDefinition,
  sortActorLayers,
} from "../domain/ActorNormalizer";
import { loadActor } from "../lib/ActorLoader";
import { renderActor } from "../lib/ActorRenderer";
import Inspector from "./components/Inspector";
import LayersPanel from "./components/LayersPanel";
import Toolbar from "./components/Toolbar";

import type {
  ActorTransform,
  LoadedActor,
} from "../types/Actor";

const DEFAULT_ACTOR_ID = "Bob";
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
  return {
    ...actor,
    definition: cloneDefinition(definition),
  };
}

function getDraftStorageKey(
  actorId: string,
): string {
  return `felencho-avatar-studio:${actorId.toLowerCase()}:draft`;
}

function applyStoredDefinition(
  actor: LoadedActor,
  storageKey: string,
): LoadedActor {
  try {
    const stored = window.localStorage.getItem(
      storageKey,
    );

    if (!stored) {
      return actor;
    }

    const parsed: unknown =
      JSON.parse(stored);

    const normalized =
      normalizeActorDefinition(
        parsed,
        {
          sourceActorId:
            actor.definition.id,
        },
      );

    const storedLayers = new Map(
      normalized.definition.layers.map((layer) => [
        layer.id,
        layer,
      ]),
    );

    const definition: ActorDefinition = {
      ...actor.definition,

      layers: actor.definition.layers.map(
        (layer) => {
          const storedLayer =
            storedLayers.get(layer.id);

          if (!storedLayer) {
            return layer;
          }

          return {
            ...layer,
            visible:
              storedLayer.visible,
            opacity:
              storedLayer.opacity,
            zIndex:
              storedLayer.zIndex,
            transform: {
              ...storedLayer.transform,
            },
          };
        },
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

  return {
    ...actor,

    definition: {
      ...actor.definition,
      layers: nextDefinitionLayers,
    },
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
      (
        localPoint.x -
        transform.pivotX
      ) *
      layout.scale *
      transform.scaleX,

    y:
      (
        localPoint.y -
        transform.pivotY
      ) *
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
      (
        transform.x +
        transform.pivotX
      ) *
        layout.scale +
      rotated.x,

    y:
      layout.originY +
      (
        transform.y +
        transform.pivotY
      ) *
        layout.scale +
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
      (
        transform.x +
        transform.pivotX
      ) *
        layout.scale,

    y:
      stagePoint.y -
      layout.originY -
      (
        transform.y +
        transform.pivotY
      ) *
        layout.scale,
  };

  const unrotated = rotatePoint(
    translated,
    (-transform.rotation * Math.PI) / 180,
  );

  return {
    x:
      unrotated.x / scaleX +
      transform.pivotX,
    y:
      unrotated.y / scaleY +
      transform.pivotY,
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
  const candidates =
    sortActorLayers(
      actor.definition.layers.filter(
      (layer) =>
        layer.visible &&
        layer.opacity > 0,
      ),
      "descending",
    );

  for (const layer of candidates) {
    const image = actor.layerImages.get(
      layer.id,
    );

    if (!image) {
      continue;
    }

    const localPoint = stageToLocal(
      stagePoint,
      layer,
      layout,
    );

    if (!localPoint) {
      continue;
    }

    if (
      hitTestImageAlpha(
        image,
        localPoint.x,
        localPoint.y,
        hitContext,
      )
    ) {
      return layer.id;
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

interface AvatarStudioProps {
  actorId?: string;
}

type ActorLoadState =
  | "loading"
  | "ready"
  | "error";

export default function AvatarStudio({
  actorId = DEFAULT_ACTOR_ID,
}: AvatarStudioProps) {
  const requestedActorId =
    actorId.trim() ||
    DEFAULT_ACTOR_ID;

  const storageKey = useMemo(
    () =>
      getDraftStorageKey(
        requestedActorId,
      ),
    [requestedActorId],
  );

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
    actorLoadState,
    setActorLoadState,
  ] = useState<ActorLoadState>(
    "loading",
  );

  const [
    actorLoadError,
    setActorLoadError,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedLayerId,
    setSelectedLayerId,
  ] = useState<string | null>(null);

  const [status, setStatus] = useState(
    "Cargando actor...",
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
      const current =
        actorRef.current;

      if (!current) {
        return;
      }

      const currentLayer =
        current.definition.layers.find(
          (layer) =>
            layer.id === layerId,
        );

      if (!currentLayer) {
        return;
      }

      const nextLayer =
        update(currentLayer);

      if (nextLayer === currentLayer) {
        return;
      }

      if (recordHistory) {
        pushHistorySnapshot(
          current.definition,
        );
      }

      const nextActor =
        synchronizeActorLayer(
          current,
          layerId,
          () => nextLayer,
        );

      actorRef.current = nextActor;
      setActor(nextActor);
    },
    [pushHistorySnapshot],
  );

  const updateTransform = useCallback(
    (
      key: keyof ActorTransform,
      value: number,
    ) => {
      if (!selectedLayerId) {
        return;
      }

      updateLayer(
        selectedLayerId,
        (layer) =>
          layer.locked
            ? layer
            : {
                ...layer,

                transform: {
                  ...layer.transform,
                  [key]: value,
                },
              },
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

      const currentLayer =
        actorRef.current?.definition.layers.find(
          (layer) =>
            layer.id === layerId,
        );

      if (currentLayer?.locked) {
        setStatus(
          `La capa ${currentLayer.name} está bloqueada`,
        );
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

  const resetSelectedLayerPosition =
    useCallback(() => {
      const current =
        actorRef.current;
      const layerId =
        selectedLayerIdRef.current;

      if (!current || !layerId) {
        return;
      }

      const selected =
        current.definition.layers.find(
          (layer) =>
            layer.id === layerId,
        );

      if (!selected || selected.locked) {
        return;
      }

      pushHistorySnapshot(
        current.definition,
      );

      const next =
        synchronizeActorLayer(
          current,
          layerId,
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
      setActor(next);
    }, [pushHistorySnapshot]);

  useEffect(() => {
    let active = true;

    actorRef.current = null;
    selectedLayerIdRef.current = null;
    alphaBoundsCacheRef.current.clear();
    historyPastRef.current = [];
    historyFutureRef.current = [];

    setActor(null);
    setSelectedLayerId(null);
    setActorLoadState("loading");
    setActorLoadError(null);
    setSavedAt(null);
    setStatus(
      `Cargando ${requestedActorId}...`,
    );
    refreshHistoryState();

    loadActor(requestedActorId)
      .then((loadedActor) => {
        if (!active) {
          return;
        }

        const prepared =
          applyStoredDefinition(
            loadedActor,
            storageKey,
          );

        actorRef.current = prepared;
        setActor(prepared);
        setActorLoadState("ready");

        historyPastRef.current = [];
        historyFutureRef.current = [];
        refreshHistoryState();

        const firstLayer =
          sortActorLayers(
            prepared.definition.layers,
            "descending",
          )[0];

        setSelectedLayerId(
          firstLayer?.id ?? null,
        );

        const warningCount =
          prepared.diagnostics.length;

        setStatus(
          `${prepared.definition.name} · ${prepared.layerImages.size}/${prepared.definition.layers.length} capas cargadas${warningCount > 0 ? ` · ${warningCount} avisos` : ""}`,
        );
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el actor.";

        actorRef.current = null;
        selectedLayerIdRef.current =
          null;
        setActor(null);
        setSelectedLayerId(null);
        setActorLoadState("error");
        setActorLoadError(message);
        setStatus(message);
      });

    return () => {
      active = false;
    };
  }, [
    refreshHistoryState,
    requestedActorId,
    storageKey,
  ]);

  useEffect(() => {
    if (!actor) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(actor.definition),
      );

      setSavedAt(
        new Date().toLocaleTimeString(),
      );
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    actor,
    storageKey,
  ]);

  useEffect(() => {
    if (!selectedLayerId) {
      return;
    }

    const selectionExists =
      actor?.definition.layers.some(
        (layer) =>
          layer.id ===
          selectedLayerId,
      ) ?? false;

    if (!selectionExists) {
      selectedLayerIdRef.current =
        null;
      setSelectedLayerId(null);
    }
  }, [
    actor,
    selectedLayerId,
  ]);

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
        const previewLayers =
          sortActorLayers(
            currentActor.definition.layers
              .filter((layer) => {
                if (!layer.visible) {
                  return false;
                }

                if (
                  soloModeRef.current &&
                  selectedId
                ) {
                  return (
                    layer.id ===
                    selectedId
                  );
                }

                return true;
              })
              .map((layer) => {
                if (
                  !selectedId ||
                  layer.id ===
                    selectedId ||
                  !dimOthersRef.current ||
                  soloModeRef.current
                ) {
                  return layer;
                }

                return {
                  ...layer,
                  opacity:
                    layer.opacity *
                    0.22,
                };
              }),
          );

        const currentViewport =
          viewportRef.current;

        const previewActor: LoadedActor = {
          ...currentActor,

          definition: {
            ...currentActor.definition,

            layers: previewLayers,

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
          const selectedLayer =
            currentActor.definition.layers.find(
              (layer) =>
                layer.id === selectedId,
            );

          const selectedLayerImage =
            currentActor.layerImages.get(
              selectedId,
            );

          if (
            selectedLayer &&
            selectedLayerImage
          ) {
            let alphaBounds =
              alphaBoundsCacheRef.current.get(
                selectedId,
              );

            if (!alphaBounds) {
              alphaBounds = computeAlphaBounds(
                selectedLayerImage,
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
                selectedLayer,
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

      const selectedLayer =
        currentActor.definition.layers.find(
          (layer) =>
            layer.id === selectedId,
        );

      if (selectedLayer?.locked) {
        pointerRef.current = {
          dragging: false,
          pointerId: null,
          lastX: event.clientX,
          lastY: event.clientY,
        };

        setStatus(
          `La capa ${selectedLayer.name} está bloqueada`,
        );
        return;
      }

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

      const selectedLayer =
        currentActor.definition.layers.find(
          (layer) =>
            layer.id === layerId,
        );

      if (selectedLayer?.locked) {
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

    return sortActorLayers(
      actor.definition.layers,
      "descending",
    );
  }, [actor]);

  const loadedLayerIds = useMemo(
    () =>
      new Set(
        actor
          ? actor.layerImages.keys()
          : [],
      ),
    [actor],
  );

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
    const actorName =
      actorRef.current?.definition.name ??
      requestedActorId;

    const confirmed = window.confirm(
      `¿Restaurar la definición original de ${actorName}?`,
    );

    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(
      storageKey,
    );

    alphaBoundsCacheRef.current.clear();

    setStatus(
      `Restaurando ${actorName}...`,
    );

    try {
      const original = await loadActor(
        requestedActorId,
      );

      if (actorRef.current) {
        pushHistorySnapshot(
          actorRef.current.definition,
        );
      }

      actorRef.current = original;
      setActor(original);

      const firstLayer =
        sortActorLayers(
          original.definition.layers,
          "descending",
        )[0];

      setSelectedLayerId(
        firstLayer?.id ?? null,
      );

      resetViewport();
      setStatus(
        `${original.definition.name} restaurado`,
      );
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
      <Toolbar
        canUndo={canUndo}
        canRedo={canRedo}
        dimOthers={dimOthers}
        soloMode={soloMode}
        onUndo={undo}
        onRedo={redo}
        onToggleHighlight={() =>
          setDimOthers((value) => !value)
        }
        onToggleSolo={() =>
          setSoloMode((value) => !value)
        }
        onResetView={resetViewport}
        onResetActor={resetDraft}
        onExportActor={exportActor}
      />

      <section
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns:
            "270px minmax(0,1fr) 310px",
        }}
      >
        <LayersPanel
          actorLoaded={
            actorLoadState ===
            "ready"
          }
          layers={orderedLayers}
          selectedLayerId={selectedLayerId}
          loadedLayerIds={
            loadedLayerIds
          }
          diagnostics={
            actor?.diagnostics ?? []
          }
          onSelectLayer={setSelectedLayerId}
          onToggleLayerVisibility={(
            layerId,
          ) => {
            updateLayer(
              layerId,
              (layer) => ({
                ...layer,
                visible: !layer.visible,
              }),
            );
          }}
        />

        <section
          style={{
            minWidth: 0,
            minHeight: 0,
            position: "relative",
          }}
        >
          <canvas
            ref={canvasRef}
            aria-label="Genesis actor editing canvas"
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

          {actorLoadState ===
            "error" &&
            actorLoadError && (
              <div
                role="alert"
                style={{
                  position:
                    "absolute",
                  left: "50%",
                  top: "50%",
                  width:
                    "min(460px, calc(100% - 40px))",
                  transform:
                    "translate(-50%, -50%)",
                  padding: 18,
                  borderRadius: 8,
                  border:
                    "1px solid rgba(255,110,110,0.45)",
                  color: "#ffb0b0",
                  background:
                    "rgba(24,4,6,0.92)",
                  fontSize: 12,
                  lineHeight: 1.6,
                  textAlign:
                    "center",
                }}
              >
                <strong
                  style={{
                    display:
                      "block",
                    marginBottom: 6,
                    letterSpacing:
                      "0.08em",
                  }}
                >
                  ACTOR LOAD FAILED
                </strong>

                {actorLoadError}
              </div>
            )}

          {actor &&
            actor.diagnostics.length >
              0 && (
              <div
                role="status"
                style={{
                  position:
                    "absolute",
                  right: 14,
                  top: 14,
                  width: 280,
                  maxHeight: 150,
                  overflow: "auto",
                  padding:
                    "10px 12px",
                  borderRadius: 6,
                  border:
                    "1px solid rgba(255,205,92,0.3)",
                  color: "#ffd36a",
                  background:
                    "rgba(20,14,3,0.88)",
                  fontSize: 10,
                  lineHeight: 1.5,
                }}
              >
                <strong>
                  {
                    actor.diagnostics
                      .length
                  }{" "}
                  ACTOR WARNING
                  {actor.diagnostics
                    .length === 1
                    ? ""
                    : "S"}
                </strong>

                {actor.diagnostics
                  .slice(0, 3)
                  .map(
                    (
                      item,
                      index,
                    ) => (
                      <div
                        key={`${item.code}-${item.layerId ?? "actor"}-${index}`}
                        style={{
                          marginTop: 5,
                          color:
                            "rgba(255,231,171,0.82)",
                        }}
                      >
                        {item.message}
                      </div>
                    ),
                  )}
              </div>
            )}

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

        <Inspector
          actorLoaded={
            actorLoadState ===
            "ready"
          }
          layer={selectedLayer}
          assetLoaded={
            selectedLayer
              ? loadedLayerIds.has(
                  selectedLayer.id,
                )
              : false
          }
          onTransformChange={
            updateTransform
          }
          onOpacityChange={(
            value,
          ) => {
            if (!selectedLayer) {
              return;
            }

            updateLayer(
              selectedLayer.id,
              (layer) =>
                layer.locked
                  ? layer
                  : {
                      ...layer,
                      opacity: value,
                    },
            );
          }}
          onZIndexChange={(value) => {
            if (!selectedLayer) {
              return;
            }

            updateLayer(
              selectedLayer.id,
              (layer) =>
                layer.locked
                  ? layer
                  : {
                      ...layer,
                      zIndex: value,
                    },
            );
          }}
          onNudge={nudgeLayer}
          onResetPosition={
            resetSelectedLayerPosition
          }
        />
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
