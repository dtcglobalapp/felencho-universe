"use client";

import { useEffect, useState } from "react";

type Entity = {
  id: string;
  entity_key: string;
  entity_type: string;
  name: string;
  display_name?: string;
  short_description?: string;
  full_description?: string;
  importance?: number;
  aliases?: string[];
  tags?: string[];
};

function makeKey(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function FelenchoKnowledgePage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    entity_type: "person",
    short_description: "",
    full_description: "",
    aliases: "",
    tags: "",
    importance: 8,
  });

  async function loadEntities() {
    const res = await fetch("/api/felencho-forever/knowledge");
    const json = await res.json();
    setEntities(json.data || []);
  }

  useEffect(() => {
    loadEntities();
  }, []);

  async function saveEntity() {
    if (!form.name.trim()) {
      setMessage("Debes escribir un nombre.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/felencho-forever/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          create_entity: true,
          entity_key: makeKey(form.name),
          entity_type: form.entity_type,
          name: form.name,
          display_name: form.name,
          short_description: form.short_description,
          full_description: form.full_description,
          aliases: form.aliases
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          tags: form.tags
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          importance: Number(form.importance),
          character_key: "shared",
          visibility: "private",
          source: "manual",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error guardando entidad.");
      }

      setMessage("Entidad guardada correctamente.");
      setForm({
        name: "",
        entity_type: "person",
        short_description: "",
        full_description: "",
        aliases: "",
        tags: "",
        importance: 8,
      });

      await loadEntities();
    } catch (err) {
      console.error(err);
      setMessage("Error guardando entidad.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho Knowledge
          </h1>
          <p className="mt-3 text-gray-300">
            Enciclopedia estructurada de Felencho Forever.
          </p>
        </header>

        {message && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-cyan-100">
            {message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-yellow-300">
              Agregar entidad
            </h2>

            <div className="mt-5 grid gap-4">
              <input
                className="rounded-xl border border-white/20 bg-black p-3"
                placeholder="Nombre: Raffy Durán"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <select
                className="rounded-xl border border-white/20 bg-black p-3"
                value={form.entity_type}
                onChange={(e) =>
                  setForm({ ...form, entity_type: e.target.value })
                }
              >
                <option value="person">Persona</option>
                <option value="family">Familia</option>
                <option value="song">Canción</option>
                <option value="album">Álbum</option>
                <option value="book">Libro</option>
                <option value="project">Proyecto</option>
                <option value="place">Lugar</option>
                <option value="company">Compañía</option>
                <option value="character">Personaje</option>
                <option value="object">Objeto</option>
                <option value="concept">Concepto</option>
                <option value="event">Evento</option>
                <option value="general">General</option>
              </select>

              <input
                className="rounded-xl border border-white/20 bg-black p-3"
                placeholder="Descripción corta"
                value={form.short_description}
                onChange={(e) =>
                  setForm({ ...form, short_description: e.target.value })
                }
              />

              <textarea
                className="min-h-36 rounded-xl border border-white/20 bg-black p-3"
                placeholder="Descripción completa"
                value={form.full_description}
                onChange={(e) =>
                  setForm({ ...form, full_description: e.target.value })
                }
              />

              <input
                className="rounded-xl border border-white/20 bg-black p-3"
                placeholder="Aliases separados por coma"
                value={form.aliases}
                onChange={(e) =>
                  setForm({ ...form, aliases: e.target.value })
                }
              />

              <input
                className="rounded-xl border border-white/20 bg-black p-3"
                placeholder="Tags separados por coma"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />

              <input
                type="number"
                min={1}
                max={10}
                className="rounded-xl border border-white/20 bg-black p-3"
                value={form.importance}
                onChange={(e) =>
                  setForm({ ...form, importance: Number(e.target.value) })
                }
              />

              <button
                onClick={saveEntity}
                disabled={loading}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black hover:bg-cyan-300 disabled:opacity-40"
              >
                {loading ? "Guardando..." : "Guardar entidad"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-purple-300">
              Entidades existentes
            </h2>

            <div className="mt-5 space-y-4">
              {entities.length === 0 && (
                <p className="text-gray-500">
                  Todavía no hay entidades guardadas.
                </p>
              )}

              {entities.map((entity) => (
                <article
                  key={entity.id}
                  className="rounded-2xl border border-cyan-500/20 bg-black p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-white">
                      {entity.display_name || entity.name}
                    </h3>
                    <span className="rounded-full bg-cyan-900 px-3 py-1 text-xs text-cyan-100">
                      {entity.entity_type}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-300">
                    {entity.short_description}
                  </p>

                  {entity.full_description && (
                    <p className="mt-3 text-sm text-gray-400">
                      {entity.full_description}
                    </p>
                  )}

                  <div className="mt-4 text-xs text-gray-500">
                    Key: {entity.entity_key} · Importancia{" "}
                    {entity.importance || 0}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}