import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("lumina_producer_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || "Session not found" },
        { status: 404 }
      );
    }

    const { data: currentLine, error: lineError } = await supabase
      .from("lumina_script_lines")
      .select("*")
      .eq("id", session.current_line_id)
      .single();

    if (lineError || !currentLine) {
      return NextResponse.json(
        { error: lineError?.message || "Current line not found" },
        { status: 404 }
      );
    }

    // Buscar siguiente línea de la misma escena

    const { data: nextLine } = await supabase
      .from("lumina_script_lines")
      .select("*")
      .eq("scene_id", currentLine.scene_id)
      .eq("is_active", true)
      .gt("line_order", currentLine.line_order)
      .order("line_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    // CASO 1: Existe otra línea en esta escena

    if (nextLine) {
      await supabase
        .from("lumina_producer_sessions")
        .update({
          current_line_id: nextLine.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id);

      await supabase
        .from("lumina_producer_events")
        .insert({
          session_id,
          event_type: "line_advanced",
          actor_name: nextLine.character_name,
          scene_id: nextLine.scene_id,
          line_id: nextLine.id,
          payload: {
            text: nextLine.line_text,
          },
        });

      return NextResponse.json({
        success: true,
        action: "next_line",
        scene_id: nextLine.scene_id,
        line: nextLine,
      });
    }

    // CASO 2: Buscar próxima escena

    const { data: currentScene } = await supabase
      .from("lumina_script_scenes")
      .select("*")
      .eq("id", session.current_scene_id)
      .single();

    if (!currentScene) {
      return NextResponse.json(
        { error: "Current scene not found" },
        { status: 404 }
      );
    }

    const { data: nextScene } = await supabase
      .from("lumina_script_scenes")
      .select("*")
      .eq("script_id", currentScene.script_id)
      .eq("is_active", true)
      .gt("scene_order", currentScene.scene_order)
      .order("scene_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    // CASO 3: No quedan escenas

    if (!nextScene) {
      await supabase
        .from("lumina_producer_sessions")
        .update({
          status: "finished",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id);

      await supabase
        .from("lumina_producer_events")
        .insert({
          session_id,
          event_type: "script_finished",
          actor_name: "Lumina Producer",
          payload: {},
        });

      return NextResponse.json({
        success: true,
        action: "finished",
      });
    }

    // Buscar primera línea de la nueva escena

    const { data: firstLine } = await supabase
      .from("lumina_script_lines")
      .select("*")
      .eq("scene_id", nextScene.id)
      .eq("is_active", true)
      .order("line_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    await supabase
      .from("lumina_producer_sessions")
      .update({
        current_scene_id: nextScene.id,
        current_line_id: firstLine?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    await supabase
      .from("lumina_producer_events")
      .insert({
        session_id,
        event_type: "scene_changed",
        actor_name: "Lumina Producer",
        scene_id: nextScene.id,
        line_id: firstLine?.id || null,
        payload: {
          scene_name: nextScene.scene_title,
        },
      });

    return NextResponse.json({
      success: true,
      action: "next_scene",
      scene: nextScene,
      line: firstLine,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Unexpected error",
      },
      {
        status: 500,
      }
    );
  }
}