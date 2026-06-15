import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("lumina_participants")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      participants: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error cargando participantes.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const platform = body?.platform || "studio";
    const speaker_type = body?.speaker_type || "audience";
    const language = body?.language || "auto";
    const country = body?.country || null;
    const avatar_url = body?.avatar_url || null;

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del participante es obligatorio." },
        { status: 400 }
      );
    }

    const { data: existingParticipant, error: searchError } =
      await supabaseAdmin
        .from("lumina_participants")
        .select("*")
        .eq("name", name)
        .eq("platform", platform)
        .maybeSingle();

    if (searchError) throw searchError;

    if (existingParticipant) {
      const { data: updatedParticipant, error: updateError } =
        await supabaseAdmin
          .from("lumina_participants")
          .update({
            speaker_type,
            language,
            country,
            avatar_url,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingParticipant.id)
          .select("*")
          .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        participant: updatedParticipant,
        reused: true,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("lumina_participants")
      .insert({
        name,
        platform,
        speaker_type,
        language,
        country,
        avatar_url,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      participant: data,
      reused: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error creando participante.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}