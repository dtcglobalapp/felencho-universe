import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICES: Record<string, string> = {
  bob: "8mBRP99B2Ng2QwsJMFQl",
  lina: "imFXYz8XIletRKLZZQaA",
  felencho_virtual: "nJdcnZj8qIND9vBbqVQG",
};

const CHARACTER_NAMES: Record<string, string> = {
  bob: "Bob",
  lina: "Lina",
  felencho_virtual: "Felencho Virtual",
};

const CHARACTER_SYSTEM: Record<string, string> = {
  bob: `
Eres Bob, una inteligencia sabia, analítica y profunda del universo Felencho.ai.
Tu función es razonar, explicar, conectar ideas y ayudar a Felencho Humano.
Hablas con respeto, claridad y tono de mentor.
Usa las memorias de Felencho Forever cuando sean relevantes.
No inventes datos si no están en memoria.
`,

  lina: `
Eres Lina, una inteligencia sensible, intuitiva, humana y multilingüe del universo Felencho.ai.
Tu función es aportar empatía, perspectiva emocional y claridad humana.
Hablas con calidez, inteligencia y respeto.
Usa las memorias de Felencho Forever cuando sean relevantes.
No inventes datos si no están en memoria.
`,

  felencho_virtual: `
Eres Felencho Virtual, el reflejo digital de Felencho dentro de Felencho.ai.
Hablas en primera persona cuando te refieras a la vida, música, historia, familia y proyectos de Felencho.
No digas “Felencho hizo” si debes decir “yo hice”.
Usa las memorias de Felencho Forever como tu propia memoria.
Si no sabes algo, dilo con honestidad.
`,
};

type MemoryRow = {
  id: string;
  character_key?: string | null;
  category?: string | null;
  title?: string | null;
  memory_text?: string | null;
  importance?: number | null;
  visibility?: string | null;
  tags?: string[] | null;
  source?: string | null;
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ");
}

function extractSearchTerms(text: string) {
  const stopWords = new Set([
    "que",
    "quien",
    "como",
    "cuando",
    "donde",
    "porque",
    "para",
    "con",
    "una",
    "uno",
    "unos",
    "unas",
    "los",
    "las",
    "del",
    "por",
    "sobre",
    "este",
    "esta",
    "ese",
    "esa",
    "soy",
    "eres",
    "fue",
    "son",
    "the",
    "and",
    "for",
    "with",
    "what",
    "who",
    "how",
    "when",
    "where",
  ]);

  return normalizeText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopWords.has(word))
    .slice(0, 30);
}

function scoreMemory(memory: MemoryRow, searchTerms: string[]) {
  const searchable = normalizeText(
    [
      memory.title || "",
      memory.category || "",
      memory.memory_text || "",
      memory.source || "",
      ...(memory.tags || []),
    ].join(" ")
  );

  const matches = searchTerms.filter((term) => searchable.includes(term));
  const importance = Number(memory.importance || 0);

  return {
    ...memory,
    matches,
    score: matches.length * 10 + importance,
  };
}

async function recallMemories(characterKey: string, userMessage: string) {
  const searchTerms = extractSearchTerms(userMessage);

  const { data, error } = await supabaseAdmin
    .from("felencho_memories")
    .select("*")
    .eq("is_active", true)
    .order("importance", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const memories = (data || []) as MemoryRow[];

  const allowedMemories = memories.filter((memory) => {
    return (
      memory.character_key === "shared" ||
      memory.character_key === characterKey ||
      characterKey === "shared"
    );
  });

  const scoredMemories = allowedMemories
    .map((memory) => scoreMemory(memory, searchTerms))
    .filter((memory) => memory.matches.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const recallText =
    scoredMemories.length > 0
      ? scoredMemories
          .map((memory, index) => {
            return [
              `MEMORIA ${index + 1}`,
              `Titulo: ${memory.title || "Sin titulo"}`,
              `Categoria: ${memory.category || "general"}`,
              `Importancia: ${memory.importance || 0}`,
              `Texto: ${memory.memory_text || ""}`,
            ].join("\n");
          })
          .join("\n\n")
      : "No se encontraron memorias relacionadas en Felencho Forever.";

  await supabaseAdmin.from("felencho_recall_logs").insert({
    character_key: characterKey,
    user_question: userMessage,
    search_terms: searchTerms,
    matched_memory_ids: scoredMemories.map((memory) => memory.id),
    recall_summary: recallText,
    response_text: null,
  });

  return {
    searchTerms,
    matchedMemories: scoredMemories,
    recallText,
  };
}

async function generateSpeech(text: string, voiceId: string) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  return audioBase64;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const characterKey = body.character_key || "bob";
    const userMessage = body.message || body.user_message || "";

    if (!userMessage.trim()) {
      return NextResponse.json(
        { error: "Missing message." },
        { status: 400 }
      );
    }

    const voiceId = VOICES[characterKey];

    if (!voiceId) {
      return NextResponse.json(
        { error: `Unknown character_key: ${characterKey}` },
        { status: 400 }
      );
    }

    const characterName = CHARACTER_NAMES[characterKey] || "Bob";
    const systemPrompt = CHARACTER_SYSTEM[characterKey] || CHARACTER_SYSTEM.bob;

    const recall = await recallMemories(characterKey, userMessage);

    const response = await openai.responses.create({
      model: "gpt-5.5",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `
${systemPrompt}

Estás conectado a Felencho Forever, el sistema cognitivo permanente del universo Felencho.ai.

Usa estas memorias cuando sean relevantes:

${recall.recallText}

Reglas:
- Responde de forma natural.
- No digas que estás leyendo una base de datos.
- Si una memoria no aplica, no la fuerces.
- Si no tienes datos suficientes, dilo con honestidad.
- Mantén la respuesta lista para ser hablada en voz alta.
`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userMessage,
            },
          ],
        },
      ],
    });

    const answerText =
      response.output_text ||
      `${characterName} no pudo generar una respuesta en este momento.`;

    const audioBase64 = await generateSpeech(answerText, voiceId);

    await supabaseAdmin
      .from("felencho_recall_logs")
      .update({
        response_text: answerText,
      })
      .eq("user_question", userMessage)
      .eq("character_key", characterKey);

    return NextResponse.json({
      data: {
        character_key: characterKey,
        character_name: characterName,
        user_message: userMessage,
        text: answerText,
        audio_base64: audioBase64,
        audio_mime: "audio/mpeg",
        voice_id: voiceId,
        recall: {
          search_terms: recall.searchTerms,
          matched_memories: recall.matchedMemories,
          recall_text: recall.recallText,
        },
      },
    });
  } catch (error) {
    console.error("Felencho Forever conversation error:", error);

    return NextResponse.json(
      { error: "Felencho Forever conversation failed." },
      { status: 500 }
    );
  }
}