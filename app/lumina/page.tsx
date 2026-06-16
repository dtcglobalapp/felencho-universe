import { supabaseAdmin } from "@/lib/supabaseAdmin";
import MessageForm from "./MessageForm";
import ConversationViewer from "./ConversationViewer";
import ProducerPanel from "./ProducerPanel";

export default async function LuminaPage() {
  const { data, error } = await supabaseAdmin
    .from("lumina_characters")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-black p-10 text-white">
        <h1 className="text-4xl font-bold text-red-400">
          Error conectando Lumina
        </h1>
        <p className="mt-4 text-gray-300">Error: {error.message}</p>
      </main>
    );
  }

  const characters = (data || []).filter(
    (character) => character.name !== "Lumina"
  );

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-4xl font-bold text-cyan-400">
        Lumina Studio V1
      </h1>

      <p className="mt-4 max-w-3xl text-lg text-gray-300">
        Estudio central donde conviven Felencho Humano, Felencho Virtual,
        Bob y Lina, conectados a la memoria compartida de Lumina.
      </p>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {characters.map((character) => (
          <article
            key={character.id}
            className="rounded-2xl border border-cyan-400/30 bg-white/5 p-6 shadow-lg shadow-cyan-500/10"
          >
            <h2 className="text-2xl font-bold text-cyan-300">
              {character.name}
            </h2>

            <p className="mt-2 text-sm uppercase tracking-widest text-gray-400">
              {character.role}
            </p>

            <p className="mt-4 text-gray-200">
              {character.personality}
            </p>
          </article>
        ))}
      </section>

      <MessageForm />

      <ProducerPanel />

      <ConversationViewer />
    </main>
  );
}