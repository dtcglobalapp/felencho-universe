"use client";

import { useState } from "react";

export default function FelenchoLivePage() {
  const [loading, setLoading] = useState(false);
  const [meetUrl, setMeetUrl] = useState("");
  const [error, setError] = useState("");
  const [raw, setRaw] = useState<any>(null);

  async function startFelenchoLive() {
    setLoading(true);
    setError("");
    setMeetUrl("");
    setRaw(null);

    try {
      const res = await fetch("/api/liveavatar/felencho-virtual/start-session", {
        method: "POST",
      });

      const json = await res.json();
      setRaw(json);

      if (!res.ok) {
        throw new Error(json.error || "No pude iniciar LiveAvatar.");
      }

      if (!json.meet_url) {
        throw new Error("LiveAvatar no devolvió meet_url.");
      }

      setMeetUrl(json.meet_url);
    } catch (err: any) {
      setError(err?.message || "Error iniciando Felencho LiveAvatar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho LiveAvatar
          </h1>
          <p className="mt-3 text-gray-300">
            Prueba directa de Felencho Virtual usando LiveAvatar FULL Mode.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <button
            onClick={startFelenchoLive}
            disabled={loading}
            className="rounded-xl bg-cyan-500 px-6 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-40"
          >
            {loading ? "Iniciando..." : "Iniciar Felencho LiveAvatar"}
          </button>

          {meetUrl && (
            <div className="mt-6 space-y-4">
              <a
                href={meetUrl}
                target="_blank"
                className="inline-block rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black"
              >
                Abrir en nueva ventana
              </a>

              <iframe
                src={meetUrl}
                className="h-[720px] w-full rounded-2xl border border-cyan-500/30 bg-black"
                allow="camera; microphone; fullscreen; autoplay"
              />
            </div>
          )}
        </section>

        {raw && (
          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-purple-300">
              Respuesta técnica
            </h2>
            <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-black p-4 text-xs text-gray-300">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}