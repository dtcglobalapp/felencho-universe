"use client";

import { useEffect, useRef, useState } from "react";
import { ACTOR_ENGINE } from "../lib/VERSION";

type PointerPosition = {
  x: number;
  y: number;
};

type CanvasMetrics = {
  width: number;
  height: number;
  fps: number;
};

export default function ActorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<PointerPosition>({ x: 0, y: 0 });

  const [pointer, setPointer] = useState<PointerPosition>({ x: 0, y: 0 });
  const [metrics, setMetrics] = useState<CanvasMetrics>({
    width: 0,
    height: 0,
    fps: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrameId = 0;
    let previousFrameTime = performance.now();
    let fpsAccumulator = 0;
    let fpsFrames = 0;
    let lastFpsUpdate = previousFrameTime;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(bounds.height * pixelRatio));

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      setMetrics((current) => ({
        ...current,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      }));
    };

    const drawGrid = (width: number, height: number) => {
      const gridSize = 50;

      context.save();
      context.lineWidth = 1;

      for (let x = 0; x <= width; x += gridSize) {
        context.beginPath();
        context.strokeStyle =
          x % (gridSize * 4) === 0
            ? "rgba(90, 210, 255, 0.14)"
            : "rgba(255, 255, 255, 0.045)";
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, height);
        context.stroke();
      }

      for (let y = 0; y <= height; y += gridSize) {
        context.beginPath();
        context.strokeStyle =
          y % (gridSize * 4) === 0
            ? "rgba(90, 210, 255, 0.14)"
            : "rgba(255, 255, 255, 0.045)";
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
        context.stroke();
      }

      context.restore();
    };

    const drawStageCenter = (width: number, height: number) => {
      const centerX = width / 2;
      const centerY = height / 2;

      context.save();

      context.strokeStyle = "rgba(92, 220, 255, 0.75)";
      context.lineWidth = 1;

      context.beginPath();
      context.moveTo(centerX - 30, centerY);
      context.lineTo(centerX + 30, centerY);
      context.moveTo(centerX, centerY - 30);
      context.lineTo(centerX, centerY + 30);
      context.stroke();

      context.beginPath();
      context.arc(centerX, centerY, 11, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = "rgba(125, 225, 255, 0.9)";
      context.font = "12px Arial, sans-serif";
      context.fillText(
        `STAGE CENTER  ${Math.round(centerX)}, ${Math.round(centerY)}`,
        centerX + 20,
        centerY - 18,
      );

      context.restore();
    };

    const drawPointer = () => {
      const currentPointer = pointerRef.current;

      context.save();
      context.strokeStyle = "rgba(255, 255, 255, 0.35)";
      context.lineWidth = 1;

      context.beginPath();
      context.arc(
        currentPointer.x,
        currentPointer.y,
        7,
        0,
        Math.PI * 2,
      );
      context.stroke();

      context.restore();
    };

    const render = (currentTime: number) => {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width;
      const height = bounds.height;

      const frameDuration = currentTime - previousFrameTime;
      previousFrameTime = currentTime;

      if (frameDuration > 0) {
        fpsAccumulator += 1000 / frameDuration;
        fpsFrames += 1;
      }

      if (currentTime - lastFpsUpdate >= 500 && fpsFrames > 0) {
        const averageFps = Math.round(fpsAccumulator / fpsFrames);

        setMetrics((current) => ({
          ...current,
          fps: averageFps,
        }));

        fpsAccumulator = 0;
        fpsFrames = 0;
        lastFpsUpdate = currentTime;
      }

      context.clearRect(0, 0, width, height);

      const background = context.createRadialGradient(
        width / 2,
        height / 2,
        40,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72,
      );

      background.addColorStop(0, "#111b22");
      background.addColorStop(0.52, "#080c10");
      background.addColorStop(1, "#020304");

      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      drawGrid(width, height);
      drawStageCenter(width, height);
      drawPointer();

      animationFrameId = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();

      const nextPointer = {
        x: Math.round(event.clientX - bounds.left),
        y: Math.round(event.clientY - bounds.top),
      };

      pointerRef.current = nextPointer;
      setPointer(nextPointer);
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    canvas.addEventListener("pointermove", handlePointerMove);
    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#020304",
        color: "#ffffff",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Felencho Actor Engine stage"
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
          top: 22,
          left: 24,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.25em",
            color: "#68d7ff",
            marginBottom: 7,
          }}
        >
          {ACTOR_ENGINE.shortName} / {ACTOR_ENGINE.codename.toUpperCase()}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(22px, 3vw, 38px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          {ACTOR_ENGINE.name}
        </h1>

        <p
          style={{
            margin: "7px 0 0",
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
          }}
        >
          Digital Actor Stage
        </p>
      </header>

      <aside
        style={{
          position: "absolute",
          top: 22,
          right: 24,
          minWidth: 230,
          padding: "16px 18px",
          border: "1px solid rgba(104, 215, 255, 0.2)",
          borderRadius: 12,
          background: "rgba(3, 8, 12, 0.78)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 15px 45px rgba(0,0,0,0.35)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          lineHeight: 1.8,
          pointerEvents: "none",
        }}
      >
        <StatusRow label="ENGINE" value={ACTOR_ENGINE.version} />
        <StatusRow label="STATUS" value={ACTOR_ENGINE.status} active />
        <StatusRow label="RENDERER" value="Canvas 2D" />
        <StatusRow
          label="RESOLUTION"
          value={`${metrics.width} x ${metrics.height}`}
        />
        <StatusRow label="FPS" value={`${metrics.fps}`} />
        <StatusRow label="ACTORS" value="0" />
        <StatusRow label="POINTER X" value={`${pointer.x}`} />
        <StatusRow label="POINTER Y" value={`${pointer.y}`} />
      </aside>

      <footer
        style={{
          position: "absolute",
          left: 24,
          bottom: 20,
          color: "rgba(255,255,255,0.38)",
          fontSize: 12,
          letterSpacing: "0.08em",
          pointerEvents: "none",
        }}
      >
        STAGE READY · WAITING FOR FIRST ACTOR
      </footer>
    </section>
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
        justifyContent: "space-between",
        gap: 22,
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.42)" }}>{label}</span>

      <span
        style={{
          color: active ? "#77f5bd" : "#ffffff",
          textAlign: "right",
        }}
      >
        {active ? "● " : ""}
        {value}
      </span>
    </div>
  );
}
