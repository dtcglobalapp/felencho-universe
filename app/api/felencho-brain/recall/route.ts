import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Memory = {
  id: string;
  character_key: string;
  category: string;
  title: string;
  memory_text: string;
  importance: number;
  visibility: string;
  tags: string[] | null;
};

function extractSearchTerms(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .slice(0, 20);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const characterKey = body.character_key || "shared";
    const userQuestion = body.user_question || body.question || "";

    if (!userQuestion.trim()) {
      return NextResponse.json(
        { error: "Missing user_question." },
        { status: 400 }
      );
    }

    const searchTerms = extractSearchTerms(userQuestion);

    let query = supabaseAdmin
      .from("felencho_memories")
      .select("*")
      .eq("is_active", true)
      .order("importance", { ascending: false })
      .limit(30);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const memories = (data || []) as Memory[];

    const allowedMemories = memories.filter((memory) => {
      return (
        memory.character_key === "shared" ||
        memory.character_key === characterKey ||
        characterKey === "shared"
      );
    });

    const scored = allowedMemories
      .map((memory) => {
        const searchableText = [
          memory.title,
          memory.category,
          memory.memory_text,
          ...(memory.tags || []),
        ]
          .join(" ")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const matches = searchTerms.filter((term) =>
          searchableText.includes(term)
        );

        const score = matches.length * 10 + Number(memory.importance || 0);

        return {
          ...memory,
          matches,
          score,
        };
      })
      .filter((memory) => memory.score > Number(memory.importance || 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const recallSummary =
      scored.length > 0
        ? scored
            .map(
              (memory, index) =>
                `${index + 1}. ${memory.title}: ${memory.memory_text}`
            )
            .join("\n\n")
        : "No se encontraron memorias relacionadas.";

    const matchedMemoryIds = scored.map((memory) => memory.id);

    const { data: logData, error: logError } = await supabaseAdmin
      .from("felencho_recall_logs")
      .insert({
        character_key: characterKey,
        user_question: userQuestion,
        search_terms: searchTerms,
        matched_memory_ids: matchedMemoryIds,
        recall_summary: recallSummary,
        response_text: null,
      })
      .select()
      .single();

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        character_key: characterKey,
        user_question: userQuestion,
        search_terms: searchTerms,
        matched_memories: scored,
        recall_summary: recallSummary,
        log: logData,
      },
    });
  } catch (error) {
    console.error("Felencho Recall error:", error);

    return NextResponse.json(
      { error: "Felencho Recall failed." },
      { status: 500 }
    );
  }
}