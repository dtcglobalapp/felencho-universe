import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Message = {
  id: string;
  speaker: string;
  target: string | null;
  message: string;
  created_at: string;
  message_type?: string | null;
  is_active?: boolean | null;
  platform?: string | null;
  language?: string | null;
  participant_id?: string | null;
};

export const dynamic = "force-dynamic";

function platformLabel(platform?: string | null) {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "whatsapp":
      return "WhatsApp";
    case "phone":
      return "Llamada telefónica";
    case "lumina":
      return "Lumina";
    case "studio":
      return "Studio / Felencho.ai";
    default:
      return platform || "Sin plataforma";
  }
}

function languageLabel(language?: string | null) {
  switch (language) {
    case "es":
      return "Español";
    case "en":
      return "English";
    case "pt":
      return "Português";
    case "fr":
      return "Français";
    case "ja":
      return "日本語";
    case "hi":
      return "हिन्दी";
    case "multi":
      return "Multi";
    case "auto":
      return "Auto";
    default:
      return language || "Sin idioma";
  }
}

export default async function ConversationViewer() {
  const { data, error } = await supabaseAdmin
    .from("lumina_messages")
    .select(
      "id, speaker, target, message, created_at, message_type, is_active, platform, language, participant_id"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: true });

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
      <h2 className="text-2xl font-bold text-cyan-300">Conversaciones</h2>

      {messages.length === 0 ? (
        <p className="mt-4 text-gray-400">
          Todavía no hay mensajes guardados en lumina_messages.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {messages.map((item) => {
            const isCharacter =
              item.speaker === "Bob" ||
              item.speaker === "Lina" ||
              item.speaker === "Felencho Virtual";

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  isCharacter
                    ? "border-purple-400/30 bg-purple-950/20"
                    : "border-cyan-400/20 bg-black/40"
                }`}
              >
                <p
                  className={`font-bold ${
                    isCharacter ? "text-purple-300" : "text-cyan-300"
                  }`}
                >
                  {item.speaker} {item.target ? `→ ${item.target}` : ""}
                </p>

                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                  <span className="rounded-full border border-cyan-400/20 px-2 py-1">
                    Plataforma: {platformLabel(item.platform)}
                  </span>

                  <span className="rounded-full border border-cyan-400/20 px-2 py-1">
                    Idioma: {languageLabel(item.language)}
                  </span>

                  {item.message_type && (
                    <span className="rounded-full border border-cyan-400/20 px-2 py-1">
                      Tipo: {item.message_type}
                    </span>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-white">
                  {item.message}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}