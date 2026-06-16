import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractMinutes(duration: string | null | undefined) {
  if (!duration) return 30;

  const match = String(duration).match(/\d+/);
  return match ? Number(match[0]) : 30;
}

function normalizeScriptType(style: string | null | undefined) {
  const value = String(style || "").toLowerCase();

  if (value.includes("podcast")) return "podcast";
  if (value.includes("dramatizada")) return "dramatized_story";
  if (value.includes("debate")) return "avatar_debate";
  if (value.includes("educativo")) return "educational";
  return "documentary";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: "project_id is required" },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("lumina_script_projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        {
          success: false,
          error: projectError?.message || "Project not found",
        },
        { status: 404 }
      );
    }

    const durationMinutes = extractMinutes(project.duration);
    const scriptType = normalizeScriptType(project.style);

    const { data: script, error: scriptError } = await supabase
      .from("lumina_scripts")
      .insert({
        project_id: project.id,
        title: project.title || project.topic,
        description: project.producer_notes || "",
        director: "Lumina Producer",
        status: "draft",
        is_active: true,
        topic: project.topic,
        script_type: scriptType,
        language: project.language || "Español",
        duration_minutes: durationMinutes,
      })
      .select("*")
      .single();

    if (scriptError) {
      return NextResponse.json(
        { success: false, error: scriptError.message },
        { status: 500 }
      );
    }

    await supabase
      .from("lumina_script_projects")
      .update({
        status: "script_created",
      })
      .eq("id", project.id);

    return NextResponse.json({
      success: true,
      project,
      script,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error generating script.",
      },
      { status: 500 }
    );
  }
}