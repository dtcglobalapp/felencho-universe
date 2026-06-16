import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const scriptId = searchParams.get("script_id");
    const sceneId = searchParams.get("scene_id");

    let query = supabaseAdmin
      .from("lumina_script_lines")
      .select("*")
      .eq("is_active", true)
      .order("line_order", { ascending: true });

    if (scriptId) {
      query = query.eq("script_id", scriptId);
    }

    if (sceneId) {
      query = query.eq("scene_id", sceneId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      lines: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error cargando líneas.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("lumina_script_lines")
      .insert({
        script_id: body.script_id,
        scene_id: body.scene_id,

        line_order: body.line_order || 1,
        speaker: body.speaker || "Bob",
        content: body.content || "",

        delivery_style: body.delivery_style || "",
        emotion: body.emotion || "",
        camera_note: body.camera_note || "",
        audio_note: body.audio_note || "",

        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      line: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error creando línea.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}