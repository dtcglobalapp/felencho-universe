import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProducerMode = "rehearsal" | "recording" | "live";
type ProducerStatus = "idle" | "running" | "paused" | "finished";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get("script_id");

    let query = supabase
      .from("lumina_producer_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (scriptId) {
      query = query.eq("script_id", scriptId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session: data?.[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      script_id,
      mode = "rehearsal",
      status = "idle",
      producer_note = null,
      is_live = false,
    } = body;

    if (!script_id) {
      return NextResponse.json(
        { error: "script_id is required" },
        { status: 400 }
      );
    }

    const safeMode: ProducerMode = ["rehearsal", "recording", "live"].includes(
      mode
    )
      ? mode
      : "rehearsal";

    const safeStatus: ProducerStatus = [
      "idle",
      "running",
      "paused",
      "finished",
    ].includes(status)
      ? status
      : "idle";

    const { data: firstScene, error: sceneError } = await supabase
      .from("lumina_script_scenes")
      .select("*")
      .eq("script_id", script_id)
      .eq("is_active", true)
      .order("scene_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sceneError) {
      return NextResponse.json({ error: sceneError.message }, { status: 500 });
    }

    let firstLine = null;

    if (firstScene) {
      const { data: lineData, error: lineError } = await supabase
        .from("lumina_script_lines")
        .select("*")
        .eq("scene_id", firstScene.id)
        .eq("is_active", true)
        .order("line_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (lineError) {
        return NextResponse.json({ error: lineError.message }, { status: 500 });
      }

      firstLine = lineData;
    }

    const { data: session, error: sessionError } = await supabase
      .from("lumina_producer_sessions")
      .insert({
        script_id,
        current_scene_id: firstScene?.id || null,
        current_line_id: firstLine?.id || null,
        mode: safeMode,
        status: safeStatus,
        producer_note,
        is_live,
      })
      .select("*")
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    await supabase.from("lumina_producer_events").insert({
      session_id: session.id,
      event_type: "session_created",
      actor_name: "Lumina Producer",
      scene_id: firstScene?.id || null,
      line_id: firstLine?.id || null,
      payload: {
        script_id,
        mode: safeMode,
        status: safeStatus,
      },
    });

    return NextResponse.json({
      success: true,
      session,
      current_scene: firstScene,
      current_line: firstLine,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const {
      session_id,
      action,
      mode,
      status,
      producer_note,
      is_live,
    } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    const { data: currentSession, error: sessionFetchError } = await supabase
      .from("lumina_producer_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionFetchError) {
      return NextResponse.json(
        { error: sessionFetchError.message },
        { status: 500 }
      );
    }

    let updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    let eventType = "session_updated";
    let eventPayload: any = {};

    if (mode) {
      updatePayload.mode = mode;
      eventPayload.mode = mode;
    }

    if (status) {
      updatePayload.status = status;
      eventPayload.status = status;
    }

    if (producer_note !== undefined) {
      updatePayload.producer_note = producer_note;
      eventPayload.producer_note = producer_note;
    }

    if (is_live !== undefined) {
      updatePayload.is_live = is_live;
      eventPayload.is_live = is_live;
    }

    if (action === "start") {
      updatePayload.status = "running";
      eventType = "session_started";
    }

    if (action === "pause") {
      updatePayload.status = "paused";
      eventType = "session_paused";
    }

    if (action === "resume") {
      updatePayload.status = "running";
      eventType = "session_resumed";
    }

    if (action === "finish") {
      updatePayload.status = "finished";
      eventType = "session_finished";
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("lumina_producer_sessions")
      .update(updatePayload)
      .eq("id", session_id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase.from("lumina_producer_events").insert({
      session_id,
      event_type: eventType,
      actor_name: "Lumina Producer",
      scene_id: currentSession.current_scene_id,
      line_id: currentSession.current_line_id,
      payload: eventPayload,
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}