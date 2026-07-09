import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Episode = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  youtube_embed_url: string | null;
  thumbnail_url: string | null;
  status: string;
  is_featured: boolean;
  published_at: string | null;
};

export default async function PodcastPage() {
  const { data } = await supabase
    .from("podcast_episodes")
    .select("*")
    .in("status", ["published", "live"])
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });

  const episodes = (data || []) as Episode[];
  const featured = episodes.find((e) => e.is_featured) || episodes[0];

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Felencho The Podcast</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Mira el episodio más reciente, entra al live cuando estemos al aire
              y revive conversaciones anteriores.
            </p>
          </div>

          <a
            href="/studio/access"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10"
          >
            Studio OS
          </a>
        </header>

        {featured && (
          <section className="rounded-3xl border border-cyan-500/30 bg-[#101114] p-4 shadow-2xl shadow-cyan-950/20">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-cyan-500 px-4 py-1 text-sm font-bold text-black">
                {featured.status === "live" ? "EN VIVO" : "Último episodio"}
              </span>

              <span className="text-sm text-zinc-500">Gratis para ver</span>
            </div>

            <div className="aspect-video overflow-hidden rounded-2xl bg-black">
              {featured.youtube_embed_url ? (
                <iframe
                  className="h-full w-full"
                  src={featured.youtube_embed_url}
                  title={featured.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  Video pendiente
                </div>
              )}
            </div>

            <div className="mt-6">
              <h2 className="text-3xl font-bold">{featured.title}</h2>
              <p className="mt-2 text-zinc-400">{featured.description}</p>

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
        )}

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Episodios anteriores</h2>

            <div className="flex gap-3">
              <button className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#111214] text-3xl hover:border-cyan-400 hover:text-cyan-300">
                ‹
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#111214] text-3xl hover:border-cyan-400 hover:text-cyan-300">
                ›
              </button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {episodes
              .filter((e) => e.id !== featured?.id)
              .map((episode) => (
                <article
                  key={episode.id}
                  className="rounded-2xl border border-white/10 bg-[#111214] p-5 transition hover:-translate-y-1 hover:border-cyan-400"
                >
                  <div className="mb-4 aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                    {episode.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={episode.thumbnail_url}
                        alt={episode.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

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