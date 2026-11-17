"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "felencho.teleprompter.lab.v1";
const DEMO = "¡Saludos, mi gente! Bienvenidos a Felencho Mundial.\n\nHoy abrimos un espacio para preguntar, investigar y escuchar distintas perspectivas.\n\nBob y Lina nos acompañan en esta conversación.\n\n[PAUSA] Vamos con la primera pregunta.";

export default function TeleprompterLab() {
  const [script, setScript] = useState(DEMO);
  const [size, setSize] = useState(54);
  const [speed, setSpeed] = useState(28);
  const [mirror, setMirror] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [controls, setControls] = useState(true);
  const [ready, setReady] = useState(false);
  const [scriptId, setScriptId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Sin conexión a Felencho Director");
  const [sourceTitle, setSourceTitle] = useState("");
  const textRef = useRef<HTMLDivElement>(null);
  const scrolling = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.script === "string") setScript(parsed.script.slice(0, 100000));
        if (typeof parsed.size === "number") setSize(Math.max(24, Math.min(100, parsed.size)));
        if (typeof parsed.speed === "number") setSpeed(Math.max(0, Math.min(120, parsed.speed)));
        if (typeof parsed.mirror === "boolean") setMirror(parsed.mirror);
      }
    } catch { /* browser storage unavailable: demo remains usable */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(KEY, JSON.stringify({ script, size, speed, mirror })); }
    catch { /* temporary browser storage denial */ }
  }, [script, size, speed, mirror, ready]);
  useEffect(() => {
    if (!playing) { last.current = 0; return; }
    const tick = (now: number) => {
      if (last.current && textRef.current) {
        const delta = Math.min((now - last.current) / 1000, 0.1);
        const el = textRef.current;
        const next = el.scrollTop + delta * speed;
        el.scrollTop = next;
        if (el.scrollTop >= el.scrollHeight - el.clientHeight - 3) { setPlaying(false); return; }
      }
      last.current = now;
      scrolling.current = window.requestAnimationFrame(tick);
    };
    scrolling.current = window.requestAnimationFrame(tick);
    return () => { window.cancelAnimationFrame(scrolling.current); last.current = 0; };
  }, [playing, speed]);
  useEffect(() => {
    if (!syncEnabled || !ready) return;
    if (!scriptId.trim() || !accessToken.trim()) {
      setSyncStatus("Introduce el ID y la clave local.");
      return;
    }
    let active = true;
    const read = async () => {
      try {
        const res = await fetch("/api/teleprompter-lab/script?script_id=" + encodeURIComponent(scriptId.trim()), {
          headers: { "x-felencho-teleprompter-token": accessToken },
          cache: "no-store"
        });
        const body = await res.json();
        if (!active) return;
        if (!res.ok) { setSyncStatus(body.error || "Error de conexión"); return; }
        if (!body.updated || !body.text) { setSyncStatus("Guion sin texto asignado a Felencho"); return; }
        setScript(String(body.text).slice(0,100000));
        setSourceTitle(String(body.title || "").slice(0,180));
        setSyncStatus("Guion recibido · Sincronización activa");
      } catch {
        if (active) setSyncStatus("Conexión interrumpida · Conservando último guion");
      }
    };
    read();
    const interval = window.setInterval(read, 8000);
    return () => { active = false; window.clearInterval(interval); };
  }, [syncEnabled, scriptId, accessToken, ready]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") { e.preventDefault(); setPlaying(v => !v); }
      if (e.code === "ArrowUp") { e.preventDefault(); if (textRef.current) textRef.current.scrollTop -= 80; }
      if (e.code === "ArrowDown") { e.preventDefault(); if (textRef.current) textRef.current.scrollTop += 80; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/15 bg-black/95 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><strong className="text-cyan-300">FELENCHO MUNDIAL</strong><span className="ml-3 text-xs text-gray-400">ESTUDIO DE GUIONES · TELEPROMPTER</span></div>
          <button className="rounded border border-white/30 px-3 py-2" onClick={() => setControls(v => !v)}>{controls ? "Ocultar controles" : "Mostrar controles"}</button>
        </div>
        {controls && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button className="rounded bg-cyan-500 px-4 py-2 font-bold text-black" onClick={() => setPlaying(v => !v)}>{playing ? "Pausar" : "Iniciar"}</button>
          <button className="rounded border border-white/30 px-3 py-2" onClick={() => { if (textRef.current) textRef.current.scrollTop = 0; setPlaying(false); }}>Volver al inicio</button>
          <button className="rounded border border-white/30 px-3 py-2" onClick={() => setMirror(v => !v)}>Espejo: {mirror ? "Sí" : "No"}</button>
          <label>Letra <input className="ml-1 w-28" aria-label="Tamaño de letra" type="range" min="24" max="100" value={size} onChange={e=>setSize(Number(e.target.value))}/>{size}px</label>
          <label>Velocidad <input className="ml-1 w-28" aria-label="Velocidad de desplazamiento" type="range" min="0" max="120" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/>{speed}</label>
          <button className="rounded border border-white/30 px-3 py-2" onClick={() => { const el = document.getElementById("prompter-stage"); el?.requestFullscreen?.().catch(()=>{}); }}>Pantalla completa</button>
          <details className="w-full rounded border border-cyan-900 p-2">
            <summary className="cursor-pointer text-cyan-300">Conectar guion desde Felencho Director (laboratorio)</summary>
            <p className="my-2 text-xs text-gray-300">El servidor necesita FELENCHO_TELEPROMPTER_TOKEN configurado previamente. Solo en red privada de confianza; esta prueba no autentica usuarios individuales ni constituye acceso remoto seguro.</p>
            <label className="block text-sm">ID del guion de Felencho
              <input value={scriptId} onChange={e => { setSyncEnabled(false); setScriptId(e.target.value); }} autoComplete="off" className="ml-2 max-w-full rounded border border-white/40 bg-gray-950 p-2 text-white" />
            </label>
            <label className="mt-2 block text-sm">Clave local de prueba
              <input type="password" value={accessToken} onChange={e => { setSyncEnabled(false); setAccessToken(e.target.value); }} autoComplete="off" className="ml-2 max-w-full rounded border border-white/40 bg-gray-950 p-2 text-white" />
            </label>
            <button className="mt-3 rounded border border-cyan-500 px-3 py-2" onClick={() => setSyncEnabled(v => !v)}>{syncEnabled ? "Desconectar" : "Sincronizar con Felencho Director"}</button>
            <p className="mt-2 text-sm" role="status">{syncStatus}{sourceTitle ? " · " + sourceTitle : ""}</p>
            <p className="mt-1 text-xs text-gray-400">La clave no se guarda en este navegador. El último guion recibido sí queda almacenado localmente. No borres los datos del navegador antes de terminar el episodio.</p>
          </details>
          <details className="w-full">
            <summary className="cursor-pointer text-cyan-300">Editar guion de prueba (solo en este navegador)</summary>
            <label className="mt-2 block text-xs text-gray-300" htmlFor="script-entry">Texto del presentador</label>
            <textarea id="script-entry" className="mt-2 h-40 w-full rounded border border-white/30 bg-gray-950 p-3 text-white" value={script} onChange={e=>setScript(e.target.value.slice(0,100000))}/>
            <p className="mt-1 text-xs text-gray-400">Guardado local en este navegador. NO está sincronizado con Felencho Director ni con otros dispositivos. No introduzcas guiones privados en una versión pública.</p>
          </details>
        </div>}
      </header>
      <section id="prompter-stage" className="relative bg-black">
        <div ref={textRef} className="h-[calc(100dvh-72px)] overflow-y-auto px-[7vw] py-[35vh] overscroll-contain" aria-label="Texto del teleprompter">
          <div className="mx-auto max-w-5xl whitespace-pre-wrap font-semibold leading-[1.45] tracking-wide text-white" style={{ fontSize: size, transform: mirror ? "scaleX(-1)" : undefined, transformOrigin: "center" }}>
            {script}
          </div>
          <div className="h-[60vh]"/>
        </div>
      </section>
    </main>
  );
}
