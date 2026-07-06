"use client";

import { useRef, useState } from "react";
import StudioSync from "@/lib/StudioSync";
import StudioAudio from "@/lib/StudioAudio";

const studioId = "new_york_physical";
const characters = ["bob", "lina", "felencho"];

const wakeWords = [
  { character: "bob", words: ["oye bob", "hola bob", "bob"] },
  { character: "lina", words: ["oye lina", "hola lina", "lina"] },
  { character: "felencho", words: ["felencho virtual", "felencho"] },
];

export default function StudioListenerPage() {
  const recognitionRef = useRef<any>(null);
  const syncRef = useRef<StudioSync | null>(null);
  const activeCharacterRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const [listening, setListening] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()} — ${message}`, ...prev].slice(0, 100)
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

  function findWakeCommand(text: string) {
    const clean = normalize(text);

    for (const item of wakeWords) {
      const word = item.words.find((wakeWord) => clean.includes(wakeWord));

      if (word) {
        const question = clean.replace(word, "").trim();

        return {
          character: item.character,
          wakeWord: word,
          question,
        };
      }
    }

    return null;
  }

  async function wakeCharacter(character: string) {
    activeCharacterRef.current = character;
    setActiveCharacter(character);

    await syncRef.current?.wakeOnly(character, characters);

    addLog(`🐸 ${character} despertó.`);
  }

  async function sleepActiveCharacter() {
    const character = activeCharacterRef.current;

    if (!character) return;

    await syncRef.current?.setPresence(character);

    addLog(`😴 ${character} volvió a Presence.`);

    activeCharacterRef.current = null;
    setActiveCharacter(null);
  }

  async function playAudioFromUrl(audioUrl: string) {
    StudioAudio.configure({
      onLog: addLog,
    });

    await StudioAudio.play(audioUrl);
  }

  async function sendToGateway(character: string, question: string) {
    if (processingRef.current) {
      addLog("⏳ Ya hay una respuesta en proceso. Ignorando entrada duplicada.");
      return;
    }

    processingRef.current = true;

    try {
      addLog(`🧠 Enviando a FelenchoGateway: ${character} → ${question}`);

      const response = await fetch("/api/felencho-gateway", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studioId,
          character,
          message: question,
          source: "studio_listener",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Error llamando FelenchoGateway.");
      }

      if (data?.text) {
        addLog(`💬 Respuesta: ${data.text}`);
      }

      if (data?.audioUrl) {
        await playAudioFromUrl(data.audioUrl);
      } else {
        addLog("⚠️ FelenchoGateway respondió sin audioUrl.");
      }
    } catch (error: any) {
      addLog(`❌ Error Gateway: ${error.message}`);
    } finally {
      processingRef.current = false;
      await sleepActiveCharacter();
    }
  }

  async function handleTranscript(text: string) {
    const clean = normalize(text);

    if (!clean) return;

    addLog(`Escuché: ${clean}`);

    const command = findWakeCommand(clean);

    if (command) {
      addLog(`🐸 Wake word detectada: ${command.character}`);

      await wakeCharacter(command.character);

      if (command.question) {
        addLog(`Pregunta detectada para ${command.character}: ${command.question}`);
        await sendToGateway(command.character, command.question);
      } else {
        addLog(`Esperando pregunta para ${command.character}...`);
      }

      return;
    }

    if (activeCharacterRef.current) {
      addLog(`Pregunta para ${activeCharacterRef.current}: ${clean}`);
      await sendToGateway(activeCharacterRef.current, clean);
      return;
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

  async function stopListening() {
    setListening(false);

    try {
      recognitionRef.current?.stop();
    } catch {}

    recognitionRef.current = null;

    StudioAudio.stop();

    await syncRef.current?.sleepAll(characters);

    syncRef.current?.unsubscribe();
    syncRef.current = null;

    activeCharacterRef.current = null;
    setActiveCharacter(null);

    addLog("StudioListener detenido. Todos volvieron a Presence.");
  }

  async function sleepNow() {
    StudioAudio.stop();
    await sleepActiveCharacter();
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
          <p className="mt-2 text-sm text-gray-500">Studio: {studioId}</p>
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

            <button
              onClick={sleepNow}
              disabled={!activeCharacter}
              className="rounded-xl bg-zinc-700 px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              Dormir personaje activo
            </button>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            Estado: {listening ? "Escuchando" : "Detenido"}
          </p>

          <p className="mt-1 text-sm text-gray-400">
            Personaje activo: {activeCharacter || "ninguno"}
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