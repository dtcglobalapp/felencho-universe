import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const characterName = searchParams.get("character_name");
    const activeOnly = searchParams.get("active_only") !== "false";

    let query = supabase
      .from("lumina_personality")
      .select("*")
      .order("character_name", { ascending: true });

    if (characterName) {
      query = query.eq("character_name", characterName);
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
      personalities: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error loading Lumina personalities.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      character_name,
      role,
      personality_type = "general",
      description,
      speaking_style,
      emotional_tone = "natural",
      core_values = [],
      favorite_phrases = [],
      avoid_phrases = [],
      boundaries = null,
      safe_response = null,
      memory_access = [],
      worldview_access = true,
      brain_memory_access = true,
      voice_mode = "first_person",
      is_active = true,
    } = body;

    if (!character_name || !String(character_name).trim()) {
      return NextResponse.json(
        { success: false, error: "character_name is required" },
        { status: 400 }
      );
    }

    if (!role || !String(role).trim()) {
      return NextResponse.json(
        { success: false, error: "role is required" },
        { status: 400 }
      );
    }

    if (!description || !String(description).trim()) {
      return NextResponse.json(
        { success: false, error: "description is required" },
        { status: 400 }
      );
    }

    if (!speaking_style || !String(speaking_style).trim()) {
      return NextResponse.json(
        { success: false, error: "speaking_style is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("lumina_personality")
      .insert({
        character_name: String(character_name).trim(),
        role: String(role).trim(),
        personality_type: String(personality_type).trim(),
        description: String(description).trim(),
        speaking_style: String(speaking_style).trim(),
        emotional_tone: String(emotional_tone).trim(),
        core_values: normalizeArray(core_values),
        favorite_phrases: normalizeArray(favorite_phrases),
        avoid_phrases: normalizeArray(avoid_phrases),
        boundaries,
        safe_response,
        memory_access: normalizeArray(memory_access),
        worldview_access: toBoolean(worldview_access, true),
        brain_memory_access: toBoolean(brain_memory_access, true),
        voice_mode,
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
      personality: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error saving Lumina personality.",
      },
      { status: 500 }
    );
  }
}