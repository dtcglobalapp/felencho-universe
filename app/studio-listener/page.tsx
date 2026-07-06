"use client";

import { useRef, useState } from "react";
import StudioSync from "@/lib/StudioSync";

const studioId = "new_york_physical";

const wakeWords = [
  { character: "bob", words: ["bob", "oye bob", "hola bob"] },
  { character: "lina", words: ["lina", "oye lina", "hola lina"] },
  { character: "felencho", words: ["felencho", "felencho virtual"] },
];

export default function StudioListenerPage() {
  const recognitionRef = useRef<any>(null);
  const syncRef = useRef<StudioSync | null>(null);

  const [listening, setListening] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()} — ${message}`, ...prev].slice(0, 60)
    );
  }

  function normalize(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,!?¿¡]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function handleTranscript(text: string) {
    const clean = normalize(text);
    addLog(`Escuché: ${clean}`);

    for (const item of wakeWords) {
      const found = item.words.some((word) => clean.includes(word));

      if (found) {
        addLog(`🐸 Wake word detectada: ${item.character}`);
        await syncRef.current?.wakeOnly(item.character, [
          "bob",
          "lina",
          "felencho",
        ]);
        return;
      }
    }
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLog("Este navegador no soporta SpeechRecognition. Usa Chrome.");
      return;
    }

    const sync = new StudioSync({
      studioId,
      onLog: addLog,
    });

    syncRef.current = sync;
    sync.loadInitialState();
    sync.subscribe();

    const recognition = new SpeechRecognition();
    recognition.lang = "es-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      addLog("🎙 StudioListener activo. Di: Bob, Lina o Felencho.");
    };

    recognition.onresult = async (event: any) => {
      const last = event.results[event.results.length - 1];
      const text = last[0]?.transcript || "";
      await handleTranscript(text);
    };

    recognition.onerror = (event: any) => {
      addLog(`Error micrófono: ${event.error}`);
    };

    recognition.onend = () => {
      if (listening) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    setListening(false);

    try {
      recognitionRef.current?.stop();
    } catch {}

    recognitionRef.current = null;

    syncRef.current?.unsubscribe();
    syncRef.current = null;

    addLog("StudioListener detenido.");
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-zinc-950 p-6">
          <h1 className="text-4xl font-black text-cyan-300">
            Felencho Studio Listener
          </h1>
          <p className="mt-2 text-gray-400">
            Escucha la Rode desde La Bestia y despierta personajes por voz.
          </p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={startListening}
              disabled={listening}
              className="rounded-xl bg-green-400 px-5 py-3 font-bold text-black disabled:opacity-40"
            >
              Activar escucha
            </button>

            <button
              onClick={stopListening}
              disabled={!listening}
              className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              Detener
            </button>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            Estado: {listening ? "Escuchando" : "Detenido"}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-bold text-yellow-300">Logs</h2>

          <div className="mt-4 max-h-96 overflow-auto rounded-2xl bg-black p-4 text-sm text-gray-300">
            {logs.length === 0 ? (
              <p className="text-gray-500">Sin eventos todavía.</p>
            ) : (
              logs.map((log, index) => <p key={index}>{log}</p>)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}