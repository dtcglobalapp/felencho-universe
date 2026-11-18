"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "felencho.teleprompter.lab.v2";
const OLD_KEY = "felencho.teleprompter.lab.v1";
const DEMO = "¡Saludos, mi gente! Bienvenidos a Felencho Mundial.\n\nHoy abrimos un espacio para preguntar, investigar y escuchar distintas perspectivas.\n\nBob y Lina nos acompañan en esta conversación.\n\n[PAUSA] Vamos con la primera pregunta.";

type Saved = { script: string; size: number; mirror: boolean; scrollTop: number; scriptId?: string };
function valid(n: unknown, lo: number, hi: number, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}
export default function TeleprompterLab() {
  const [script, setScript] = useState(DEMO);
  const [size, setSize] = useState(54);
  const [mirror, setMirror] = useState(false);
  const [controls, setControls] = useState(false);
  const [ready, setReady] = useState(false);
  const [scriptId, setScriptId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Sin conexión a Felencho Director");
  const [sourceTitle, setSourceTitle] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const topRef = useRef(0);
  const restoreRef = useRef(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSnapshot = useRef<Saved>({ script: DEMO, size: 54, mirror: false, scrollTop: 0 });

  // Load the local snapshot *before* the first saved write; no server data is required.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
      if (raw) {
        const v: Partial<Saved> = JSON.parse(raw);
        if (typeof v.script === "string") setScript(v.script.slice(0, 100000));
        setSize(valid(v.size, 24, 100, 54));
        if (typeof v.mirror === "boolean") setMirror(v.mirror);
        if (typeof v.scriptId === "string") setScriptId(v.scriptId.slice(0, 80));
        restoreRef.current = valid(v.scrollTop, 0, 1e9, 0);
      }
    } catch { /* storage unavailable: demo remains usable */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = viewportRef.current;
    if (el) el.scrollTop = restoreRef.current;
  }, [ready]);

  const persist = useCallback(() => {
    try { localStorage.setItem(KEY, JSON.stringify(localSnapshot.current)); }
    catch { /* storage unavailable; reading still works */ }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localSnapshot.current = { script, size, mirror, scrollTop: topRef.current, scriptId };
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(persist, 200);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); persist(); };
  }, [script, size, mirror, scriptId, ready, persist]);

  useEffect(() => {
    if (!ready) return;
    const onVisibility = () => { if (document.visibilityState === "hidden") persist(); };
    const onPageHide = () => persist();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [ready, persist]);

  function onScroll() {
    const next = viewportRef.current?.scrollTop ?? 0;
    topRef.current = next;
    localSnapshot.current.scrollTop = next;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(persist, 350);
  }

  // Optional lab feed. Never loads private scripts without explicit opt-in.
  useEffect(() => {
    if (!syncEnabled || !ready) return;
    if (!scriptId.trim() || !accessToken.trim()) {
      setSyncStatus("Introduce ID y clave del laboratorio."); return;
    }
    let active = true;
    const read = async () => {
      try {
        const res = await fetch("/api/teleprompter-lab/script?script_id=" + encodeURIComponent(scriptId.trim()), {
          headers: { "x-felencho-teleprompter-token": accessToken }, cache: "no-store"
        });
        const body = await res.json();
        if (!active) return;
        if (!res.ok) { setSyncStatus(body.error || "No se pudo recibir el guion"); return; }
        if (!body.updated || !body.text) { setSyncStatus("Este episodio no contiene texto del presentador"); return; }
        const next = String(body.text).slice(0, 100000);
        setScript(current => {
          if (current !== next) {
            restoreRef.current = 0;
            topRef.current = 0;
            if (viewportRef.current) viewportRef.current.scrollTop = 0;
          }
          return next;
        });
        setSourceTitle(String(body.title || "").slice(0, 180));
        setSyncStatus("Guion recibido · Conexión activa");
      } catch {
        if (active) setSyncStatus("Sin conexión · Último guion conservado");
      }
    };
    read();
    const interval = setInterval(read, 8000);
    return () => { active = false; clearInterval(interval); };
  }, [syncEnabled, scriptId, accessToken, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        const el = viewportRef.current;
        if (!el) return;
        const amount = e.key === "PageDown" || e.key === "PageUp" ? Math.round(el.clientHeight * 0.65) : 95;
        el.scrollTop += (e.key === "ArrowUp" || e.key === "PageUp" ? -amount : amount);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/15 bg-black/95 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><strong className="text-cyan-300">FELENCHO MUNDIAL</strong><span className="ml-3 text-xs text-gray-400">ESTUDIO DE GUIONES · TELEPROMPTER</span></div>
          <button className="rounded border border-white/30 px-3 py-2" onClick={() => setControls(v => !v)}>
            {controls ? "Ocultar configuración" : "Configuración"}
          </button>
        </div>
        {controls && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button className="rounded border border-white/30 px-3 py-2" onClick={() => { topRef.current=0; if (viewportRef.current) viewportRef.current.scrollTop=0; persist(); }}>Volver al inicio</button>
          <button className="rounded border border-white/30 px-3 py-2" onClick={() => setMirror(v => !v)}>Espejo: {mirror ? "Sí" : "No"}</button>
          <label>Letra <input className="ml-1 w-28" aria-label="Tamaño de letra" type="range" min="24" max="100" value={size} onChange={e => setSize(Number(e.target.value))}/>{size}px</label>
          <details className="w-full rounded border border-cyan-900 p-2">
            <summary className="cursor-pointer text-cyan-300">Conectar guion desde Felencho Director (laboratorio)</summary>
            <p className="my-2 text-xs text-gray-300">La conexión actual es HTTP local, NO es apta para guiones privados. Requiere configurar un token en el servidor. No compartir la clave.</p>
            <label className="block text-sm">ID del guion de Felencho
              <input value={scriptId} onChange={e => { setSyncEnabled(false); setScriptId(e.target.value); }} autoComplete="off" className="ml-2 max-w-full rounded border border-white/40 bg-gray-950 p-2 text-white" />
            </label>
            <label className="mt-2 block text-sm">Clave local de prueba
              <input type="password" value={accessToken} onChange={e => { setSyncEnabled(false); setAccessToken(e.target.value); }} autoComplete="off" className="ml-2 max-w-full rounded border border-white/40 bg-gray-950 p-2 text-white" />
            </label>
            <button className="mt-3 rounded border border-cyan-500 px-3 py-2" onClick={() => setSyncEnabled(v => !v)}>{syncEnabled ? "Desconectar" : "Sincronizar con Felencho Director"}</button>
            <p className="mt-2 text-sm" role="status">{syncStatus}{sourceTitle ? " · " + sourceTitle : ""}</p>
          </details>
          <details className="w-full">
            <summary className="cursor-pointer text-cyan-300">Guion de prueba (solo en este navegador)</summary>
            <label className="mt-2 block text-xs text-gray-300" htmlFor="script-entry">Texto del presentador</label>
            <textarea id="script-entry" className="mt-2 h-40 w-full rounded border border-white/30 bg-gray-950 p-3 text-white" value={script} onChange={e => { setSyncEnabled(false); setScript(e.target.value.slice(0, 100000)); }} />
          </details>
          <p className="text-xs text-gray-400">La lectura se controla manualmente con BestView. La posición y el último guion se guardan en este iPad. Si Safari borra los datos, no será posible recuperarlos desde el navegador.</p>
        </div>}
      </header>
      <section className="relative bg-black">
        <div ref={viewportRef} onScroll={onScroll} className="h-[calc(100dvh-64px)] overflow-y-auto px-[7vw] py-[34vh] overscroll-contain" aria-label="Texto del teleprompter" tabIndex={0}>
          <div className="mx-auto max-w-5xl whitespace-pre-wrap font-semibold leading-[1.45] tracking-wide text-white" style={{ fontSize: size, transform: mirror ? "scaleX(-1)" : undefined, transformOrigin: "center" }}>{script}</div>
          <div className="h-[60vh]"/>
        </div>
      </section>
    </main>
  );
}
