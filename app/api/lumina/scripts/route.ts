import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("lumina_scripts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      scripts: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error cargando guiones.",
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
      .from("lumina_scripts")
      .insert({
        title: body.title || "Guion sin título",
        topic: body.topic || body.title || "Tema sin definir",
        description: body.description || "",
        script_type: body.script_type || "podcast",
        language: body.language || "multi",
        duration_minutes: body.duration_minutes || 15,
        director: body.director || "Felencho Virtual",
        status: body.status || "draft",
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      script: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error creando guion.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}