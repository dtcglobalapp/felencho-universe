"use client";

import { useMemo, useState } from "react";
import {
  defaultFelenchoRunSheet,
  moveToNextSegment,
  moveToSegment,
} from "@/lib/StudioRunSheet";
import { buildTeleprompterScreen } from "@/lib/StudioTeleprompter";

export default function StudioTeleprompterPage() {
  const [runSheet, setRunSheet] = useState(defaultFelenchoRunSheet);
  const [fontSize, setFontSize] = useState(44);
  const [showControls, setShowControls] = useState(true);
  const screen = useMemo(() => buildTeleprompterScreen(runSheet), [runSheet]);
  const currentIndex = runSheet.segments.findIndex((segment) => segment.id === runSheet.currentSegmentId);

  return (
    <main className="min-h-screen bg-black px-5 py-7 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
          <div>
            <p className="text-xs font-bold tracking-[.2em] text-cyan-300">FELENCHO MUNDIAL · TELEPROMPTER PRIVADO</p>
            <h1 className="mt-2 text-xl font-semibold">{screen.currentSegment}</h1>
          </div>
          <button type="button" onClick={() => setShowControls((v) => !v)}
            className="rounded-xl border border-white/30 px-4 py-2 text-sm">
            {showControls ? "Ocultar controles" : "Mostrar controles"}
          </button>
        </header>

        {showControls && (
          <nav aria-label="Navegación del guion" className="mb-6 rounded-2xl border border-white/15 bg-zinc-950 p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button type="button" disabled={currentIndex <= 0}
                onClick={() => setRunSheet((old) => moveToSegment(old, old.segments[currentIndex - 1].id))}
                className="rounded-lg bg-zinc-800 px-4 py-2 disabled:opacity-40">Anterior</button>
              <button type="button" onClick={() => setRunSheet((old) => moveToNextSegment(old))}
                disabled={currentIndex >= runSheet.segments.length - 1}
                className="rounded-lg bg-cyan-400 px-4 py-2 font-bold text-black disabled:opacity-40">Siguiente bloque</button>
              <button type="button" onClick={() => setFontSize((v) => Math.max(28, v - 4))}
                className="rounded-lg bg-zinc-800 px-4 py-2">A−</button>
              <button type="button" onClick={() => setFontSize((v) => Math.min(76, v + 4))}
                className="rounded-lg bg-zinc-800 px-4 py-2">A+</button>
              <span className="text-sm text-zinc-400">Bloque {currentIndex + 1} de {runSheet.segments.length}</span>
            </div>
            <label className="block text-xs text-zinc-400" htmlFor="segment">Ir a un bloque</label>
            <select id="segment" className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white"
              value={runSheet.currentSegmentId} onChange={(event) => setRunSheet((old) => moveToSegment(old, event.target.value))}>
              {runSheet.segments.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.title}</option>
              ))}
            </select>
          </nav>
        )}

        <section aria-label="Texto del presentador" className="space-y-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-yellow-300">{screen.goal}</p>
          <p className="font-semibold leading-[1.35]" style={{ fontSize }}>{screen.bigCue}</p>
          {screen.voiceCues.length > 0 && (
            <div className="space-y-4" aria-label="Frases de conducción">
              {screen.voiceCues.map((cue, index) => (
                <div key={index} className={cue.action === "wake"
                  ? "rounded-2xl border-l-4 border-emerald-400 bg-emerald-950/35 p-5"
                  : "rounded-2xl border-l-4 border-violet-400 bg-violet-950/35 p-5"}>
                  <p className={cue.action === "wake" ? "mb-2 text-sm font-bold text-emerald-300" : "mb-2 text-sm font-bold text-violet-300"}>
                    {cue.action === "wake" ? "DAR LA PALABRA" : "REGRESAR A PRESENCIA"} · {cue.character.toUpperCase()}
                  </p>
                  <p className="font-semibold leading-[1.3]" style={{ fontSize: Math.max(28, fontSize - 6) }}>{cue.phrase}</p>
                </div>
              ))}
            </div>
          )}
          <p className="border-t border-white/15 pt-6 text-lg text-zinc-400">
            Próximo: {screen.nextSegment}
          </p>
        </section>
        <footer className="mt-10 text-xs text-zinc-500">
          Vista privada. Las frases son indicaciones para leer; abrir esta pantalla no activa el micrófono ni inicia sesiones.
        </footer>
      </div>
    </main>
  );
}
