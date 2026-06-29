"use client";

import { useState } from "react";

type ConversationResponse = {
  character_key: string;
  character_name: string;
  user_message: string;
  text: string;
  audio_base64: string;
  audio_mime: string;
  voice_id: string;
  recall?: {
    search_terms?: string[];
    matched_memories?: unknown[];
    recall_text?: string;
  };
};

export default function FelenchoForeverTestPage() {
  const [characterKey, setCharacterKey] = useState("bob");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [audioSrc, setAudioSrc] = useState("");
  const [recallText, setRecallText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage() {
    setLoading(true);
    setError("");
    setAnswer("");
    setAudioSrc("");
    setRecallText("");

    try {
      const res = await fetch("/api/felencho-forever/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          character_key: characterKey,
          message
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error en conversación.");
      }

      const data = json.data as ConversationResponse;

      setAnswer(data.text || "");
      setRecallText(data.recall?.recall_text || "");

      if (data.audio_base64) {
        setAudioSrc(`data:${data.audio_mime || "audio/mpeg"};base64,${data.audio_base64}`);
      }
    } catch (err) {
      console.error(err);
      setError("No pude conectar con Felencho Forever Conversation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho Forever Test
          </h1>
          <p className="mt-3 text-gray-300">
            Prueba: texto → Felencho Brain → Recall → GPT → ElevenLabs Voice.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold text-yellow-300">
            Probar personaje
          </h2>

          <div className="mt-5 grid gap-4">
            <select
              className="rounded-xl border border-white/20 bg-black p-3"
              value={characterKey}
              onChange={(e) => setCharacterKey(e.target.value)}
            >
              <option value="bob">Bob</option>
              <option value="lina">Lina</option>
              <option value="felencho_virtual">Felencho Virtual</option>
            </select>

            <textarea
              className="min-h-36 rounded-xl border border-white/20 bg-black p-3"
              placeholder="Ejemplo: ¿Quién es Raffy?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-40"
            >
              {loading ? "Pensando y generando voz..." : "Hablar"}
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-purple-300">
              Respuesta
            </h2>

            <div className="mt-5 min-h-72 rounded-2xl border border-purple-500/20 bg-black p-5 text-gray-200">
              {answer ? (
                <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
              ) : (
                <p className="text-gray-500">
                  Aquí aparecerá la respuesta del personaje.
                </p>
              )}
            </div>

            {audioSrc && (
              <div className="mt-5">
                <audio controls src={audioSrc} className="w-full" />
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-cyan-300">
              Memorias usadas
            </h2>

            <div className="mt-5 min-h-72 rounded-2xl border border-cyan-500/20 bg-black p-5 text-gray-300">
              {recallText ? (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {recallText}
                </p>
              ) : (
                <p className="text-gray-500">
                  Aquí aparecerán las memorias recuperadas por Recall.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}