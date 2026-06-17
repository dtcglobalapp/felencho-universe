import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim())
      .filter((tag) => tag.length > 0);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const owner = searchParams.get("owner");
    const memoryType = searchParams.get("memory_type");
    const activeOnly = searchParams.get("active_only") !== "false";

    let query = supabase
      .from("lumina_brain_memory")
      .select("*")
      .order("created_at", { ascending: false });

    if (owner) {
      query = query.eq("owner", owner);
    }

    if (memoryType) {
      query = query.eq("memory_type", memoryType);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memories: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error loading Lumina brain memory.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      owner = "Felencho Virtual",
      memory_type,
      title,
      content,
      source = null,
      tags = [],
      voice_mode = "first_person",
      is_active = true,
    } = body;

    if (!memory_type || !String(memory_type).trim()) {
      return NextResponse.json(
        { success: false, error: "memory_type is required" },
        { status: 400 }
      );
    }

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    if (!content || !String(content).trim()) {
      return NextResponse.json(
        { success: false, error: "content is required" },
        { status: 400 }
      );
    }

    const normalizedTags = normalizeTags(tags);

    const { data, error } = await supabase
      .from("lumina_brain_memory")
      .insert({
        owner: String(owner).trim(),
        memory_type: String(memory_type).trim(),
        title: String(title).trim(),
        content: String(content).trim(),
        source,
        tags: normalizedTags,
        voice_mode,
        is_active,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      memory: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error saving Lumina brain memory.",
      },
      { status: 500 }
    );
  }
}