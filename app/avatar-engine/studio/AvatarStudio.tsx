"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { loadActor } from "../lib/ActorLoader";
import { renderActor } from "../lib/ActorRenderer";

import type {
  LoadedActor,
} from "../types/Actor";

const ACTOR_ID = "Bob";
const STORAGE_KEY =
  "felencho-avatar-studio:bob:draft";

type ActorLayer =
  LoadedActor["definition"]["layers"][number];

interface PointerState {
  dragging: boolean;
  lastX: number;
  lastY: number;
}

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

function calculateActorScale(
  actor: LoadedActor,
  width: number,
  height: number,
): number {
  const display =
    actor.definition.display;

  const configuredWidth =
    display.maxStageWidth;

  const configuredHeight =
    display.maxStageHeight;

  const availableWidth =
    configuredWidth <= 2
      ? width * configuredWidth
      : Math.min(
          width,
          configuredWidth,
        );

  const availableHeight =
    configuredHeight <= 2
      ? height * configuredHeight
      : Math.min(
          height,
          configuredHeight,
        );

  const fitScale = Math.min(
    availableWidth /
      actor.definition.width,
    availableHeight /
      actor.definition.height,
  );

  const result =
    fitScale * display.scale;

  return Number.isFinite(result) &&
    result > 0
    ? result
    : 1;
}

function applyStoredDefinition(
  actor: LoadedActor,
): LoadedActor {
  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!stored) {
      return actor;
    }

    const parsed = JSON.parse(
      stored,
    ) as LoadedActor["definition"];

    if (
      !parsed ||
      !Array.isArray(parsed.layers)
    ) {
      return actor;
    }

    const storedLayers =
      new Map(
        parsed.layers.map(
          (layer) => [
            layer.id,
            layer,
          ],
        ),
      );

    const definition = {
      ...actor.definition,
      ...parsed,
      layers:
        actor.definition.layers.map(
          (layer) =>
            storedLayers.get(
              layer.id,
            ) ?? layer,
        ),
    };

    const layers =
      actor.layers.map(
        (loadedLayer) => {
          const updated =
            storedLayers.get(
              loadedLayer
                .definition.id,
            );

          return {
            ...loadedLayer,
            definition:
              updated ??
              loadedLayer.definition,
          };
        },
      );

    return {
      definition,
      layers,
    };
  } catch {
    return actor;
  }
}

function synchronizeActorLayer(
  actor: LoadedActor,
  layerId: string,
  update: (
    layer: ActorLayer,
  ) => ActorLayer,
): LoadedActor {
  const definitionLayers =
    actor.definition.layers.map(
      (layer) =>
        layer.id === layerId
          ? update(layer)
          : layer,
    );

  const loadedLayers =
    actor.layers.map(
      (loadedLayer) =>
        loadedLayer.definition.id ===
        layerId
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
      layers: definitionLayers,
    },
    layers: loadedLayers,
  };
}

