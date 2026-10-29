"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import StudioSync from "@/lib/StudioSync";
import { presenceController, PresenceCharacterStatus } from "@/lib/PresenceController";

const studioId = "new_york_physical";
const characters = ["bob", "lina"] as const;
type CharacterId = (typeof characters)[number];

const modules = [
  { title: "Teleprompter", subtitle: "Guiones y frases del presentador", href: "/studio-teleprompter", icon: "⌨" },
  { title: "Studio Listener", subtitle: "Micrófono y comandos de voz", href: "/studio-listener", icon: "🎙" },
  { title: "Bob en pantalla", subtitle: "Presencia vertical · FireTV 1", href: "/presence/bob", icon: "📺" },
  { title: "Lina en pantalla", subtitle: "Presencia vertical · FireTV 2", href: "/presence/lina", icon: "📺" },
  { title: "Podcast", subtitle: "Producción y contenidos", href: "/podcast", icon: "🎬" },
  { title: "Felencho Brain", subtitle: "Conocimiento y seres inteligentes", href: "/felencho-brain", icon: "🧠" },
];

export default function StudioControlPage() {
  const syncRef = useRef<StudioSync | null>(null);
  const [statuses, setStatuses] = useState<PresenceCharacterStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [controlError, setControlError] = useState("");
  const [showLogs, setShowLogs] = useState(false);

  function addLog(message: string) {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} — ${message}`, ...prev].slice(0, 40));
    if (message.startsWith("Error")) setControlError(message);
  }

  function refresh() {
    setStatuses(characters.map((character) => presenceController.getStatus(character)));
  }

  useEffect(() => {
    const sync = new StudioSync({ studioId, onLog: addLog });
    syncRef.current = sync;
    void sync.loadInitialState();
    sync.subscribe();
    refresh();
    const unsubscribe = presenceController.subscribe(refresh);
    return () => {
      unsubscribe();
      sync.unsubscribe();
      syncRef.current = null;
    };
  }, []);

  async function runAction(name: string, action: (sync: StudioSync) => Promise<void>) {
    const sync = syncRef.current;
    if (!sync || pending) return;
    setPending(name);
    setControlError("");
    try {
      await action(sync);
      // Supabase Realtime broadcasts the result to all connected screens.
    } catch (error) {
      setControlError(error instanceof Error ? error.message : "No se pudo completar el comando.");
    } finally {
      setPending(null);
    }
  }

  function statusFor(character: CharacterId) {
    return statuses.find((item) => item.character === character) ?? presenceController.getStatus(character);
  }

  return (
    <main className="min-h-screen bg-[#080c13] p-4 text-white md:p-7">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-400/20 bg-[#101b29] px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-300">Felencho Mundial · Master Dashboard</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Felencho Studio OS</h1>
            <p className="mt-1 text-sm text-zinc-400">Centro de mando · Monitor 27G2G4 · Studio: {studioId}</p>
          </div>
          <Link href="/studio-teleprompter" className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-black hover:bg-cyan-300">
            Abrir teleprompter
          </Link>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
          <section className="rounded-3xl border border-white/10 bg-[#111824] p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">Seres inteligentes</h2>
                <p className="text-sm text-zinc-400">Los estados de presencia se sincronizan con las pantallas.</p>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300">Control manual de respaldo</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {characters.map((character) => {
                const status = statusFor(character);
                const live = status.mode === "live";
                return (
                  <article key={character} className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold capitalize">{character}</h3>
                      <span className={live
                        ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300"
                        : "rounded-full bg-slate-400/15 px-3 py-1 text-xs font-bold text-slate-300"}>
                        {live ? "Modo en vivo" : "Presencia"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-400">Estado: <span className="text-white">{status.state}</span></p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" disabled={!!pending} onClick={() => void runAction(`wake-${character}`, (sync) => sync.wakeOnly(character, [...characters]))}
                        className="rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black disabled:opacity-50">
                        Dar la palabra
                      </button>
                      <button type="button" disabled={!!pending} onClick={() => void runAction(`sleep-${character}`, (sync) => sync.setPresence(character))}
                        className="rounded-xl border border-white/20 bg-zinc-800 px-4 py-3 font-bold disabled:opacity-50">
                        A presencia
                      </button>
                    </div>
                    <Link href={`/presence/${character}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-cyan-300 underline">
                      Abrir pantalla de {character}
                    </Link>
                  </article>
                );
              })}
            </div>
            <button type="button" disabled={!!pending}
              onClick={() => void runAction("sleep-all", (sync) => sync.sleepAll([...characters]))}
              className="mt-5 w-full rounded-xl border border-rose-500/40 bg-rose-700/30 px-5 py-3 font-bold text-rose-100 disabled:opacity-50">
              Dormir Bob y Lina
            </button>
            <p className="mt-3 text-xs text-zinc-500">Este panel cambia el estado visual mediante Supabase. No confirma por sí solo el consumo ni el cierre de una sesión del proveedor.</p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111824] p-5">
            <h2 className="text-xl font-bold">Dirección del programa</h2>
            <p className="mt-1 text-sm text-zinc-400">Accesos directos para La Bestia, el guion y las pantallas.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {modules.map((module) => (
                <Link key={module.href} href={module.href} target="_blank" rel="noopener noreferrer"
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 hover:border-cyan-400/50 hover:bg-cyan-400/5">
                  <span aria-hidden="true" className="text-2xl">{module.icon}</span>
                  <h3 className="mt-2 font-bold">{module.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{module.subtitle}</p>
                </Link>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-sm font-bold text-amber-200">Control por voz</p>
              <p className="mt-2 text-sm text-zinc-300">“Bob, vamos contigo” · “Gracias, Bob. Seguimos”</p>
              <p className="mt-1 text-sm text-zinc-300">“Lina, te escuchamos” · “Gracias, Lina. Continuamos”</p>
              <p className="mt-2 text-xs text-zinc-500">Los comandos se escuchan desde Studio Listener; este dashboard no activa micrófonos automáticamente.</p>
            </div>
          </section>
        </div>

        {controlError && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">{controlError}</p>}

        <section className="rounded-2xl border border-white/10 bg-[#111824] p-4">
          <button type="button" onClick={() => setShowLogs((value) => !value)} className="text-sm font-bold text-cyan-300">
            {showLogs ? "Ocultar" : "Mostrar"} eventos del estudio ({logs.length})
          </button>
          {showLogs && <div className="mt-4 max-h-64 space-y-1 overflow-y-auto font-mono text-xs text-zinc-400">
            {logs.length ? logs.map((log, index) => <p key={index}>{log}</p>) : <p>Sin eventos.</p>}
          </div>}
        </section>
      </div>
    </main>
  );
}
