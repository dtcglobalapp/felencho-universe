// app/felencho-brain/FelenchoBrainClient.tsx

"use client";

import { useEffect, useState } from "react";

type Memory = {
  id: string;
  character_key: string;
  category: string;
  title: string;
  memory_text: string;
  importance: number;
  visibility: string;
  source: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
};

type InboxMemory = {
  id: string;
  suggested_by: string;
  character_key: string;
  category: string;
  title: string;
  memory_text: string;
  reason?: string;
  importance: number;
  visibility: string;
  tags: string[];
  status: string;
  created_at: string;
};

export default function FelenchoBrainClient() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [inbox, setInbox] = useState<InboxMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    character_key: "shared",
    category: "biography",
    title: "",
    memory_text: "",
    importance: 7,
    visibility: "private",
    tags: "",
  });

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const memoriesRes = await fetch("/api/felencho-brain/memories");
      const memoriesJson = await memoriesRes.json();

      const inboxRes = await fetch("/api/felencho-brain/memory-inbox");
      const inboxJson = await inboxRes.json();

      setMemories(memoriesJson.data || []);
      setInbox(inboxJson.data || []);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando Felencho Brain.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createMemory() {
    if (!form.title.trim() || !form.memory_text.trim()) {
      setMessage("Debes escribir título y memoria.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/felencho-brain/memories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character_key: form.character_key,
          category: form.category,
          title: form.title,
          memory_text: form.memory_text,
          importance: Number(form.importance),
          visibility: form.visibility,
          source: "manual",
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error creando memoria.");
      }

      setForm({
        character_key: "shared",
        category: "biography",
        title: "",
        memory_text: "",
        importance: 7,
        visibility: "private",
        tags: "",
      });

      setMessage("Memoria guardada correctamente.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Error guardando memoria.");
    } finally {
      setLoading(false);
    }
  }

  async function approveMemory(id: string) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/felencho-brain/memory-inbox/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          reviewed_by: "felencho_humano",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error aprobando memoria.");
      }

      setMessage("Memoria aprobada y enviada al cerebro oficial.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Error aprobando memoria.");
    } finally {
      setLoading(false);
    }
  }

  async function rejectMemory(id: string) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/felencho-brain/memory-inbox/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          reviewed_by: "felencho_humano",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error rechazando memoria.");
      }

      setMessage("Memoria rechazada.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Error rechazando memoria.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho Brain
          </h1>
          <p className="mt-3 text-gray-300">
            Centro de memoria para Felencho Virtual, Bob, Lina y el universo Felencho.ai.
          </p>

          {message && (
            <div className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-4 text-cyan-100">
              {message}
            </div>
          )}
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-yellow-300">
              Agregar memoria manual
            </h2>

            <div className="mt-5 space-y-4">
              <select
                className="w-full rounded-xl bg-black border border-white/20 p-3"
                value={form.character_key}
                onChange={(e) =>
                  setForm({ ...form, character_key: e.target.value })
                }
              >
                <option value="shared">Shared</option>
                <option value="felencho_virtual">Felencho Virtual</option>
                <option value="bob">Bob</option>
                <option value="lina">Lina</option>
              </select>

              <select
                className="w-full rounded-xl bg-black border border-white/20 p-3"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                <option value="biography">Biografía</option>
                <option value="family">Familia</option>
                <option value="music">Música</option>
                <option value="books">Libros</option>
                <option value="projects">Proyectos</option>
                <option value="guests">Invitados</option>
                <option value="opinions">Opiniones</option>
                <option value="studio">Estudio</option>
                <option value="dtc">DTC</option>
                <option value="streaming">Streaming</option>
                <option value="corrections">Correcciones</option>
              </select>

              <input
                className="w-full rounded-xl bg-black border border-white/20 p-3"
                placeholder="Título"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
              />

              <textarea
                className="min-h-40 w-full rounded-xl bg-black border border-white/20 p-3"
                placeholder="Escribe la memoria..."
                value={form.memory_text}
                onChange={(e) =>
                  setForm({ ...form, memory_text: e.target.value })
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="w-full rounded-xl bg-black border border-white/20 p-3"
                  value={form.importance}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      importance: Number(e.target.value),
                    })
                  }
                />

                <select
                  className="w-full rounded-xl bg-black border border-white/20 p-3"
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({ ...form, visibility: e.target.value })
                  }
                >
                  <option value="public">Pública</option>
                  <option value="private">Privada</option>
                  <option value="secret">Secreta</option>
                </select>
              </div>

              <input
                className="w-full rounded-xl bg-black border border-white/20 p-3"
                placeholder="Tags separados por coma"
                value={form.tags}
                onChange={(e) =>
                  setForm({ ...form, tags: e.target.value })
                }
              />

              <button
                onClick={createMemory}
                disabled={loading}
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
              >
                Guardar memoria
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-purple-300">
              Memory Inbox
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Memorias sugeridas por Bob, Lina o Felencho Virtual pendientes de revisión.
            </p>

            <div className="mt-5 space-y-4">
              {inbox.length === 0 && (
                <p className="text-gray-400">No hay memorias pendientes.</p>
              )}

              {inbox.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-purple-500/20 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-white">
                      {item.title}
                    </h3>
                    <span className="rounded-full bg-purple-900 px-3 py-1 text-xs text-purple-100">
                      {item.suggested_by}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-300">{item.memory_text}</p>

                  {item.reason && (
                    <p className="mt-3 text-sm text-yellow-200">
                      Razón: {item.reason}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{item.character_key}</span>
                    <span>•</span>
                    <span>{item.category}</span>
                    <span>•</span>
                    <span>Importancia {item.importance}</span>
                    <span>•</span>
                    <span>{item.visibility}</span>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => approveMemory(item.id)}
                      disabled={loading}
                      className="rounded-xl bg-green-500 px-4 py-2 font-bold text-black hover:bg-green-300 disabled:opacity-50"
                    >
                      Aprobar
                    </button>

                    <button
                      onClick={() => rejectMemory(item.id)}
                      disabled={loading}
                      className="rounded-xl bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-400 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold text-cyan-300">
            Memorias aprobadas
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memories.length === 0 && (
              <p className="text-gray-400">Todavía no hay memorias aprobadas.</p>
            )}

            {memories.map((memory) => (
              <article
                key={memory.id}
                className="rounded-2xl border border-cyan-500/20 bg-black p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-white">
                    {memory.title}
                  </h3>
                  <span className="rounded-full bg-cyan-900 px-3 py-1 text-xs text-cyan-100">
                    {memory.character_key}
                  </span>
                </div>

                <p className="mt-3 text-gray-300">{memory.memory_text}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                  <span>{memory.category}</span>
                  <span>•</span>
                  <span>Importancia {memory.importance}</span>
                  <span>•</span>
                  <span>{memory.visibility}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}