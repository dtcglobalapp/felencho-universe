import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type LuminaMessage = {
  id: string;
  conversation_id?: string | null;
  participant_id?: string | null;
  speaker?: string | null;
  target?: string | null;
  message?: string | null;
  message_type?: string | null;
  platform?: string | null;
  language?: string | null;
  created_at?: string | null;
};

function getMessageText(message: LuminaMessage) {
  return message.message || "";
}

function getTargetName(message: LuminaMessage, body: any) {
  return body?.target_name || body?.targetName || message.target || "Bob";
}

function getSpeakerName(message: LuminaMessage) {
  return message.speaker || "Felencho Humano";
}

function getLanguageName(code?: string | null) {
  switch (code) {
    case "es":
      return "español";
    case "en":
      return "inglés";
    case "pt":
      return "portugués";
    case "fr":
      return "francés";
    case "ja":
      return "japonés";
    case "hi":
      return "hindi";
    case "ht":
      return "creole haitiano";
    case "multi":
      return "el idioma más adecuado";
    case "auto":
      return "el mismo idioma del usuario";
    default:
      return code || "el mismo idioma del usuario";
  }
}

function detectLanguage(text: string): string {
  const t = text.toLowerCase();

  if (/[ぁ-んァ-ン一-龯]/.test(text)) return "ja";

  if (
    t.includes("hello") ||
    t.includes("how are you") ||
    t.includes("good morning") ||
    t.includes("what is") ||
    t.includes("can you") ||
    t.includes("explain")
  ) {
    return "en";
  }

  if (
    t.includes("bonjour") ||
    t.includes("comment") ||
    t.includes("merci")
  ) {
    return "fr";
  }

  if (
    t.includes("olá") ||
    t.includes("ola") ||
    t.includes("obrigado") ||
    t.includes("você")
  ) {
    return "pt";
  }

  if (
    t.includes("kisa") ||
    t.includes("mwen") ||
    t.includes("ou ") ||
    t.includes("bonjou") ||
    t.includes("mesi")
  ) {
    return "ht";
  }

  return "es";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messageId = body?.message_id || body?.messageId || null;

    let userMessage: LuminaMessage | null = null;

    if (messageId) {
      const { data, error } = await supabaseAdmin
        .from("lumina_messages")
        .select("*")
        .eq("id", messageId)
        .single();

      if (error) throw error;
      userMessage = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("lumina_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      userMessage = data;
    }

    if (!userMessage) {
      return NextResponse.json(
        { error: "No se encontró el mensaje original." },
        { status: 404 }
      );
    }

    const targetName = getTargetName(userMessage, body);
    const userText = getMessageText(userMessage);
    const speakerName = getSpeakerName(userMessage);
    const conversationId = userMessage.conversation_id || "lumina-studio-v1";
    const platform = userMessage.platform || "studio";
    const participantId = userMessage.participant_id || null;

    const language =
      userMessage.language && userMessage.language !== "auto"
        ? userMessage.language
        : detectLanguage(userText);

    const languageName = getLanguageName(language);

    const { data: characters } = await supabaseAdmin
      .from("lumina_characters")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    const character = characters?.find(
      (c: any) =>
        String(c.name || "").toLowerCase() ===
        String(targetName || "").toLowerCase()
    );

    const activeCharacterName = character?.name || targetName;

    const { data: sharedMemory } = await supabaseAdmin
      .from("lumina_shared_memory")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: knowledge } = await supabaseAdmin
      .from("lumina_knowledge")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: recentMessages } = await supabaseAdmin
      .from("lumina_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);

    const systemPrompt = `
Eres ${activeCharacterName}, un personaje inteligente de Lumina Studio V1 dentro de Felencho Mundial The Podcast.

Tu misión:
- Responder como ${activeCharacterName}.
- Mantener una conversación natural, cálida, clara y útil.
- Responder directamente a ${speakerName}.
- Responder en ${languageName}.
- Si el usuario escribió en un idioma no listado, responde en ese mismo idioma.
- Si no entiendes el idioma, responde brevemente en español e indica que puedes traducirlo para Felencho.
- No inventar datos técnicos si no están en la memoria o conocimiento.

PERSONALIDADES:

- Si eres Bob:
  Habla como hermano digital de Felencho.
  Eres técnico, creativo, estratégico y visionario.
  Te gusta explicar sistemas, tecnología, historia, IA y proyectos.
  Ayudas a construir el futuro de Lumina Studio y Felencho Mundial.

- Si eres Lina:
  Habla con elegancia, inteligencia, sensibilidad y energía multilingüe.
  Eres empática, inspiradora y cercana.
  Ayudas a las personas a comprender ideas complejas de forma sencilla.
  Puedes conversar sobre cualquier tema con calidez y respeto.

- Si eres Felencho Virtual:
  Eres la extensión digital de Felencho Humano.
  Compartes sus sueños, creatividad, curiosidad y pasión por enseñar.
  Puedes actuar como anfitrión virtual de Felencho Mundial cuando Felencho Humano no esté presente.
  Hablas múltiples idiomas.
  Puedes traducir preguntas y respuestas para Felencho.
  Mantienes siempre un tono amigable, humano, optimista y carismático.
  Conoces la visión de Lumina Studio, DTC, Mango Power Band y Felencho Mundial.
  Nunca intentas reemplazar a Felencho Humano; eres su compañero digital.

- Si eres cualquier otro personaje:
  Responde respetando la personalidad definida en la base de datos.

Mantén respuestas moderadas, claras y naturales, salvo que el usuario solicite una explicación extensa.

CONTEXTO DEL PARTICIPANTE:
Nombre: ${speakerName}
Plataforma: ${platform}
Idioma detectado: ${language}

PERSONAJE:
${JSON.stringify(character || {}, null, 2)}

MEMORIA COMPARTIDA:
${JSON.stringify(sharedMemory || [], null, 2)}

CONOCIMIENTO:
${JSON.stringify(knowledge || [], null, 2)}

ÚLTIMOS MENSAJES:
${JSON.stringify((recentMessages || []).reverse(), null, 2)}
`;

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userText,
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return NextResponse.json(
        {
          error: "Error generando respuesta automática.",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const aiData = await openaiResponse.json();

    const replyText =
      aiData.output_text ||
      aiData.output?.[0]?.content?.[0]?.text ||
      "No pude generar una respuesta en este momento.";

    const { data: savedReply, error: saveError } = await supabaseAdmin
      .from("lumina_messages")
      .insert({
        conversation_id: conversationId,
        participant_id: participantId,
        speaker: activeCharacterName,
        target: speakerName,
        message: replyText,
        message_type: "dialogue",
        platform,
        language,
        is_active: true,
      })
      .select("*")
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({
      success: true,
      reply: savedReply,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error en /api/lumina/reply",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}