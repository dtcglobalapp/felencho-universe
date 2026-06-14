import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Message = {
  id: string;
  speaker: string;
  target: string | null;
  message: string;
  created_at: string;
};

export default async function ConversationViewer() {
  const { data, error } = await supabaseAdmin
    .from("lumina_messages")
    .select("id, speaker, target, message, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mt-10 rounded-2xl border border-red-400/30 bg-white/5 p-6">
        <h2 className="text-2xl font-bold text-red-400">
          Error cargando conversaciones
        </h2>

        <p className="mt-4 text-gray-300">
          {error.message || "No se pudo cargar lumina_messages."}
        </p>
      </div>
    );
  }

  const messages: Message[] = data || [];

  return (
    <div className="mt-10 rounded-2xl border border-cyan-400/30 bg-white/5 p-6">
      <h2 className="text-2xl font-bold text-cyan-300">
        Conversaciones
      </h2>

      {messages.length === 0 ? (
        <p className="mt-4 text-gray-400">
          Todavía no hay mensajes guardados en lumina_messages.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {messages.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-cyan-400/20 bg-black/40 p-4"
            >
              <p className="font-bold text-cyan-300">
                {item.speaker} {item.target ? `→ ${item.target}` : ""}
              </p>

              <p className="mt-2 text-white">{item.message}</p>

              <p className="mt-2 text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}