import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  created_at?: string | null;
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const characterKey = body.character_key || "shared";
    const userMessage = body.user_message || body.message || body.question || "";

    if (!userMessage.trim()) {
      return NextResponse.json(
        { error: "Missing user_message." },
        { status: 400 }
      );
    }

    const searchTerms = extractSearchTerms(userMessage);

    const { data: memoriesData, error: memoriesError } = await supabaseAdmin
      .from("felencho_memories")
      .select("*")
      .eq("is_active", true)
      .order("importance", { ascending: false })
      .limit(100);

    if (memoriesError) {
      return NextResponse.json(
        { error: memoriesError.message },
        { status: 500 }
      );
    }

    const memories = (memoriesData || []) as MemoryRow[];

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

    const matchedMemoryIds = scoredMemories.map((memory) => memory.id);

    await supabaseAdmin.from("felencho_recall_logs").insert({
      character_key: characterKey,
      user_question: userMessage,
      search_terms: searchTerms,
      matched_memory_ids: matchedMemoryIds,
      recall_summary: recallText,
      response_text: null,
    });

    return NextResponse.json({
      data: {
        character_key: characterKey,
        user_message: userMessage,
        search_terms: searchTerms,
        matched_memories: scoredMemories,
        recall_text: recallText,
      },
    });
  } catch (error) {
    console.error("Felencho Forever brain-recall error:", error);

    return NextResponse.json(
      { error: "Felencho Forever brain-recall failed." },
      { status: 500 }
    );
  }
}