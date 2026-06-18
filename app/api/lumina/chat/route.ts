import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type LuminaMessage = {
  speaker: string;
  target: string | null;
  message: string;
  message_type: string;
  platform: string | null;
  language: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      character_id,
      user_message,
      conversation_id = "lumina-studio-v1",
      language = "es",
      channel = "felencho.ai",
      user_name = "Felencho",
    } = body;

    if (!character_id || !user_message) {
      return NextResponse.json(
        { error: "character_id y user_message son requeridos." },
        { status: 400 }
      );
    }

    const { data: character, error: characterError } = await supabaseAdmin
      .from("lumina_characters")
      .select("id, name, role, personality")
      .eq("id", character_id)
      .eq("is_active", true)
      .single();

    if (characterError || !character) {
      return NextResponse.json(
        { error: "Personaje no encontrado o inactivo." },
        { status: 404 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const [personalityRes, brainContextRes] = await Promise.all([
      fetch(`${baseUrl}/api/lumina/personality?character_id=${character_id}`),
      fetch(`${baseUrl}/api/lumina/brain-context?character_id=${character_id}`),
    ]);

    const personalityData = await personalityRes.json();
    const brainContextData = await brainContextRes.json();

    if (!personalityRes.ok) {
      return NextResponse.json(
        { error: personalityData.error || "Error cargando personalidad." },
        { status: 500 }
      );
    }

    if (!brainContextRes.ok) {
      return NextResponse.json(
        { error: brainContextData.error || "Error cargando brain context." },
        { status: 500 }
      );
    }

    const personality =
      personalityData.personality || personalityData.data || character;

    const brainContext =
      brainContextData.brain_context || brainContextData.data || {};

    const { data: recentMessages, error: messagesError } = await supabaseAdmin
      .from("lumina_messages")
      .select("speaker, target, message, message_type, platform, language")
      .eq("conversation_id", conversation_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12);

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message || "Error cargando historial." },
        { status: 500 }
      );
    }

    const orderedHistory = ((recentMessages || []) as LuminaMessage[]).reverse();

    const historyText = orderedHistory
      .map((item) => {
        const targetText = item.target ? ` → ${item.target}` : "";
        return `${item.speaker}${targetText}: ${item.message}`;
      })
      .join("\n");

    await supabaseAdmin.from("lumina_messages").insert({
      conversation_id,
      speaker: user_name,
      target: character.name,
      message: user_message,
      message_type: "dialogue",
      is_active: true,
      platform: channel,
      language,
    });

    const systemPrompt = `
Eres ${character.name}, un avatar inteligente del universo Lumina Studio / Felencho Mundial.

Rol:
${character.role}

Personalidad base:
${character.personality}

Personalidad extendida:
${JSON.stringify(personality, null, 2)}

Memoria, visión del mundo y contexto interno:
${JSON.stringify(brainContext, null, 2)}

Historial reciente de esta conversación:
${historyText || "No hay historial reciente todavía."}

Arquitectura de Lumina:
- Los mensajes pueden venir de Facebook, Instagram, TikTok, WhatsApp, YouTube, felencho.ai y en el futuro teléfono.
- Los avatares viven visualmente en HeyGen.
- Las voces se generan con ElevenLabs.
- Cada avatar piensa con su propia memoria, personalidad y contexto.
- Felencho Virtual representa una copia fiel de Felencho Humano.

Reglas:
- Responde siempre como ${character.name}.
- No digas que eres ChatGPT.
- Mantén coherencia con tu personalidad.
- Responde en el idioma solicitado: ${language}.
- Adapta el tono al canal de entrada: ${channel}.
- Responde de forma natural, conversacional y lista para voz hablada.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: user_message,
        },
      ],
      temperature: 0.8,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "No pude generar una respuesta en este momento.";

    await supabaseAdmin.from("lumina_messages").insert({
      conversation_id,
      speaker: character.name,
      target: user_name,
      message: reply,
      message_type: "dialogue",
      is_active: true,
      participant_id: character.id,
      platform: channel,
      language,
    });

    await supabaseAdmin.from("lumina_conversations").insert({
      speaker: user_name,
      target: character.name,
      message: user_message,
      conversation_id,
    });

    return NextResponse.json({
      success: true,
      character_id,
      character_name: character.name,
      conversation_id,
      channel,
      language,
      user_message,
      reply,
      personality_loaded: true,
      brain_context_loaded: true,
      memory_loaded: true,
      memory_saved: true,
      history_messages_used: orderedHistory.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Error interno generando respuesta Lumina.",
      },
      { status: 500 }
    );
  }
}