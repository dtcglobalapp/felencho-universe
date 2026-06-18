"use client";

import { useEffect, useState } from "react";

const characters = [
  {
    name: "Bob",
    id: "37e736a2-38ef-4de3-8ae9-2df61c2281d2",
    defaultUser: "Felencho",
    defaultMessage: "Hola Bob, preséntate como parte de Lumina Studio.",
  },
  {
    name: "Lina",
    id: "adec8041-03d0-41c9-a8ec-8e9f7ab68010",
    defaultUser: "Felencho",
    defaultMessage: "Hola Lina. Preséntate para los oyentes de Felencho Mundial.",
  },
  {
    name: "Felencho Virtual",
    id: "7da1296c-41ca-4729-b893-6a4f9a7b645b",
    defaultUser: "Miriam Garcia",
    defaultMessage: "Miriam acaba de entrar al estudio. Salúdala.",
  },
];

type LuminaMessage = {
  id: string;
  created_at: string;
  conversation_id: string;
  speaker: string;
  target: string | null;
  message: string;
  message_type: string;
  platform: string | null;
  language: string | null;
};

export default function LuminaVoiceConsolePage() {
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0].id);
  const selectedCharacter =
    characters.find((item) => item.id === selectedCharacterId) || characters[0];

  const [message, setMessage] = useState(selectedCharacter.defaultMessage);
  const [userName, setUserName] = useState(selectedCharacter.defaultUser);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [debug, setDebug] = useState<any>(null);
  const [history, setHistory] = useState<LuminaMessage[]>([]);

  async function loadHistory() {
    try {
      const response = await fetch("/api/lumina/messages", {
        cache: "no-store",
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        const filtered = data
          .filter((item: LuminaMessage) => {
            return item.conversation_id === "lumina-studio-v1";
          })
          .slice(-30);

        setHistory(filtered);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
  }

  useEffect(() => {
    loadHistory();

    const timer = setInterval(() => {
      loadHistory();
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  function changeCharacter(characterId: string) {
    const character = characters.find((item) => item.id === characterId);

    if (!character) return;

    setSelectedCharacterId(character.id);
    setMessage(character.defaultMessage);
    setUserName(character.defaultUser);
    setReply("");
    setStatus("");
    setDebug(null);
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Este navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setStatus("Escuchando... habla ahora.");

    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";

      if (transcript) {
        setMessage(transcript);
        setStatus("Voz capturada. Revisa el mensaje y presiona Enviar y hablar.");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setStatus("Error escuchando el micrófono.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }

  async function sendMessage() {
    try {
      setLoading(true);
      setStatus("Pensando y generando voz...");
      setReply("");
      setDebug(null);

      const response = await fetch("/api/lumina/chat-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character_id: selectedCharacterId,
          user_message: message,
          conversation_id: "lumina-studio-v1",
          channel: "felencho.ai",
          language: "es",
          user_name: userName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("Error.");
        setDebug(data);
        return;
      }

      setReply(data.reply || "");
      setDebug(data.chat || data);

      await loadHistory();

      if (data.audio_base64) {
        const audio = new Audio(
          `data:${data.audio_mime_type || "audio/mpeg"};base64,${data.audio_base64}`
        );

        await audio.play();
        setStatus("Audio reproducido.");
      } else {
        setStatus("Respuesta recibida, pero sin audio.");
      }
    } catch (error: any) {
      setStatus("Error reproduciendo audio.");
      setDebug(error?.message || error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <h1 className="text-3xl font-bold">Lumina Voice Console</h1>

          <p className="mt-2 text-sm text-zinc-400">
            Consola interna para probar Bob, Lina y Felencho Virtual con memoria, voz y micrófono.
          </p>

          <div className="mt-8">
            <label className="mb-2 block text-sm text-zinc-400">Avatar</label>
            <select
              className="w-full rounded-lg bg-zinc-900 p-3 text-white outline-none"
              value={selectedCharacterId}
              onChange={(e) => changeCharacter(e.target.value)}
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm text-zinc-400">Usuario</label>
            <input
              className="w-full rounded-lg bg-zinc-900 p-3 text-white outline-none"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm text-zinc-400">Mensaje</label>
            <textarea
              className="w-full rounded-lg bg-zinc-900 p-4 text-white outline-none"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={sendMessage}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Generando..." : "Enviar y hablar"}
            </button>

            <button
              onClick={startListening}
              disabled={isListening || loading}
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {isListening ? "Escuchando..." : "🎤 Escuchar"}
            </button>
          </div>

          {status && (
            <p className="mt-4 text-sm text-zinc-400">
              Estado: {status}
            </p>
          )}

          {reply && (
            <section className="mt-6 rounded-xl bg-zinc-900 p-5">
              <h2 className="text-xl font-semibold">Última respuesta</h2>
              <p className="mt-3 leading-7 text-zinc-200">{reply}</p>
            </section>
          )}

          {debug && (
            <section className="mt-6 rounded-xl bg-zinc-900 p-5">
              <h2 className="text-xl font-semibold">Memoria usada</h2>
              <pre className="mt-3 max-h-64 overflow-auto text-xs text-zinc-300">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </section>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">Conversación</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Últimos mensajes guardados en lumina_messages.
              </p>
            </div>

            <button
              onClick={loadHistory}
              className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Actualizar
            </button>
          </div>

          <div className="mt-6 max-h-[760px] space-y-4 overflow-y-auto pr-2">
            {history.length === 0 && (
              <p className="text-zinc-500">No hay mensajes todavía.</p>
            )}

            {history.map((item) => {
              const isAvatar = characters.some(
                (character) => character.name === item.speaker
              );

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl p-4 ${
                    isAvatar
                      ? "ml-8 border border-blue-500/20 bg-blue-950/40"
                      : "mr-8 border border-white/10 bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {isAvatar ? "🤖 " : "🧑 "}
                      {item.speaker}
                      {item.target ? ` → ${item.target}` : ""}
                    </p>

                    <p className="text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  <p className="mt-3 leading-7 text-zinc-200">
                    {item.message}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}