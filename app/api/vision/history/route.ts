import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("felencho_vision_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.image_description) {
    return NextResponse.json(
      { error: "Missing image_description." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("felencho_vision_events")
    .insert({
      character_key: body.character_key || "bob",
      image_description: body.image_description,
      image_url: body.image_url || null,
      source_camera: body.source_camera || "obsbot",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}