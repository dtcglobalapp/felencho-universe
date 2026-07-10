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
  youtube_embed_url: string | null;
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

  const publishedCount = episodes.filter((e) => e.status === "published").length;
  const liveCount = episodes.filter((e) => e.status === "live").length;
  const draftCount = episodes.filter((e) => e.status === "draft").length;

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-[#111214] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">
              Felencho Studio OS
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Podcast Manager
            </h1>

            <p className="mt-3 max-w-2xl text-zinc-400">
              Administra los episodios públicos de Felencho The Podcast.
              Todo lo publicado aquí alimenta automáticamente la página pública.
            </p>
          </div>

          <a
            href="/studio/podcast/new"
            className="rounded-2xl bg-cyan-500 px-6 py-4 text-center font-bold text-black transition hover:bg-cyan-400"
          >
            + Nuevo episodio
          </a>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard title="Publicados" value={publishedCount} tone="cyan" />
        <StatCard title="En vivo" value={liveCount} tone="green" />
        <StatCard title="Borradores" value={draftCount} tone="yellow" />
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
          Error cargando episodios: {error.message}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-[#111214]">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-2xl font-bold">Episodios</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Lista conectada directamente a Supabase.
          </p>
        </div>

        <div className="divide-y divide-white/10">
          {episodes.length === 0 && (
            <div className="p-8 text-zinc-500">
              Todavía no hay episodios creados.
            </div>
          )}

          {episodes.map((episode) => (
            <article
              key={episode.id}
              className="grid gap-5 p-5 transition hover:bg-white/[0.03] lg:grid-cols-[1fr_auto]"
            >
              <div className="flex gap-4">
                <div className="hidden h-24 w-40 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 sm:block">
                  {episode.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={episode.thumbnail_url}
                      alt={episode.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                      Sin miniatura
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={episode.status} />

                    {episode.is_featured && (
                      <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                        Destacado
                      </span>
                    )}

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
                      {episode.episode_type}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold">
                    {episode.title}
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm text-zinc-500">
                    {episode.description || "Sin descripción."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                    <span>Idioma: {episode.language?.toUpperCase()}</span>
                    <span>•</span>
                    <span>
                      Disponibles:{" "}
                      {(episode.available_languages || [])
                        .map((l) => l.toUpperCase())
                        .join(", ")}
                    </span>
                    <span>•</span>
                    <span>
                      Publicado:{" "}
                      {episode.published_at
                        ? new Date(episode.published_at).toLocaleDateString()
                        : "pendiente"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
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
                  href={`/podcast`}
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
        </div>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "cyan" | "green" | "yellow";
}) {
  const tones = {
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    green: "text-green-300 bg-green-500/10 border-green-500/20",
    yellow: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20",
  };

  return (
    <div className={`rounded-3xl border p-6 ${tones[tone]}`}>
      <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-80">
        {title}
      </p>
      <p className="mt-4 text-5xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Episode["status"] }) {
  const styles = {
    live: "bg-red-500 text-white",
    published: "bg-green-500/15 text-green-300",
    draft: "bg-yellow-500/15 text-yellow-300",
    archived: "bg-zinc-500/15 text-zinc-300",
  };

  const labels = {
    live: "EN VIVO",
    published: "PUBLICADO",
    draft: "BORRADOR",
    archived: "ARCHIVADO",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}