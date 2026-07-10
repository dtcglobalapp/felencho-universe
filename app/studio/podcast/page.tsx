import Link from "next/link";

export default function NewPodcastEpisodePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-cyan-400 uppercase tracking-[0.3em] text-xs font-bold">
            Podcast Manager
          </p>

          <h1 className="mt-2 text-4xl font-bold text-white">
            Nuevo Episodio
          </h1>

          <p className="mt-2 text-zinc-400">
            Crear un episodio para Felencho The Podcast.
          </p>
        </div>

        <Link
          href="/studio/podcast"
          className="rounded-xl border border-white/10 px-5 py-3 hover:bg-white/10"
        >
          Cancelar
        </Link>
      </div>

      <form
        action="/api/studio/podcast/create"
        method="POST"
        className="rounded-3xl border border-white/10 bg-[#111214] p-8 space-y-8"
      >
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">
            Título
          </label>

          <input
            name="title"
            required
            className="w-full rounded-xl bg-black px-5 py-4 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">
            Descripción
          </label>

          <textarea
            name="description"
            rows={6}
            className="w-full rounded-xl bg-black px-5 py-4 outline-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">
              YouTube URL
            </label>

            <input
              name="youtube_url"
              className="w-full rounded-xl bg-black px-5 py-4 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">
              Miniatura
            </label>

            <input
              name="thumbnail_url"
              className="w-full rounded-xl bg-black px-5 py-4 outline-none"
            />
          </div>

        </div>

        <div className="grid md:grid-cols-3 gap-6">

          <div>

            <label className="text-sm text-zinc-400">
              Estado
            </label>

            <select
              name="status"
              className="mt-2 w-full rounded-xl bg-black px-5 py-4"
              defaultValue="draft"
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="live">En Vivo</option>
            </select>

          </div>

          <div>

            <label className="text-sm text-zinc-400">
              Idioma
            </label>

            <select
              name="language"
              className="mt-2 w-full rounded-xl bg-black px-5 py-4"
              defaultValue="es"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="fr">Français</option>
            </select>

          </div>

          <div>

            <label className="text-sm text-zinc-400">
              Tipo
            </label>

            <select
              name="episode_type"
              className="mt-2 w-full rounded-xl bg-black px-5 py-4"
              defaultValue="podcast"
            >
              <option value="podcast">Podcast</option>
              <option value="short">Short</option>
              <option value="live">Live</option>
            </select>

          </div>

        </div>

        <label className="flex items-center gap-3">

          <input
            type="checkbox"
            name="is_featured"
          />

          Destacar episodio

        </label>

        <button
          className="rounded-xl bg-cyan-500 px-8 py-4 font-bold text-black hover:bg-cyan-400"
        >
          Guardar Episodio
        </button>

      </form>

    </main>
  );
}