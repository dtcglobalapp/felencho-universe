import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type LuminaMessage = {
  id: string;
  sender_name?: string | null;
  sender_type?: string | null;
  target_name?: string | null;
  target_character?: string | null;
  character_name?: string | null;
  content?: string | null;
  message?: string | null;
  created_at?: string | null;
};

function getMessageText(message: LuminaMessage) {
  return message.content || message.message || "";
}

function getTargetName(message: LuminaMessage, body: any) {
  return (
    body?.target_name ||
    body?.targetName ||
    message.target_name ||
    message.target_character ||
    message.character_name ||
    "Bob"
  );
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
        { error: "No se encontró el mensaje de Felencho." },
        { status: 404 }
      );
    }

    const targetName = getTargetName(userMessage, body);
    const userText = getMessageText(userMessage);

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
      .order("created_at", { ascending: false })
      .limit(20);

    const systemPrompt = `
Eres ${character?.name || targetName}, un personaje inteligente de Lumina Studio V1 dentro de Felencho Mundial The Podcast.

Tu misión:
- Responder como ${character?.name || targetName}.
- Mantener una conversación natural, cálida, clara y útil.
- Responder directamente a Felencho Humano.
- No inventar datos técnicos si no están en la memoria o conocimiento.
- Si eres Bob: habla como hermano digital, guía técnico y creativo.
- Si eres Lina: habla con elegancia, inteligencia, sensibilidad y energía multilingüe.
- Mantén respuestas moderadas, no demasiado largas salvo que sea necesario.

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
        { error: "Error generando respuesta automática.", details: errorText },
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
        sender_name: character?.name || targetName,
        sender_type: "character",
        target_name: userMessage.sender_name || "Felencho Humano",
        content: replyText,
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