"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HologramVoiceDemo from "./HologramVoiceDemo";

/**
 * Original visualizer inspired by the *interaction concept* of an audio-reactive
 * sci-fi scene. No source, styles or assets from the Sylenia demo are copied.
 * Character video is our existing local presence asset, not an invented avatar.
 * The browser voice demo drives an approximate visual energy pulse.
 */
export default function HologramPresence({ character }: { character: string }) {
  const isLina = character.toLowerCase() === "lina";
  const name = isLina ? "Lina" : "Bob";
  const videoSrc = isLina ? "/videos/lina.mp4" : "/videos/bob.mp4";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const energyRef = useRef(0);
  const onActivity = useCallback((level: number) => { energyRef.current = level; }, []);
  const [videoState, setVideoState] = useState<"loading" | "ready" | "missing">("loading");
  const [showPanels, setShowPanels] = useState(true);
  const [intensity, setIntensity] = useState(1);
  const [motion, setMotion] = useState(1);
  const accent = isLina ? "#a87ef9" : "#5be7f1";
  const rgb = isLina ? "168,126,249" : "91,231,241";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    const surface = ctx;
    let animation = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const stars = Array.from({ length: 190 }, (_, i) => ({
      x: ((i * 7919 + 31) % 10007) / 10007,
      y: ((i * 5099 + 123) % 10009) / 10009,
      r: 0.45 + (i % 5) * 0.26,
      phase: i * 1.618,
    }));
    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      surface.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    function project(lat: number, lon: number, rotation: number, radius: number, cx: number, cy: number) {
      const x = Math.cos(lat) * Math.cos(lon + rotation);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.sin(lon + rotation);
      return { x: cx + x * radius, y: cy + y * radius * 0.92, z };
    }
    function draw(timestamp: number) {
      const t = timestamp * 0.001;
      const pulse = energyRef.current;
      const cx = w * 0.5;
      const cy = h * 0.49;
      const r = Math.min(w * 0.28, h * 0.36);
      surface.fillStyle = "#050817";
      surface.fillRect(0, 0, w, h);

      // Procedural cosmic field and nebula-like diffuse light.
      for (const [x, y, size, color] of [
        [0.28, 0.35, 0.57, "77,35,145"],
        [0.72, 0.31, 0.58, "13,72,178"],
        [0.51, 0.78, 0.7, "88,24,121"],
      ] as const) {
        const radius = Math.max(w, h) * size;
        const g = surface.createRadialGradient(w * x, h * y, 0, w * x, h * y, radius);
        g.addColorStop(0, `rgba(${color},0.31)`);
        g.addColorStop(1, `rgba(${color},0)`);
        surface.fillStyle = g;
        surface.fillRect(0, 0, w, h);
      }

      surface.strokeStyle = "rgba(118,165,236,0.075)";
      surface.lineWidth = 1;
      const step = Math.max(35, Math.min(68, w / 25));
      for (let x = 0; x < w; x += step) {
        surface.beginPath(); surface.moveTo(x, 0); surface.lineTo(x, h); surface.stroke();
      }
      for (let y = 0; y < h; y += step) {
        surface.beginPath(); surface.moveTo(0, y); surface.lineTo(w, y); surface.stroke();
      }
      for (const star of stars) {
        const alpha = 0.24 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.7 + star.phase));
        surface.fillStyle = `rgba(142,205,255,${alpha})`;
        surface.beginPath();
        surface.arc(star.x * w, star.y * h, star.r, 0, 2 * Math.PI);
        surface.fill();
      }

      const halo = surface.createRadialGradient(cx, cy, r * 0.18, cx, cy, r * 1.65);
      halo.addColorStop(0, `rgba(${rgb},${0.12 + pulse * 0.22})`);
      halo.addColorStop(0.5, `rgba(${rgb},0.09)`);
      halo.addColorStop(1, `rgba(${rgb},0)`);
      surface.fillStyle = halo;
      surface.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4);

      // Rotating latitude/longitude wire sphere surrounds the actual character.
      // Draw rear lines faintly and front lines brightly for depth.
      const rotation = t * motion * 0.21;
      surface.lineWidth = 0.85;
      for (let latitudeIndex = -5; latitudeIndex <= 5; latitudeIndex++) {
        const lat = (latitudeIndex / 6) * (Math.PI / 2);
        for (let side = -1; side <= 1; side += 2) {
          surface.beginPath();
          let started = false;
          for (let j = 0; j <= 100; j++) {
            const lon = -Math.PI + (j / 100) * 2 * Math.PI;
            const p = project(lat, lon, rotation, r, cx, cy);
            if ((p.z >= 0 ? 1 : -1) !== side) { started = false; continue; }
            if (!started) { surface.moveTo(p.x, p.y); started = true; }
            else surface.lineTo(p.x, p.y);
          }
          surface.strokeStyle = `rgba(${rgb},${side > 0 ? 0.21 * intensity + pulse * 0.12 : 0.075})`;
          surface.stroke();
        }
      }
      for (let i = 0; i < 20; i++) {
        const lon = i * Math.PI / 10;
        for (let side = -1; side <= 1; side += 2) {
          surface.beginPath();
          let started = false;
          for (let j = 0; j <= 80; j++) {
            const lat = -Math.PI / 2 + (j / 80) * Math.PI;
            const p = project(lat, lon, rotation, r, cx, cy);
            if ((p.z >= 0 ? 1 : -1) !== side) { started = false; continue; }
            if (!started) { surface.moveTo(p.x, p.y); started = true; }
            else surface.lineTo(p.x, p.y);
          }
          surface.strokeStyle = `rgba(${rgb},${side > 0 ? 0.19 * intensity + pulse * 0.16 : 0.06})`;
          surface.stroke();
        }
      }
      surface.strokeStyle = `rgba(${rgb},0.48)`;
      surface.beginPath();
      surface.ellipse(cx, h * 0.85, r * 1.38, r * 0.16, 0, 0, Math.PI * 2);
      surface.stroke();

      // Simple audio-reactive monitor bars, driven by the demo speech activity.
      const bars = 45;
      for (let i = 0; i < bars; i++) {
        const noise = 0.28 + 0.72 * Math.abs(Math.sin(i * 0.73 + t * 4.2));
        const power = 0.08 + pulse * noise * intensity;
        const barHeight = Math.max(3, power * 40);
        surface.fillStyle = `rgba(${rgb},${0.35 + power * 0.5})`;
        surface.fillRect(w * 0.66 + i * (w * 0.3 / bars), h * 0.91 - barHeight, Math.max(2, w * 0.22 / bars), barHeight);
      }
      animation = requestAnimationFrame(draw);
    }
    animation = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animation); observer.disconnect(); };
  }, [rgb, intensity, motion]);

  return (
    <main style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: "#050817", color: "#d9f5ff", fontFamily: "Arial, sans-serif" }}>
      <canvas ref={canvasRef} aria-label={`Escenario cósmico de ${name}`} style={{ width: "100%", height: "100%", display: "block" }} />

      <div style={{ position: "absolute", top: "19%", left: "50%", transform: "translateX(-50%)", width: "min(38vw, 46vh)", height: "min(61vh, 70vw)", zIndex: 2, border: `1px solid rgba(${rgb},0.48)`, boxShadow: `0 0 50px rgba(${rgb},0.18), inset 0 0 35px rgba(${rgb},0.09)`, overflow: "hidden", background: "rgba(5,8,23,0.25)" }}>
        <video
          src={videoSrc}
          autoPlay muted loop playsInline preload="auto"
          onLoadedData={() => setVideoState("ready")}
          onError={() => setVideoState("missing")}
          style={{ width: "100%", height: "100%", objectFit: "contain", filter: "contrast(1.11) saturate(0.94)", opacity: videoState === "ready" ? 0.95 : 0 }}
        />
        {videoState !== "ready" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", color: "#b5d5e9", fontSize: 13, padding: 18 }}>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{name.toUpperCase()}</div>
            <div style={{ marginTop: 9 }}>{videoState === "missing" ? "No se encontró el video del personaje" : "Cargando personaje..."}</div>
            {videoState === "missing" && <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>{videoSrc}</div>}
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(180deg, rgba(${rgb},0.06), transparent 45%, rgba(${rgb},0.09))` }} />
      </div>
      <div style={{ position: "absolute", top: 15, left: 20, letterSpacing: "0.18em", fontSize: 11, zIndex: 5, color: "#8ec6ee" }}>FELENCHO MUNDIAL · HOLOGRAM MODE V2</div>
      <HologramVoiceDemo character={character} onActivity={onActivity} />

      {showPanels && (
        <>
          <aside style={{ position: "absolute", left: 20, top: 66, width: "min(285px, 23vw)", zIndex: 4, padding: 14, background: "rgba(8,12,28,0.79)", border: "1px solid #31527c", borderRadius: 8, fontSize: 11 }}>
            <div style={{ color: accent, marginBottom: 14, fontWeight: 700 }}>HOLOGRAM CONTROLS</div>
            <label style={{ display: "block", marginBottom: 8 }}>ROTACIÓN · {motion.toFixed(1)}</label>
            <input aria-label="Velocidad de rotación" type="range" min="0" max="3" step="0.1" value={motion} onChange={e => setMotion(Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
            <label style={{ display: "block", marginTop: 13, marginBottom: 8 }}>ENERGÍA · {intensity.toFixed(1)}</label>
            <input aria-label="Energía visual" type="range" min="0.2" max="3" step="0.1" value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
            <div style={{ marginTop: 15, opacity: 0.7, lineHeight: 1.6 }}>VISUAL: ACTIVO<br />PERSONAJE: {videoState === "ready" ? "VIDEO LOCAL" : "SIN VIDEO"}<br />VOZ: PRUEBA MANUAL</div>
          </aside>
          <aside style={{ position: "absolute", right: 20, bottom: "12%", width: "min(295px, 25vw)", zIndex: 4, padding: 14, background: "rgba(8,12,28,0.8)", border: "1px solid #31527c", borderRadius: 8, fontSize: 11 }}>
            <div style={{ color: accent, marginBottom: 10, fontWeight: 700 }}>AUDIO SPECTRUM · DEMO</div>
            <div style={{ height: 75, border: "1px solid #20314b", background: "repeating-linear-gradient(90deg, transparent 0 26px, #243553 27px 28px), repeating-linear-gradient(0deg, transparent 0 21px, #243553 22px 23px)" }} />
            <p style={{ opacity: 0.7, fontSize: 10 }}>Respuesta visual aproximada · no mide la señal del audio</p>
          </aside>
        </>
      )}
      <div style={{ position: "absolute", left: 0, bottom: 30, width: "100%", textAlign: "center", pointerEvents: "none", zIndex: 4 }}>
        <div style={{ fontSize: 33, letterSpacing: "0.12em", fontWeight: 800, textShadow: `0 0 19px ${accent}` }}>{name.toUpperCase()}</div>
        <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: "0.17em", marginTop: 7 }}>COSMIC STUDIO · PREVIEW LOCAL · SIN SESIÓN DE PAGO</div>
      </div>
      <button type="button" onClick={() => setShowPanels(v => !v)} style={{ position: "absolute", left: 20, bottom: 23, zIndex: 7, padding: 8, background: "rgba(8,12,28,.85)", color: "#b8e6fa", border: "1px solid #31527c", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>{showPanels ? "Ocultar controles" : "Mostrar controles"}</button>
    </main>
  );
}
