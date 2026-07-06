"use client";

import { useEffect, useRef, useState } from "react";
import StudioSync from "@/lib/StudioSync";
import StudioAudio from "@/lib/StudioAudio";

const studioId = "new_york_physical";
const characters = ["bob", "lina", "felencho"];

const wakeWords = [
  {
    character: "bob",
    words: [
      "oye bob",
      "hola bob",
      "hey bob",
      "bob",
      "bo",
      "bot",
      "bop",
      "vos",
      "voz",
      "box",
    ],
  },
  {
    character: "lina",
    words: ["oye lina", "hola lina", "hey lina", "lina", "linda"],
  },
  {
    character: "felencho",
    words: [
      "felencho virtual",
      "hola felencho",
      "oye felencho",
      "felencho",
      "felenche",
      "felencio",
      "felincho",
      "fencho",
      "el fencho",
      "selenio",
      "selencho",
      "selencio",
      "femencho",
      "fe lencho",
    ],
  },
];

export default function StudioListenerPage() {
  const recognitionRef = useRef<any>(null);
  const syncRef = useRef<StudioSync | null>(null);
  const activeCharacterRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const listeningRef = useRef(false);
  const pausedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()} — ${message}`, ...prev].slice(0, 120)
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
      const word = item.words.find((wakeWord) => {
        const normalizedWakeWord = normalize(wakeWord);
        return clean === normalizedWakeWord || clean.includes(normalizedWakeWord);
      });

      if (word) {
        const question = clean.replace(normalize(word), "").trim();

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

      activeCharacterRef.current = null;
      setActiveCharacter(null);
    }
  }

  async function handleTranscript(text: string) {
    if (pausedRef.current) return;
    if (processingRef.current) return;

    const clean = normalize(text);

    if (!clean) return;

    addLog(`Escuché: ${clean}`);

    const command = findWakeCommand(clean);

    if (!command) {
      addLog("Sin wake word detectada.");
      return;
    }

    addLog(`🐸 Wake word detectada: ${command.character} (${command.wakeWord})`);

    await wakeCharacter(command.character);

    if (command.question) {
      addLog(`Pregunta detectada para ${command.character}: ${command.question}`);
      await sendToGateway(command.character, command.question);
    } else {
      addLog(`Esperando pregunta para ${command.character}...`);
    }
  }

  function scheduleReconnect(recognition: any) {
    if (!listeningRef.current || pausedRef.current) return;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = window.setTimeout(() => {
      if (!listeningRef.current || pausedRef.current) return;

      try {
        addLog("🎙 Reconectando micrófono...");
        recognition.start();
      } catch {}
    }, 2500);
  }

  function startListening() {
    if (listeningRef.current) return;

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
      listeningRef.current = true;
      setListening(true);
      addLog("🎙 StudioListener activo automáticamente. El estudio está escuchando.");
    };

    recognition.onresult = async (event: any) => {
      const last = event.results[event.results.length - 1];
      const text = last[0]?.transcript || "";
      await handleTranscript(text);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        return;
      }

      addLog(`Error micrófono: ${event.error}`);
    };

    recognition.onend = () => {
      scheduleReconnect(recognition);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {}
  }

  async function stopListening() {
    listeningRef.current = false;
    pausedRef.current = true;
    setListening(false);
    setPaused(true);

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

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

    addLog("⏸ StudioListener pausado. Todos volvieron a Presence.");
  }

  function resumeListening() {
    pausedRef.current = false;
    setPaused(false);
    listeningRef.current = false;

    addLog("▶️ Reanudando StudioListener.");

    startListening();
  }

  useEffect(() => {
    if (autoStartedRef.current) return;

    autoStartedRef.current = true;

    const timer = window.setTimeout(() => {
      pausedRef.current = false;
      setPaused(false);
      startListening();
    }, 800);

    return () => {
      window.clearTimeout(timer);

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      listeningRef.current = false;

      try {
        recognitionRef.current?.stop();
      } catch {}

      StudioAudio.stop();

      syncRef.current?.sleepAll(characters);
      syncRef.current?.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-zinc-950 p-6">
          <h1 className="text-4xl font-black text-cyan-300">
            Felencho Studio Listener
          </h1>

          <p className="mt-2 text-gray-400">
            El estudio está vivo. Escucha desde La Bestia y despierta personajes por voz.
          </p>

          <p className="mt-2 text-sm text-gray-500">Studio: {studioId}</p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="rounded-2xl border border-cyan-500/20 bg-black p-5">
            <p className="text-lg font-bold text-cyan-300">
              {paused
                ? "⏸ Escucha pausada"
                : listening
                  ? "🎙 Escuchando automáticamente"
                  : "⏳ Iniciando escucha..."}
            </p>

            <p className="mt-2 text-sm text-gray-400">
              Personaje activo: {activeCharacter || "ninguno"}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Habla naturalmente: Bob, Lina o Felencho.
            </p>

            <div className="mt-4 flex gap-3">
              {paused ? (
                <button
                  onClick={resumeListening}
                  className="rounded-xl bg-green-400 px-4 py-2 text-sm font-bold text-black"
                >
                  Reanudar escucha
                </button>
              ) : (
                <button
                  onClick={stopListening}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-white"
                >
                  Pausar escucha
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-bold text-yellow-300">Logs</h2>

          <div className="mt-4 max-h-96 overflow-auto rounded-2xl bg-black p-4 text-sm text-gray-300">
            {logs.length === 0 ? (
              <p className="text-gray-500">Esperando eventos del estudio...</p>
            ) : (
              logs.map((log, index) => <p key={index}>{log}</p>)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}