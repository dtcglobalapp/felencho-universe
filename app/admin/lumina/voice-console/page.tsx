"use client";

import { useState } from "react";

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
    defaultMessage: "Hola Lina, preséntate como parte de Lumina Studio.",
  },
  {
    name: "Felencho Virtual",
    id: "7da1296c-41ca-4729-b893-6a4f9a7b645b",
    defaultUser: "Miriam Garcia",
    defaultMessage: "Miriam acaba de entrar al estudio. Salúdala.",
  },
];

export default function LuminaVoiceConsolePage() {
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0].id);
  const selectedCharacter =
    characters.find((item) => item.id === selectedCharacterId) || characters[0];

  const [message, setMessage] = useState(selectedCharacter.defaultMessage);
  const [userName, setUserName] = useState(selectedCharacter.defaultUser);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<any>(null);

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
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold">Lumina Voice Console</h1>

        <p className="mt-2 text-zinc-400">
          Consola interna para probar Bob, Lina y Felencho Virtual con memoria y voz.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div>
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

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Usuario</label>
            <input
              className="w-full rounded-lg bg-zinc-900 p-3 text-white outline-none"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm text-zinc-400">Mensaje</label>
          <textarea
            className="w-full rounded-lg bg-zinc-900 p-4 text-white outline-none"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          onClick={sendMessage}
          disabled={loading}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Generando..." : "Enviar y hablar"}
        </button>

        {status && (
          <p className="mt-4 text-sm text-zinc-400">
            Estado: {status}
          </p>
        )}

        {reply && (
          <section className="mt-8 rounded-xl bg-zinc-900 p-5">
            <h2 className="text-xl font-semibold">Respuesta</h2>
            <p className="mt-3 leading-7 text-zinc-200">{reply}</p>
          </section>
        )}

        {debug && (
          <section className="mt-6 rounded-xl bg-zinc-900 p-5">
            <h2 className="text-xl font-semibold">Memoria usada</h2>
            <pre className="mt-3 overflow-auto text-xs text-zinc-300">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}