"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { loadActor } from "../lib/ActorLoader";
import { renderActor } from "../lib/ActorRenderer";
import { ActorRuntimeEngine } from "../lib/ActorRuntimeEngine";
import { ACTOR_ENGINE } from "../lib/VERSION";

import type {
  LoadedActor,
} from "../types/Actor";

interface StageMetrics {
  width: number;
  height: number;
  fps: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

type ActorLoadStatus =
  | "loading"
  | "ready"
  | "error";

export default function ActorCanvas() {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const actorRef =
    useRef<LoadedActor | null>(null);

  const runtimeEngineRef =
    useRef<ActorRuntimeEngine | null>(null);

  const pointerRef =
    useRef<PointerPosition>({
      x: 0,
      y: 0,
    });

  const [metrics, setMetrics] =
    useState<StageMetrics>({
      width: 0,
      height: 0,
      fps: 0,
    });

  const [pointer, setPointer] =
    useState<PointerPosition>({
      x: 0,
      y: 0,
    });

  const [actorStatus, setActorStatus] =
    useState<ActorLoadStatus>("loading");

  const [actorError, setActorError] =
    useState<string | null>(null);

  const [activeActor, setActiveActor] =
    useState<LoadedActor | null>(null);

  useEffect(() => {
    let mounted = true;

    loadActor("Bob")
      .then((actor) => {
        if (!mounted) {
          return;
        }

        actorRef.current = actor;

        runtimeEngineRef.current =
          new ActorRuntimeEngine(
            actor.definition,
          );

        setActiveActor(actor);
        setActorStatus("ready");
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Error desconocido cargando a Bob.";

        setActorError(message);
        setActorStatus("error");
      });

    return () => {
      mounted = false;
      runtimeEngineRef.current = null;
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

    let frameRequest = 0;

    let previousTime =
      performance.now();

    let lastFpsUpdate =
      previousTime;

    let accumulatedFps = 0;
    let accumulatedFrames = 0;

    const resizeCanvas = () => {
      const bounds =
        canvas.getBoundingClientRect();

      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2,
      );

      canvas.width = Math.max(
        1,
        Math.round(
          bounds.width * pixelRatio,
        ),
      );

      canvas.height = Math.max(
        1,
        Math.round(
          bounds.height * pixelRatio,
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

      setMetrics((current) => ({
        ...current,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      }));
    };

    const drawGrid = (
      width: number,
      height: number,
    ) => {
      const gridSize = 50;

      context.save();
      context.lineWidth = 1;

      for (
        let x = 0;
        x <= width;
        x += gridSize
      ) {
        context.beginPath();

        context.strokeStyle =
          x % 200 === 0
            ? "rgba(91, 216, 255, 0.16)"
            : "rgba(255, 255, 255, 0.045)";

        context.moveTo(x + 0.5, 0);
        context.lineTo(
          x + 0.5,
          height,
        );

        context.stroke();
      }

      for (
        let y = 0;
        y <= height;
        y += gridSize
      ) {
        context.beginPath();

        context.strokeStyle =
          y % 200 === 0
            ? "rgba(91, 216, 255, 0.16)"
            : "rgba(255, 255, 255, 0.045)";

        context.moveTo(0, y + 0.5);
        context.lineTo(
          width,
          y + 0.5,
        );

        context.stroke();
      }

      context.restore();
    };

    const drawStageCenter = (
      width: number,
      height: number,
    ) => {
      const centerX = width / 2;
      const centerY = height / 2;

      context.save();

      context.strokeStyle =
        "rgba(92, 220, 255, 0.55)";

      context.lineWidth = 1;

      context.beginPath();

      context.moveTo(
        centerX - 25,
        centerY,
      );

      context.lineTo(
        centerX + 25,
        centerY,
      );

      context.moveTo(
        centerX,
        centerY - 25,
      );

      context.lineTo(
        centerX,
        centerY + 25,
      );

      context.stroke();

      context.beginPath();

      context.arc(
        centerX,
        centerY,
        9,
        0,
        Math.PI * 2,
      );

      context.stroke();

      context.restore();
    };

    const drawPointer = () => {
      const current =
        pointerRef.current;

      context.save();

      context.strokeStyle =
        "rgba(255,255,255,0.28)";

      context.beginPath();

      context.arc(
        current.x,
        current.y,
        7,
        0,
        Math.PI * 2,
      );

      context.stroke();

      context.restore();
    };

    const render = (
      time: number,
    ) => {
      const bounds =
        canvas.getBoundingClientRect();

      const width = bounds.width;
      const height = bounds.height;

      const elapsed =
        time - previousTime;

      previousTime = time;

      if (
        elapsed > 0 &&
        Number.isFinite(elapsed)
      ) {
        accumulatedFps +=
          1000 / elapsed;

        accumulatedFrames += 1;
      }

      if (
        time - lastFpsUpdate >= 500 &&
        accumulatedFrames > 0
      ) {
        const average =
          accumulatedFps /
          accumulatedFrames;

        setMetrics((current) => ({
          ...current,
          fps: Number.isFinite(average)
            ? Math.round(average)
            : 0,
        }));

        accumulatedFps = 0;
        accumulatedFrames = 0;
        lastFpsUpdate = time;
      }

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
          ) * 0.8,
        );

      background.addColorStop(
        0,
        "#111c23",
      );

      background.addColorStop(
        0.55,
        "#080d11",
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
      drawStageCenter(
        width,
        height,
      );

      const actor =
        actorRef.current;

      const runtimeEngine =
        runtimeEngineRef.current;

      if (
        actor &&
        runtimeEngine
      ) {
        const pointerPosition =
          pointerRef.current;

        const eyeX =
          width > 0
            ? (
                pointerPosition.x -
                width / 2
              ) /
              (width / 2)
            : 0;

        const eyeY =
          height > 0
            ? (
                pointerPosition.y -
                height / 2
              ) /
              (height / 2)
            : 0;

        runtimeEngine.setEyeTarget(
          eyeX,
          eyeY,
        );

        const runtimeState =
          runtimeEngine.update(elapsed);

        renderActor(
          context,
          actor,
          {
            width,
            height,
          },
          runtimeState,
        );
      }

      drawPointer();

      frameRequest =
        window.requestAnimationFrame(
          render,
        );
    };

    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      const bounds =
        canvas.getBoundingClientRect();

      const nextPosition = {
        x: Math.round(
          event.clientX -
            bounds.left,
        ),

        y: Math.round(
          event.clientY -
            bounds.top,
        ),
      };

      pointerRef.current =
        nextPosition;

      setPointer(nextPosition);
    };

    const handlePointerLeave =
      () => {
        const bounds =
          canvas.getBoundingClientRect();

        const centerPosition = {
          x: Math.round(
            bounds.width / 2,
          ),

          y: Math.round(
            bounds.height / 2,
          ),
        };

        pointerRef.current =
          centerPosition;

        setPointer(
          centerPosition,
        );
      };

    resizeCanvas();

    const initialBounds =
      canvas.getBoundingClientRect();

    pointerRef.current = {
      x: initialBounds.width / 2,
      y: initialBounds.height / 2,
    };

    const resizeObserver =
      new ResizeObserver(
        resizeCanvas,
      );

    resizeObserver.observe(
      canvas,
    );

    canvas.addEventListener(
      "pointermove",
      handlePointerMove,
    );

    canvas.addEventListener(
      "pointerleave",
      handlePointerLeave,
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
        "pointermove",
        handlePointerMove,
      );

      canvas.removeEventListener(
        "pointerleave",
        handlePointerLeave,
      );
    };
  }, []);

