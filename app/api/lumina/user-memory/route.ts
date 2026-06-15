import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participant_id");

    let query = supabaseAdmin
      .from("lumina_user_memory")
      .select("*")
      .order("updated_at", { ascending: false });

    if (participantId) {
      query = query.eq("participant_id", participantId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      memory: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error cargando memoria de usuario.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const participant_id = body?.participant_id || null;
    const participant_name = body?.participant_name || "Unknown";
    const platform = body?.platform || "studio";
    const favorite_language = body?.favorite_language || body?.language || null;
    const favorite_character = body?.favorite_character || body?.target || null;
    const interests = body?.interests || null;
    const personality_notes = body?.personality_notes || null;
    const last_topics = body?.last_topics || null;
    const memory_summary =
      body?.memory_summary ||
      `Participante llamado ${participant_name}, visto en ${platform}.`;

    if (!participant_id) {
      return NextResponse.json(
        { error: "participant_id es obligatorio para memoria de usuario." },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("lumina_user_memory")
      .select("*")
      .eq("participant_id", participant_id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existing) {
      const { data, error } = await supabaseAdmin
        .from("lumina_user_memory")
        .insert({
          participant_id,
          participant_name,
          platform,
          favorite_language,
          favorite_character,
          visit_count: 1,
          interests,
          personality_notes,
          last_topics,
          memory_summary,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        memory: data,
        created: true,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("lumina_user_memory")
      .update({
        participant_name,
        platform,
        favorite_language: favorite_language || existing.favorite_language,
        favorite_character: favorite_character || existing.favorite_character,
        visit_count: Number(existing.visit_count || 0) + 1,
        interests: interests || existing.interests,
        personality_notes: personality_notes || existing.personality_notes,
        last_topics: last_topics || existing.last_topics,
        memory_summary: memory_summary || existing.memory_summary,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", participant_id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      memory: data,
      created: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error actualizando memoria de usuario.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}