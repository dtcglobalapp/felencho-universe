import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("lumina_script_projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projects: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error loading script projects.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      title,
      topic,
      duration = "30 minutos",
      style = "Documental cinematográfico",
      language = "Español",
      producer_notes = "",
      status = "draft",
    } = body;

    if (!topic || !String(topic).trim()) {
      return NextResponse.json(
        { success: false, error: "topic is required" },
        { status: 400 }
      );
    }

    const safeTitle =
      title && String(title).trim()
        ? String(title).trim()
        : String(topic).trim();

    const { data, error } = await supabase
      .from("lumina_script_projects")
      .insert({
        title: safeTitle,
        topic: String(topic).trim(),
        duration,
        style,
        language,
        producer_notes,
        status,
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
      project: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error creating script project.",
      },
      { status: 500 }
    );
  }
}