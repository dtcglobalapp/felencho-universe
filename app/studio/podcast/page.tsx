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
  youtube_url: string | null;
  thumbnail_url: string | null;
  status: "draft" | "published" | "live" | "archived";
  is_featured: boolean;
  language: string;
  available_languages: string[];
  episode_type: string;
  published_at: string | null;
  created_at: string;
};

export default async function StudioPodcastPage() {
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*")
    .order("created_at", { ascending: false });

  const episodes = (data || []) as Episode[];

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-[#111214] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">
          Felencho Studio OS
        </p>

        <h1 className="mt-3 text-4xl font-bold">Podcast Manager</h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Administra los episodios públicos de Felencho The Podcast.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
          Error cargando episodios: {error.message}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-[#111214]">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-2xl font-bold">Episodios</h2>
        </div>

        <div className="divide-y divide-white/10">
          {episodes.map((episode) => (
            <article key={episode.id} className="p-5 hover:bg-white/[0.03]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-300">
                  {episode.status.toUpperCase()}
                </span>

                {episode.is_featured && (
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                    Destacado
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-xl font-bold">{episode.title}</h3>

              <p className="mt-2 text-sm text-zinc-500">
                {episode.description || "Sin descripción."}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {episode.youtube_url && (
                  <a
                    href={episode.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/10"
                  >
                    YouTube
                  </a>
                )}

                <a
                  href="/podcast"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
                >
                  Ver público
                </a>

                <button className="rounded-xl border border-cyan-500/30 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/10">
                  Derivados
                </button>
              </div>
            </article>
          ))}

          {episodes.length === 0 && (
            <div className="p-8 text-zinc-500">
              Todavía no hay episodios creados.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
