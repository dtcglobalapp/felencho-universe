"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const languageOptions = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "ja", label: "日本語" },
  { code: "hi", label: "हिन्दी" },
  { code: "ht", label: "Kreyòl Ayisyen" },
];

export default function NewPodcastEpisodePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [language, setLanguage] = useState("es");
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([
    "es",
  ]);
  const [episodeType, setEpisodeType] = useState("podcast");
  const [isFeatured, setIsFeatured] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleLanguage(code: string) {
    setAvailableLanguages((current) => {
      if (current.includes(code)) {
        const next = current.filter((item) => item !== code);
        return next.length > 0 ? next : [language];
      }

      return [...current, code];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const response = await fetch("/api/studio/podcast/episodes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        youtubeUrl,
        thumbnailUrl,
        status,
        language,
        availableLanguages,
        episodeType,
        isFeatured,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "No se pudo guardar el episodio.");
      setLoading(false);
      return;
    }

    router.push("/studio/podcast");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-3xl border border-white/10 bg-[#111214] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">
          Podcast Manager
        </p>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Nuevo episodio
        </h1>

        <p className="mt-3 text-zinc-400">
          Guarda un borrador o publícalo directamente en Felencho The Podcast.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-[#111214] p-6 sm:p-8"
      >
        <Field label="Título">
          <input
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nombre del episodio"
            className="studio-input"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Resumen del episodio"
            className="studio-input min-h-36 resize-y"
          />
        </Field>

        <div className="grid gap-6 lg:grid-cols-2">
          <Field label="URL de YouTube">
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="studio-input"
            />
          </Field>

          <Field label="URL de miniatura">
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(event) => setThumbnailUrl(event.target.value)}
              placeholder="https://..."
              className="studio-input"
            />
          </Field>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Field label="Estado">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="studio-input"
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="live">En vivo</option>
              <option value="archived">Archivado</option>
            </select>
          </Field>

          <Field label="Idioma principal">
            <select
              value={language}
              onChange={(event) => {
                const value = event.target.value;
                setLanguage(value);

                setAvailableLanguages((current) =>
                  current.includes(value)
                    ? current
                    : [...current, value]
                );
              }}
              className="studio-input"
            >
              {languageOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo">
            <select
              value={episodeType}
              onChange={(event) => setEpisodeType(event.target.value)}
              className="studio-input"
            >
              <option value="podcast">Podcast</option>
              <option value="live">Live</option>
              <option value="interview">Entrevista</option>
              <option value="special">Especial</option>
              <option value="clip">Clip</option>
              <option value="short">Short</option>
            </select>
          </Field>
        </div>

        <Field label="Idiomas disponibles">
          <div className="flex flex-wrap gap-3">
            {languageOptions.map((item) => {
              const active = availableLanguages.includes(item.code);

              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => toggleLanguage(item.code)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "border-cyan-400 bg-cyan-500 text-black"
                      : "border-white/10 bg-black text-zinc-400 hover:border-white/30"
                  }`}
                >
                  {item.code.toUpperCase()}
                </button>
              );
            })}
          </div>
        </Field>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            className="h-5 w-5 accent-cyan-500"
          />

          <div>
            <p className="font-bold">Episodio destacado</p>
            <p className="text-sm text-zinc-500">
              Aparecerá como contenido principal en la página pública.
            </p>
          </div>
        </label>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/studio/podcast")}
            className="rounded-xl border border-white/10 px-6 py-3 font-bold hover:bg-white/10"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-cyan-500 px-6 py-3 font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar episodio"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .studio-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #050505;
          padding: 0.875rem 1rem;
          color: white;
          outline: none;
        }

        .studio-input:focus {
          border-color: rgb(34 211 238);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}
