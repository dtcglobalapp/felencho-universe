import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const topic = searchParams.get("topic") || "";
    const limit = Number(searchParams.get("limit") || 10);

    const searchWords = topic
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length > 2);

    // -----------------------------
    // WORLDVIEW
    // -----------------------------

    const { data: worldviewData, error: worldviewError } =
      await supabase
        .from("lumina_worldview")
        .select("*")
        .eq("is_active", true)
        .order("response_priority", { ascending: false });

    if (worldviewError) {
      return NextResponse.json(
        {
          success: false,
          error: worldviewError.message,
        },
        { status: 500 }
      );
    }

    // -----------------------------
    // MEMORIES
    // -----------------------------

    const { data: memoryData, error: memoryError } =
      await supabase
        .from("lumina_brain_memory")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (memoryError) {
      return NextResponse.json(
        {
          success: false,
          error: memoryError.message,
        },
        { status: 500 }
      );
    }

    // -----------------------------
    // RELEVANCE FILTER
    // -----------------------------

    const worldviewMatches = (worldviewData || []).filter((item) => {
      if (!topic) return true;

      const text = JSON.stringify(item).toLowerCase();

      return searchWords.some((word) => text.includes(word));
    });

    const memoryMatches = (memoryData || []).filter((item) => {
      if (!topic) return true;

      const text = JSON.stringify(item).toLowerCase();

      return searchWords.some((word) => text.includes(word));
    });

    // -----------------------------
    // CONTEXT BUILDER
    // -----------------------------

    const context = {
      topic,

      worldview: worldviewMatches
        .slice(0, limit)
        .map((item) => ({
          title: item.title,
          worldview_type: item.worldview_type,
          content: item.content,
          emotional_tone: item.emotional_tone,
          priority: item.response_priority,
        })),

      memories: memoryMatches
        .slice(0, limit)
        .map((item) => ({
          title: item.title,
          memory_type: item.memory_type,
          content: item.content,
          emotional_tone: item.emotional_tone,
          source: item.source,
        })),
    };

    return NextResponse.json({
      success: true,
      topic,
      worldview_count: worldviewMatches.length,
      memory_count: memoryMatches.length,
      context,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected brain context error",
      },
      { status: 500 }
    );
  }
}