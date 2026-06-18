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

type ProfileMemory = {
  memory_type: string | null;
  category: string | null;
  title: string;
  memory_text: string;
  importance_level: string | null;
};

type ProfileRelationship = {
  relationship_type: string;
  relationship_label: string | null;
  notes: string | null;
  emotional_importance: string | null;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

    const normalizedMessage = normalizeText(user_message);
    const normalizedUserName = normalizeText(user_name);
    const normalizedCharacterName = normalizeText(character.name);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("lumina_user_profiles")
      .select(
        "id, display_name, canonical_name, profile_type, relationship_to_lumina, relationship_to_felencho, preferred_name, importance_level, memory_priority, biography, personality_notes, emotional_notes, public_notes, private_notes, is_family, is_creator"
      )
      .eq("is_active", true);

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message || "Error cargando perfiles." },
        { status: 500 }
      );
    }

    const allProfiles = profiles || [];

    const relevantProfiles = allProfiles.filter((profile: any) => {
      const name = normalizeText(profile.display_name || "");
      const canonical = normalizeText(profile.canonical_name || "");
      const preferred = normalizeText(profile.preferred_name || "");

      return (
        normalizedMessage.includes(name) ||
        normalizedMessage.includes(canonical) ||
        normalizedMessage.includes(preferred) ||
        normalizedUserName.includes(name) ||
        normalizedUserName.includes(canonical) ||
        normalizedCharacterName.includes(canonical) ||
        profile.importance_level === "critical"
      );
    });

    const relevantProfileIds = relevantProfiles.map((profile: any) => profile.id);

    const { data: profileMemories, error: memoriesError } =
      relevantProfileIds.length > 0
        ? await supabaseAdmin
            .from("lumina_profile_memories")
            .select(
              "memory_type, category, title, memory_text, importance_level"
            )
            .in("profile_id", relevantProfileIds)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(30)
        : { data: [], error: null };

    if (memoriesError) {
      return NextResponse.json(
        { error: memoriesError.message || "Error cargando memorias familiares." },
        { status: 500 }
      );
    }

    const { data: profileRelationships, error: relationshipsError } =
      relevantProfileIds.length > 0
        ? await supabaseAdmin
            .from("lumina_profile_relationships")
            .select(
              "relationship_type, relationship_label, notes, emotional_importance"
            )
            .in("profile_id", relevantProfileIds)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(30)
        : { data: [], error: null };

    if (relationshipsError) {
      return NextResponse.json(
        {
          error:
            relationshipsError.message ||
            "Error cargando relaciones familiares.",
        },
        { status: 500 }
      );
    }

    const profilesText = relevantProfiles
      .map((profile: any) => {
        return [
          `Nombre: ${profile.display_name}`,
          `Nombre canonico: ${profile.canonical_name}`,
          `Tipo: ${profile.profile_type}`,
          `Relacion con Lumina: ${profile.relationship_to_lumina || "N/A"}`,
          `Relacion con Felencho: ${profile.relationship_to_felencho || "N/A"}`,
          `Nombre preferido: ${profile.preferred_name || "N/A"}`,
          `Biografia: ${profile.biography || "N/A"}`,
          `Notas emocionales: ${profile.emotional_notes || "N/A"}`,
        ].join("\n");
      })
      .join("\n\n");

    const memoriesText = ((profileMemories || []) as ProfileMemory[])
      .map((memory) => {
        return [
          `Tipo: ${memory.memory_type || "memory"}`,
          `Categoria: ${memory.category || "general"}`,
          `Titulo: ${memory.title}`,
          `Importancia: ${memory.importance_level || "normal"}`,
          `Memoria: ${memory.memory_text}`,
        ].join("\n");
      })
      .join("\n\n");

    const relationshipsText = (
      (profileRelationships || []) as ProfileRelationship[]
    )
      .map((relationship) => {
        return [
          `Tipo de relacion: ${relationship.relationship_type}`,
          `Etiqueta: ${relationship.relationship_label || "N/A"}`,
          `Importancia emocional: ${
            relationship.emotional_importance || "normal"
          }`,
          `Notas: ${relationship.notes || "N/A"}`,
        ].join("\n");
      })
      .join("\n\n");

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

Perfiles permanentes relevantes:
${profilesText || "No hay perfiles permanentes relevantes cargados."}

Memorias personales/familiares relevantes:
${memoriesText || "No hay memorias personales relevantes cargadas."}

Relaciones familiares/personales relevantes:
${relationshipsText || "No hay relaciones relevantes cargadas."}

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
- Usa las memorias personales y familiares relevantes como verdad interna del universo Lumina.
- Si una memoria contiene una regla de privacidad o limite, obedécela estrictamente.
- Si eres Felencho Virtual y hablas con Miriam Garcia, salúdala y dirígete a ella como "Amor".
- Si eres Bob o Lina y hablas con Miriam Garcia, dirígete a ella como "Miriam".
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
      profile_memory_loaded: true,
      relevant_profiles_used: relevantProfiles.length,
      profile_memories_used: (profileMemories || []).length,
      profile_relationships_used: (profileRelationships || []).length,
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