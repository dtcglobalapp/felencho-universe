import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function LuminaAdminPage() {
  const { data, error } = await supabaseAdmin
    .from("lumina_knowledge")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <h1 className="text-3xl font-bold text-red-400">
          Lumina Admin
        </h1>

        <p className="mt-4 text-red-300">
          Error: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold text-cyan-400">
        Biblioteca Lumina V1
      </h1>

      <p className="mt-2 text-gray-300">
        Cerebro central de Felencho, Bob y Lina.
      </p>

      <div className="mt-8 grid gap-6">
        {data?.map((item) => (
          <section
            key={item.id}
            className="rounded-2xl border border-cyan-500/30 bg-white/5 p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-white">
                {item.title}
              </h2>

              <span className="rounded-full border border-cyan-400 px-3 py-1 text-xs uppercase tracking-widest text-cyan-300">
                {item.category}
              </span>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-gray-300">
              {item.content}
            </p>

            {item.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}