export default function AvatarStudio() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const actorRef =
    useRef<LoadedActor | null>(null);

  const selectedLayerIdRef =
    useRef<string | null>(null);

  const pointerRef =
    useRef<PointerState>({
      dragging: false,
      lastX: 0,
      lastY: 0,
    });

  const [actor, setActor] =
    useState<LoadedActor | null>(
      null,
    );

  const [
    selectedLayerId,
    setSelectedLayerId,
  ] = useState<string | null>(
    null,
  );

  const [status, setStatus] =
    useState(
      "Cargando a Bob...",
    );

  const [zoom, setZoom] =
    useState(1);

  const [showGrid, setShowGrid] =
    useState(true);

  const [savedAt, setSavedAt] =
    useState<string | null>(null);

  useEffect(() => {
    selectedLayerIdRef.current =
      selectedLayerId;
  }, [selectedLayerId]);

  useEffect(() => {
    let active = true;

    loadActor(ACTOR_ID)
      .then((loadedActor) => {
        if (!active) {
          return;
        }

        const prepared =
          applyStoredDefinition(
            loadedActor,
          );

        actorRef.current =
          prepared;

        setActor(prepared);

        const firstLayer =
          [...prepared.definition.layers]
            .sort(
              (first, second) =>
                second.zIndex -
                first.zIndex,
            )[0];

        if (firstLayer) {
          setSelectedLayerId(
            firstLayer.id,
          );
        }

        setStatus(
          `${prepared.layers.length} capas cargadas`,
        );
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : "Error cargando a Bob.";

        setStatus(message);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  useEffect(() => {
    if (!actor) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            actor.definition,
          ),
        );

        setSavedAt(
          new Date().toLocaleTimeString(),
        );
      }, 250);

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [actor]);

  const updateLayer =
    useCallback(
      (
        layerId: string,
        update: (
          layer: ActorLayer,
        ) => ActorLayer,
      ) => {
        setActor((current) => {
          if (!current) {
            return current;
          }

          return synchronizeActorLayer(
            current,
            layerId,
            update,
          );
        });
      },
      [],
    );

  const updateTransform =
    useCallback(
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

  const nudgeLayer =
    useCallback(
      (
        deltaX: number,
        deltaY: number,
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
      [
        selectedLayerId,
        updateLayer,
      ],
    );

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName ===
          "TEXTAREA"
      ) {
        return;
      }

      const amount =
        event.shiftKey ? 10 : 1;

      if (
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();
        nudgeLayer(-amount, 0);
      }

      if (
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        nudgeLayer(amount, 0);
      }

      if (
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        nudgeLayer(0, -amount);
      }

      if (
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        nudgeLayer(0, amount);
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
  }, [nudgeLayer]);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    let frameRequest = 0;

    const resizeCanvas = () => {
      const bounds =
        canvas.getBoundingClientRect();

      const pixelRatio =
        Math.min(
          window.devicePixelRatio ||
            1,
          2,
        );

      canvas.width = Math.max(
        1,
        Math.round(
          bounds.width *
            pixelRatio,
        ),
      );

      canvas.height = Math.max(
        1,
        Math.round(
          bounds.height *
            pixelRatio,
        ),
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

      for (
        let x = 0;
        x <= width;
        x += 40
      ) {
        context.beginPath();
        context.strokeStyle =
          x % 200 === 0
            ? "rgba(60,210,255,0.18)"
            : "rgba(255,255,255,0.04)";
        context.moveTo(
          x + 0.5,
          0,
        );
        context.lineTo(
          x + 0.5,
          height,
        );
        context.stroke();
      }

      for (
        let y = 0;
        y <= height;
        y += 40
      ) {
        context.beginPath();
        context.strokeStyle =
          y % 200 === 0
            ? "rgba(60,210,255,0.18)"
            : "rgba(255,255,255,0.04)";
        context.moveTo(
          0,
          y + 0.5,
        );
        context.lineTo(
          width,
          y + 0.5,
        );
        context.stroke();
      }

      context.restore();
    };

    const render = () => {
      const bounds =
        canvas.getBoundingClientRect();

      const width =
        bounds.width;

      const height =
        bounds.height;

      context.clearRect(
        0,
        0,
        width,
        height,
      );

      const background =
        context.createRadialGradient(
          width / 2,
          height / 2,
          20,
          width / 2,
          height / 2,
          Math.max(
            width,
            height,
          ),
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

      context.fillStyle =
        background;

      context.fillRect(
        0,
        0,
        width,
        height,
      );

      drawGrid(width, height);

      const currentActor =
        actorRef.current;

      if (currentActor) {
        const visibleIds =
          new Set(
            currentActor
              .definition
              .layers
              .filter(
                (layer) =>
                  layer.visible,
              )
              .map(
                (layer) =>
                  layer.id,
              ),
          );

        const previewActor = {
          ...currentActor,
          definition: {
            ...currentActor.definition,
            display: {
              ...currentActor
                .definition
                .display,
              scale:
                currentActor
                  .definition
                  .display
                  .scale * zoom,
            },
          },
          layers:
            currentActor.layers
              .filter(
                (layer) =>
                  visibleIds.has(
                    layer
                      .definition
                      .id,
                  ),
              )
              .sort(
                (
                  first,
                  second,
                ) =>
                  first
                    .definition
                    .zIndex -
                  second
                    .definition
                    .zIndex,
              ),
        };

        renderActor(
          context,
          previewActor,
          {
            width,
            height,
          },
        );
      }

      frameRequest =
        window.requestAnimationFrame(
          render,
        );
    };

    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      pointerRef.current = {
        dragging: true,
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
      const pointer =
        pointerRef.current;

      const currentActor =
        actorRef.current;

      const layerId =
        selectedLayerIdRef.current;

      if (
        !pointer.dragging ||
        !currentActor ||
        !layerId
      ) {
        return;
      }

      const bounds =
        canvas.getBoundingClientRect();

      const scale =
        calculateActorScale(
          currentActor,
          bounds.width,
          bounds.height,
        ) * zoom;

      const deltaX =
        (event.clientX -
          pointer.lastX) /
        scale;

      const deltaY =
        (event.clientY -
          pointer.lastY) /
        scale;

      pointerRef.current = {
        dragging: true,
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
      );
    };

    const stopDragging = (
      event: PointerEvent,
    ) => {
      pointerRef.current = {
        ...pointerRef.current,
        dragging: false,
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

    resizeCanvas();

    const resizeObserver =
      new ResizeObserver(
        resizeCanvas,
      );

    resizeObserver.observe(
      canvas,
    );

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

    frameRequest =
      window.requestAnimationFrame(
        render,
      );

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
    };
  }, [
    showGrid,
    updateLayer,
    zoom,
  ]);

  const orderedLayers =
    useMemo(() => {
      if (!actor) {
        return [];
      }

      return [
        ...actor.definition.layers,
      ].sort(
        (first, second) =>
          second.zIndex -
          first.zIndex,
      );
    }, [actor]);

  const selectedLayer =
    useMemo(() => {
      if (
        !actor ||
        !selectedLayerId
      ) {
        return null;
      }

      return (
        actor.definition.layers.find(
          (layer) =>
            layer.id ===
            selectedLayerId,
        ) ?? null
      );
    }, [
      actor,
      selectedLayerId,
    ]);

  const exportActor = () => {
    if (!actor) {
      return;
    }

    const content =
      JSON.stringify(
        actor.definition,
        null,
        2,
      );

    const blob = new Blob(
      [content],
      {
        type:
          "application/json;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(
        blob,
      );

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "actor.json";

    document.body.appendChild(
      link,
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setStatus(
      "actor.json exportado",
    );
  };

  const resetDraft = async () => {
    const confirmed =
      window.confirm(
        "¿Restaurar las posiciones originales de Bob?",
      );

    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    setStatus(
      "Restaurando a Bob...",
    );

    try {
      const original =
        await loadActor(
          ACTOR_ID,
        );

      actorRef.current =
        original;

      setActor(original);

      setStatus(
        "Bob restaurado",
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
        gridTemplateRows:
          "58px 1fr 32px",
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
          justifyContent:
            "space-between",
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
                letterSpacing:
                  "0.08em",
              }}
            >
              FELENCHO AVATAR STUDIO
            </div>

            <div
              style={{
                color:
                  "rgba(255,255,255,0.42)",
                fontSize: 10,
                letterSpacing:
                  "0.18em",
              }}
            >
              GENESIS v0.1
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
            onClick={() =>
              setShowGrid(
                (value) =>
                  !value,
              )
            }
            style={toolbarButton}
          >
            {showGrid
              ? "GRID ON"
              : "GRID OFF"}
          </button>

          <button
            type="button"
            onClick={resetDraft}
            style={toolbarButton}
          >
            RESET
          </button>

          <button
            type="button"
            onClick={exportActor}
            style={{
              ...toolbarButton,
              color: "#03202a",
              background:
                "#65dcff",
              borderColor:
                "#65dcff",
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
              padding:
                "8px 10px 20px",
            }}
          >
            {orderedLayers.map(
              (layer) => {
                const selected =
                  layer.id ===
                  selectedLayerId;

                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() =>
                      setSelectedLayerId(
                        layer.id,
                      )
                    }
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns:
                        "28px 1fr 42px",
                      alignItems:
                        "center",
                      gap: 8,
                      padding:
                        "9px 8px",
                      marginBottom: 4,
                      color:
                        selected
                          ? "#ffffff"
                          : "rgba(255,255,255,0.68)",
                      textAlign:
                        "left",
                      border:
                        selected
                          ? "1px solid rgba(78,213,255,0.65)"
                          : "1px solid transparent",
                      borderRadius: 6,
                      background:
                        selected
                          ? "rgba(41,175,218,0.18)"
                          : "transparent",
                      cursor:
                        "pointer",
                    }}
                  >
                    <span
                      style={{
                        color:
                          layer.visible
                            ? "#64e7b5"
                            : "#67727a",
                        textAlign:
                          "center",
                      }}
                    >
                      {layer.visible
                        ? "●"
                        : "○"}
                    </span>

                    <span
                      style={{
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        fontSize: 12,
                      }}
                    >
                      {layer.name}
                    </span>

                    <span
                      style={{
                        color:
                          "rgba(255,255,255,0.34)",
                        fontSize: 10,
                        textAlign:
                          "right",
                      }}
                    >
                      Z {layer.zIndex}
                    </span>
                  </button>
                );
              },
            )}
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
              cursor:
                selectedLayer
                  ? "move"
                  : "default",
              touchAction:
                "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              padding:
                "8px 10px",
              borderRadius: 6,
              border:
                "1px solid rgba(75,214,255,0.22)",
              background:
                "rgba(2,6,8,0.75)",
              color:
                "rgba(255,255,255,0.58)",
              fontSize: 11,
              pointerEvents:
                "none",
            }}
          >
            Selecciona una capa y
            arrástrala. Flechas =
            1 px. Shift + flechas =
            10 px.
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
              min="0.5"
              max="2"
              step="0.05"
              value={zoom}
              onChange={(event) =>
                setZoom(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
            />

            <span
              style={{
                minWidth: 45,
                fontSize: 11,
              }}
            >
              {Math.round(
                zoom * 100,
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
                padding:
                  "14px 16px 28px",
              }}
            >
              <SectionLabel>
                TRANSFORM
              </SectionLabel>

              <NumberField
                label="Position X"
                value={
                  selectedLayer
                    .transform.x
                }
                onChange={(value) =>
                  updateTransform(
                    "x",
                    value,
                  )
                }
              />

              <NumberField
                label="Position Y"
                value={
                  selectedLayer
                    .transform.y
                }
                onChange={(value) =>
                  updateTransform(
                    "y",
                    value,
                  )
                }
              />

              <NumberField
                label="Rotation"
                value={
                  selectedLayer
                    .transform
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
                  selectedLayer
                    .transform
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
                  selectedLayer
                    .transform
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
                  selectedLayer
                    .transform
                    .opacity
                }
                min={0}
                max={1}
                step={0.05}
                onChange={(value) =>
                  updateTransform(
                    "opacity",
                    clamp(
                      value,
                      0,
                      1,
                    ),
                  )
                }
              />

              <SectionLabel>
                LAYER
              </SectionLabel>

              <NumberField
                label="Z Index"
                value={
                  selectedLayer.zIndex
                }
                step={1}
                onChange={(value) =>
                  updateLayer(
                    selectedLayer.id,
                    (layer) => ({
                      ...layer,
                      zIndex:
                        Math.round(
                          value,
                        ),
                    }),
                  )
                }
              />

              <label
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: 10,
                  marginTop: 14,
                  color:
                    "rgba(255,255,255,0.67)",
                  fontSize: 12,
                }}
              >
                Visible

                <input
                  type="checkbox"
                  checked={
                    selectedLayer.visible
                  }
                  onChange={(event) =>
                    updateLayer(
                      selectedLayer.id,
                      (layer) => ({
                        ...layer,
                        visible:
                          event.target
                            .checked,
                      }),
                    )
                  }
                />
              </label>

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
                    nudgeLayer(
                      0,
                      -1,
                    )
                  }
                />

                <span />

                <NudgeButton
                  label="←"
                  onClick={() =>
                    nudgeLayer(
                      -1,
                      0,
                    )
                  }
                />

                <NudgeButton
                  label="•"
                  onClick={() => {
                    updateTransform(
                      "x",
                      0,
                    );
                    updateTransform(
                      "y",
                      0,
                    );
                  }}
                />

                <NudgeButton
                  label="→"
                  onClick={() =>
                    nudgeLayer(
                      1,
                      0,
                    )
                  }
                />

                <span />

                <NudgeButton
                  label="↓"
                  onClick={() =>
                    nudgeLayer(
                      0,
                      1,
                    )
                  }
                />

                <span />
              </div>

              <SectionLabel>
                IDENTIFICATION
              </SectionLabel>

              <InfoRow
                label="ID"
                value={
                  selectedLayer.id
                }
              />

              <InfoRow
                label="Image"
                value={
                  selectedLayer.image
                }
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
              Selecciona una capa.
            </div>
          )}
        </aside>
      </section>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 14px",
          borderTop:
            "1px solid rgba(70,210,255,0.16)",
          background: "#05090b",
          color:
            "rgba(255,255,255,0.45)",
          fontFamily:
            "ui-monospace, monospace",
          fontSize: 10,
          letterSpacing:
            "0.06em",
        }}
      >
        <span>{status}</span>

        <span>
          {savedAt
            ? `DRAFT SAVED ${savedAt}`
            : "GENESIS ONLINE"}
        </span>
      </footer>
    </main>
  );
}

const toolbarButton: React.CSSProperties =
  {
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
        justifyContent:
          "space-between",
        gap: 10,
        padding: "0 14px",
        borderBottom:
          "1px solid rgba(70,210,255,0.13)",
      }}
    >
      <strong
        style={{
          fontSize: 11,
          letterSpacing:
            "0.16em",
          color: "#73ddff",
        }}
      >
        {title}
      </strong>

      <span
        style={{
          maxWidth: 150,
          overflow: "hidden",
          textOverflow:
            "ellipsis",
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
  children: React.ReactNode;
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
        letterSpacing:
          "0.16em",
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
  onChange: (
    value: number,
  ) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns:
          "1fr 110px",
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
            : Number(
                value.toFixed(4),
              )
        }
        step={step}
        min={min}
        max={max}
        onChange={(event) => {
          const nextValue =
            Number(
              event.target.value,
            );

          if (
            Number.isFinite(
              nextValue,
            )
          ) {
            onChange(nextValue);
          }
        }}
        style={{
          width: "100%",
          boxSizing:
            "border-box",
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
          letterSpacing:
            "0.12em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          overflowWrap:
            "anywhere",
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
