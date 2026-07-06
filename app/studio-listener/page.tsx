"use client";

import { useRef, useState } from "react";
import StudioSync from "@/lib/StudioSync";
import StudioAudio from "@/lib/StudioAudio";
import { detectDirectedTurn, StudioCharacter } from "@/lib/StudioDirector";

const studioId = "new_york_physical";
const characters: StudioCharacter[] = ["bob", "lina", "felencho"];

const wakeWords = [
  {
    character: "bob" as StudioCharacter,
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
    character: "lina" as StudioCharacter,
    words: ["oye lina", "hola lina", "hey lina", "lina", "linda"],
  },
  {
    character: "felencho" as StudioCharacter,
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
  const activeCharacterRef = useRef<StudioCharacter | null>(null);
  const processingRef = useRef(false);
  const studioOnRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const [studioOn, setStudioOn] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<StudioCharacter | null>(null);
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

  function isShutdownCommand(text: string) {
    const clean = normalize(text);

    const commands = [
      "apaga el estudio",
      "apagar estudio",
      "deten el estudio",
      "detener estudio",
      "pausa estudio",
      "silencio estudio",
      "studio off",
      "stop studio",
    ];

    return commands.some((cmd) => clean.includes(cmd));
  }

  function characterLabel(character: string) {
    if (character === "bob") return "Bob";
    if (character === "lina") return "Lina";
    if (character === "felencho") return "Felencho Virtual";
    return character;
  }

  async function wakeCharacter(character: StudioCharacter) {
    activeCharacterRef.current = character;
    setActiveCharacter(character);

    await syncRef.current?.wakeOnly(character, characters);

    addLog(`🐸 ${characterLabel(character)} despertó.`);
  }

  async function sleepActiveCharacter() {
    const character = activeCharacterRef.current;

    if (!character) return;

    await syncRef.current?.setPresence(character);

    addLog(`😴 ${characterLabel(character)} volvió a Presence.`);

    activeCharacterRef.current = null;
    setActiveCharacter(null);
  }

  async function playAudioFromUrl(audioUrl: string) {
    StudioAudio.configure({
      onLog: addLog,
    });

    await StudioAudio.play(audioUrl);
  }

  async function sendToGateway(character: StudioCharacter, question: string) {
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

  async function runDirectedTurn(from: StudioCharacter, to: StudioCharacter, message: string) {
    addLog(
      `🎬 StudioDirector: ${characterLabel(from)} → ${characterLabel(to)} | ${message}`
    );

    await wakeCharacter(from);

    await sendToGateway(
      from,
      `Dile a ${characterLabel(to)} de forma breve y natural: ${message}`
    );

    if (!studioOnRef.current) return;

    await new Promise((resolve) => setTimeout(resolve, 500));

    await wakeCharacter(to);

    await sendToGateway(to, message);
  }

  async function handleTranscript(text: string) {
    if (!studioOnRef.current) return;
    if (processingRef.current) return;

    const clean = normalize(text);

    if (!clean) return;

    addLog(`Escuché: ${clean}`);

    if (isShutdownCommand(clean)) {
      addLog("🛑 Comando de apagado detectado.");
      await powerOffStudio();
      return;
    }

    const command = findWakeCommand(clean);

    if (!command) {
      addLog("Sin wake word detectada.");
      return;
    }

    addLog(`🐸 Wake word detectada: ${command.character} (${command.wakeWord})`);

    if (!command.question) {
      await wakeCharacter(command.character);
      addLog(`Esperando pregunta para ${command.character}...`);
      return;
    }

    const directedTurn = detectDirectedTurn(command.character, command.question);

    if (directedTurn) {
      await runDirectedTurn(
        directedTurn.from,
        directedTurn.to,
        directedTurn.message
      );
      return;
    }

    await wakeCharacter(command.character);

    addLog(`Pregunta detectada para ${command.character}: ${command.question}`);
    await sendToGateway(command.character, command.question);
  }

  function scheduleReconnect(recognition: any) {
    if (!studioOnRef.current) return;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimerRef.current = window.setTimeout(() => {
      if (!studioOnRef.current) return;

      try {
        addLog("🎙 Reconectando micrófono...");
        recognition.start();
      } catch {}
    }, 2500);
  }

  async function powerOnStudio() {
    if (studioOnRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLog("Este navegador no soporta SpeechRecognition. Usa Chrome.");
      return;
    }

    studioOnRef.current = true;
    setStudioOn(true);

    const sync = new StudioSync({
      studioId,
      onLog: addLog,
    });

    syncRef.current = sync;

    await sync.sleepAll(characters);
    await sync.loadInitialState();
    sync.subscribe();

    const recognition = new SpeechRecognition();

    recognition.lang = "es-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      addLog("🟢 Studio ON. El estudio está escuchando.");
    };

    recognition.onresult = async (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0]?.transcript || "";
      await handleTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return;
      addLog(`Error micrófono: ${event.error}`);
    };

    recognition.onend = () => {
      scheduleReconnect(recognition);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {}

    addLog("⚡ Felencho Studio OS encendido.");
  }

  async function powerOffStudio() {
    studioOnRef.current = false;
    setStudioOn(false);

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
    processingRef.current = false;

    addLog("🔴 Studio OFF. Micrófono apagado, personajes en Presence, cero consumo.");
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-zinc-950 p-6">
          <h1 className="text-4xl font-black text-cyan-300">
            Felencho Studio Listener
          </h1>

          <p className="mt-2 text-gray-400">
            Switch principal del estudio. Encendido escucha; apagado no consume.
          </p>

          <p className="mt-2 text-sm text-gray-500">Studio: {studioId}</p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="rounded-2xl border border-cyan-500/20 bg-black p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-bold text-cyan-300">
                  {studioOn ? "🟢 STUDIO ON" : "🔴 STUDIO OFF"}
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  Personaje activo: {activeCharacter || "ninguno"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {studioOn
                    ? "Habla naturalmente: Bob, Lina o Felencho."
                    : "Los personajes quedan en loop Presence. No hay micrófono activo."}
                </p>
              </div>

              <button
                onClick={studioOn ? powerOffStudio : powerOnStudio}
                className={
                  studioOn
                    ? "rounded-2xl bg-red-600 px-8 py-4 text-xl font-black text-white shadow-lg shadow-red-900/30"
                    : "rounded-2xl bg-green-400 px-8 py-4 text-xl font-black text-black shadow-lg shadow-green-900/30"
                }
              >
                {studioOn ? "APAGAR ESTUDIO" : "ENCENDER ESTUDIO"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              {characters.map((character) => {
                const isOn = studioOn && activeCharacter === character;

                return (
                  <div
                    key={character}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3"
                  >
                    <span className="font-bold text-white">
                      {characterLabel(character)}
                    </span>

                    <span className="flex items-center gap-2 text-sm text-gray-300">
                      <span
                        className={
                          isOn
                            ? "h-3 w-3 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]"
                            : "h-3 w-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                        }
                      />
                      {isOn ? "ON" : "OFF"}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Prueba: “Bob pregúntale a Lina quién fue Alan Turing”.
            </p>
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