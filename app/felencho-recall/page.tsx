"use client";

import { useState } from "react";

type MatchedMemory = {
  id: string;
  character_key?: string;
  category?: string;
  title?: string;
  memory_text?: string;
  importance?: number;
  visibility?: string;
  tags?: string[];
  matches?: string[];
  score?: number;
};

export default function FelenchoRecallPage() {
  const [characterKey, setCharacterKey] = useState("shared");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [recallText, setRecallText] = useState("");
  const [memories, setMemories] = useState<MatchedMemory[]>([]);
  const [error, setError] = useState("");

  async function testRecall() {
    setLoading(true);
    setError("");
    setRecallText("");
    setMemories([]);

    try {
      const res = await fetch("/api/lumina/brain-recall", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          character_key: characterKey,
          user_message: question
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error probando recall.");
      }

      setRecallText(json.data?.recall_text || "");
      setMemories(json.data?.matched_memories || []);
    } catch (err) {
      console.error(err);
      setError("No pude probar Felencho Recall.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho Recall
          </h1>
          <p className="mt-3 text-gray-300">
            Prueba de búsqueda inteligente en la memoria de Felencho Forever.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold text-yellow-300">
            Probar memoria
          </h2>

          <div className="mt-5 grid gap-4">
            <select
              className="rounded-xl border border-white/20 bg-black p-3"
              value={characterKey}
              onChange={(e) => setCharacterKey(e.target.value)}
            >
              <option value="shared">Shared</option>
              <option value="bob">Bob</option>
              <option value="lina">Lina</option>
              <option value="felencho_virtual">Felencho Virtual</option>
            </select>

            <textarea
              className="min-h-36 rounded-xl border border-white/20 bg-black p-3"
              placeholder="Ejemplo: ¿Quién es Raffy? / Háblame del niño y el radito"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <button
              onClick={testRecall}
              disabled={loading || !question.trim()}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-40"
            >
              {loading ? "Buscando recuerdos..." : "Buscar en Felencho Forever"}
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-purple-300">
              Recall Text
            </h2>

            <div className="mt-5 min-h-80 rounded-2xl border border-purple-500/20 bg-black p-5 text-gray-200">
              {recallText ? (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {recallText}
                </p>
              ) : (
                <p className="text-gray-500">
                  Aquí aparecerá el resumen de memorias encontradas.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-cyan-300">
              Memorias encontradas
            </h2>

            <div className="mt-5 space-y-4">
              {memories.length === 0 && (
                <p className="text-gray-500">
                  Todavía no hay memorias encontradas.
                </p>
              )}

              {memories.map((memory) => (
                <article
                  key={memory.id}
                  className="rounded-2xl border border-cyan-500/20 bg-black p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-white">
                      {memory.title || "Sin título"}
                    </h3>

                    <span className="rounded-full bg-cyan-900 px-3 py-1 text-xs text-cyan-100">
                      {memory.character_key}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-300">
                    {memory.memory_text}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{memory.category}</span>
                    <span>•</span>
                    <span>Importancia {memory.importance}</span>
                    <span>•</span>
                    <span>Score {memory.score}</span>
                  </div>

                  {memory.matches && memory.matches.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {memory.matches.map((match) => (
                        <span
                          key={match}
                          className="rounded-full bg-purple-900 px-2 py-1 text-xs text-purple-100"
                        >
                          {match}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}