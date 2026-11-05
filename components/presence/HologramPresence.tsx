"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HologramVoiceDemo from "./HologramVoiceDemo";

type Character = "bob" | "lina";

/**
 * Non-billable visual prototype for the studio's vertical displays.
 * No microphones, TTS, LiveAvatar sessions, or external media are started.
 * Replace the particle bust with an approved GLB character when assets arrive.
 */
export default function HologramPresence({ character }: { character: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const activityRef = useRef(0);
  const onActivity = useCallback((value: number) => { activityRef.current = value; }, []);
  const name = character.toLowerCase() === "lina" ? "Lina" : "Bob";
  const isLina = name === "Lina";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const ctx = context;
    let frame = 0;
    let active = true;
    let width = 1;
    let height = 1;
    let ratio = 1;

    // Coordinates describe a head and upper body in three dimensions.
    // This preview intentionally does NOT claim to be the final human likeness.
    const points: Array<[number, number, number, number]> = [];
    function ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, count: number) {
      for (let i = 0; i < count; i++) {
        const theta = Math.acos(1 - 2 * (i + 0.5) / count);
        const phi = i * Math.PI * (3 - Math.sqrt(5));
        const x = Math.sin(theta) * Math.cos(phi);
        const y = Math.cos(theta);
        const z = Math.sin(theta) * Math.sin(phi);
        // Keep front-facing and contour points, with sparse back geometry.
        points.push([cx + x * rx, cy + y * ry, cz + z * rz, (z + 1) / 2]);
      }
    }
    ellipsoid(0, -0.77, 0, isLina ? 0.58 : 0.66, 0.82, 0.45, 1250);
    ellipsoid(0, 0.25, 0, isLina ? 1.15 : 1.3, 0.72, 0.48, 1650);
    ellipsoid(0, -0.05, 0, 0.23, 0.43, 0.22, 270);

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    setReady(true);

    function draw(t: number) {
      if (!active) return;
      const seconds = t / 1000;
      const horizon = height * 0.52;
      const scale = Math.min(width * 0.39, height * 0.21);
      ctx.fillStyle = "#030911";
      ctx.fillRect(0, 0, width, height);

      const ambient = ctx.createRadialGradient(width / 2, horizon, 12, width / 2, horizon, width * 0.8);
      ambient.addColorStop(0, isLina ? "rgba(113,64,160,.21)" : "rgba(7,179,193,.19)");
      ambient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, width, height);

      const turn = Math.sin(seconds * 0.3) * 0.15;
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      const breathe = Math.sin(seconds * 1.6) * 0.012;
      const color = isLina ? "186,143,250" : "81,228,241";

      for (const [x, y, z, facing] of points) {
        const xx = x * c - z * s;
        const zz = x * s + z * c;
        const perspective = 3.5 / (3.5 + zz);
        const px = width / 2 + xx * scale * perspective;
        const py = horizon + (y + breathe) * scale * perspective;
        const alpha = Math.max(0.09, Math.min(0.8, (0.26 + facing * 0.48) * (0.8 + 0.2 * Math.sin(seconds * 2 + y * 9))));
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.fillRect(px, py, facing > 0.45 ? 1.5 : 1, facing > 0.45 ? 1.5 : 1);
      }

      // Speaking response indicator (not phoneme-accurate lip sync).
      const speaking = activityRef.current;
      if (speaking > 0.06) {
        ctx.fillStyle = `rgba(${color},${Math.min(0.75, speaking)})`;
        ctx.beginPath();
        ctx.ellipse(width / 2, horizon - scale * 0.93, scale * 0.12, scale * (0.024 + speaking * 0.074), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Transparent-feeling scanning band and studio pedestal.
      const scan = (seconds * 54) % height;
      ctx.fillStyle = `rgba(${color},0.055)`;
      ctx.fillRect(0, scan, width, 2);
      ctx.strokeStyle = `rgba(${color},0.32)`;
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.78, width * 0.3, height * 0.034, 0, 0, Math.PI * 2);
      ctx.stroke();
      frame = window.requestAnimationFrame(draw);
    }
    frame = window.requestAnimationFrame(draw);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [isLina]);

  return (
    <main style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: "#030911", color: "#dffaff", fontFamily: "Arial, sans-serif" }}>
      <canvas ref={canvasRef} aria-label={`Vista holográfica de prueba de ${name}`} style={{ display: "block", width: "100%", height: "100%" }} />
      <HologramVoiceDemo character={character} onActivity={onActivity} />
      <div style={{ position: "absolute", top: 24, left: 22, letterSpacing: "0.24em", fontSize: 11, opacity: 0.7 }}>FELENCHO MUNDIAL · HOLOGRAM MODE</div>
      <div style={{ position: "absolute", bottom: 58, left: 0, width: "100%", textAlign: "center", pointerEvents: "none" }}>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "0.1em", textShadow: "0 0 22px #1a94ac" }}>{name.toUpperCase()}</div>
        <div style={{ marginTop: 9, fontSize: 12, letterSpacing: "0.14em", opacity: 0.66 }}>{ready ? "VISUAL PROTOTYPE · NO LIVE SESSION" : "INITIALIZING"}</div>
      </div>
    </main>
  );
}
