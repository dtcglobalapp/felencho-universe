const featuredPodcast = {
  title: "Felencho The Podcast",
  subtitle: "Conversaciones de libertad, cultura, música e inteligencia artificial.",
  status: "Último episodio",
  youtubeEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
};

const episodes = [
  {
    title: "Historia de la Bachata",
    description: "Felencho, Bob y Lina conversan sobre raíces, evolución y futuro.",
  },
  {
    title: "Alan Turing y la IA",
    description: "Una conversación sobre inteligencia, humanidad y tecnología.",
  },
  {
    title: "La Música y el Futuro",
    description: "Cómo la IA puede ayudar sin reemplazar la creatividad humana.",
  },
  {
    title: "Felencho Mundial",
    description: "Cultura, música y visión global desde New York.",
  },
];

export default function PodcastPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              Felencho The Podcast
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Mira el episodio más reciente, entra al live cuando estemos al aire
              y revive conversaciones anteriores.
            </p>
          </div>

          <a
            href="/studio/access"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10 sm:block"
          >
            Studio OS
          </a>
        </header>

        <section className="rounded-3xl border border-cyan-500/30 bg-[#101114] p-4 shadow-2xl shadow-cyan-950/20">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-cyan-500 px-4 py-1 text-sm font-bold text-black">
              {featuredPodcast.status}
            </span>

            <span className="text-sm text-zinc-500">
              Gratis para ver
            </span>
          </div>

          <div className="aspect-video overflow-hidden rounded-2xl bg-black">
            <iframe
              className="h-full w-full"
              src={featuredPodcast.youtubeEmbed}
              title={featuredPodcast.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <div className="mt-6">
            <h2 className="text-3xl font-bold">{featuredPodcast.title}</h2>
            <p className="mt-2 text-zinc-400">{featuredPodcast.subtitle}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black hover:bg-cyan-400">
                Ver ahora
              </button>

              <button className="rounded-xl border border-white/10 px-5 py-3 font-bold text-white hover:bg-white/10">
                Compartir
              </button>

              <button className="rounded-xl border border-white/10 px-5 py-3 font-bold text-white hover:bg-white/10">
                Registrarme para participar
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Episodios anteriores</h2>

            <div className="flex gap-2">
              <button className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/10">
                ‹
              </button>
              <button className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/10">
                ›
              </button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {episodes.map((episode) => (
              <article
                key={episode.title}
                className="rounded-2xl border border-white/10 bg-[#111214] p-5 transition hover:-translate-y-1 hover:border-cyan-400"
              >
                <div className="mb-4 aspect-video rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />

                <h3 className="text-lg font-bold">{episode.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  {episode.description}
                </p>

                <button className="mt-5 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
                  Ver episodio
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}