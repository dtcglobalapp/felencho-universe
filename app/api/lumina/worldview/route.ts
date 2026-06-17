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

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.toLowerCase().trim();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return fallback;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const owner = searchParams.get("owner");
    const worldviewType = searchParams.get("worldview_type");
    const activeOnly = searchParams.get("active_only") !== "false";

    let query = supabase
      .from("lumina_worldview")
      .select("*")
      .order("response_priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (owner) {
      query = query.eq("owner", owner);
    }

    if (worldviewType) {
      query = query.eq("worldview_type", worldviewType);
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
      worldview: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error loading Lumina worldview.",
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
      title,
      worldview_type = "general",
      content,
      source = null,
      tags = [],
      voice_mode = "first_person",
      visibility = "private",
      sensitivity_level = "normal",
      can_quote_directly = false,
      can_expand = true,
      can_use_in_podcast = true,
      can_use_in_articles = true,
      safe_response = null,
      boundaries = null,
      emotional_tone = "natural",
      response_priority = 5,
      is_active = true,
    } = body;

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
      .from("lumina_worldview")
      .insert({
        owner: String(owner).trim(),
        title: String(title).trim(),
        worldview_type: String(worldview_type).trim(),
        content: String(content).trim(),
        source,
        tags: normalizedTags,
        voice_mode,
        visibility,
        sensitivity_level,
        can_quote_directly: toBoolean(can_quote_directly, false),
        can_expand: toBoolean(can_expand, true),
        can_use_in_podcast: toBoolean(can_use_in_podcast, true),
        can_use_in_articles: toBoolean(can_use_in_articles, true),
        safe_response,
        boundaries,
        emotional_tone,
        response_priority: toNumber(response_priority, 5),
        is_active: toBoolean(is_active, true),
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
      worldview: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error saving Lumina worldview.",
      },
      { status: 500 }
    );
  }
}