  const layerCount =
    activeActor?.layers.length ?? 0;

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        color: "#ffffff",
        background: "#020304",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Felencho Actor Engine Stage"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: "crosshair",
        }}
      />

      <header
        style={{
          position: "absolute",
          top: 26,
          left: 28,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            color: "#68d7ff",
            fontSize: 11,
            letterSpacing: "0.25em",
          }}
        >
          FAE / GENESIS
        </div>

        <h1
          style={{
            margin: "12px 0 0",
            fontSize:
              "clamp(25px, 3vw, 42px)",
          }}
        >
          Felencho Actor Engine
        </h1>

        <p
          style={{
            color:
              "rgba(255,255,255,0.5)",
          }}
        >
          Living Runtime Stage
        </p>
      </header>

      <aside
        style={{
          position: "absolute",
          top: 26,
          right: 26,
          width: 285,
          padding: 18,
          border:
            "1px solid rgba(104,215,255,0.24)",
          borderRadius: 14,
          background:
            "rgba(2,7,10,0.86)",
          backdropFilter:
            "blur(14px)",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <StatusRow
          label="ENGINE"
          value={
            ACTOR_ENGINE.version
          }
        />

        <StatusRow
          label="STATUS"
          value={
            ACTOR_ENGINE.status
          }
          active={
            actorStatus === "ready"
          }
        />

        <StatusRow
          label="RUNTIME"
          value="ONLINE"
          active={
            actorStatus === "ready"
          }
        />

        <StatusRow
          label="IDLE MOTION"
          value="ACTIVE"
          active={
            actorStatus === "ready"
          }
        />

        <StatusRow
          label="EYE SMOOTHING"
          value="ACTIVE"
          active={
            actorStatus === "ready"
          }
        />

        <StatusRow
          label="RESOLUTION"
          value={`${metrics.width} x ${metrics.height}`}
        />

        <StatusRow
          label="FPS"
          value={`${metrics.fps}`}
        />

        <StatusRow
          label="POINTER"
          value={`${pointer.x}, ${pointer.y}`}
        />

        <Divider />

        <div
          style={{
            color: "#68d7ff",
            letterSpacing: "0.14em",
            marginBottom: 8,
          }}
        >
          ACTIVE ACTOR
        </div>

        {actorStatus ===
          "loading" && (
          <div
            style={{
              color: "#ffd36a",
            }}
          >
            Loading Bob...
          </div>
        )}

        {actorStatus ===
          "error" && (
          <div
            style={{
              color: "#ff8f8f",
            }}
          >
            {actorError}
          </div>
        )}

        {activeActor && (
          <>
            <StatusRow
              label="NAME"
              value={
                activeActor
                  .definition.name
              }
            />

            <StatusRow
              label="ACTOR VERSION"
              value={
                activeActor
                  .definition.version
              }
            />

            <StatusRow
              label="SOURCE CANVAS"
              value={`${activeActor.definition.width} x ${activeActor.definition.height}`}
            />

            <StatusRow
              label="LAYERS"
              value={`${layerCount}`}
              active={
                layerCount > 0
              }
            />

            <StatusRow
              label="BLINK"
              value={
                activeActor
                  .definition
                  .animations
                  ?.blink
                  ?.enabled
                  ? "ENABLED"
                  : "WAITING FOR LAYERS"
              }
              active={
                Boolean(
                  activeActor
                    .definition
                    .animations
                    ?.blink
                    ?.enabled,
                )
              }
            />

            <StatusRow
              label="RIG"
              value="ONLINE"
              active
            />
          </>
        )}
      </aside>

      <footer
        style={{
          position: "absolute",
          left: 28,
          bottom: 22,
          color:
            "rgba(255,255,255,0.42)",
          fontSize: 12,
          letterSpacing: "0.08em",
          pointerEvents: "none",
        }}
      >
        {actorStatus === "ready"
          ? `${layerCount} LAYERS · RUNTIME ACTIVE`
          : actorStatus === "loading"
            ? "LOADING ACTOR LAYERS"
            : "ACTOR LOAD FAILED"}
      </footer>
    </section>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        margin: "13px 0",
        background:
          "rgba(104,215,255,0.15)",
      }}
    />
  );
}

function StatusRow({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: 18,
      }}
    >
      <span
        style={{
          color:
            "rgba(255,255,255,0.43)",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: active
            ? "#77f5bd"
            : "#ffffff",
          textAlign: "right",
        }}
      >
        {active ? "● " : ""}
        {value}
      </span>
    </div>
  );
}