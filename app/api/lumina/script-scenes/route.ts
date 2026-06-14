import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scriptId = searchParams.get("script_id");

  let query = supabase
    .from("lumina_script_scenes")
    .select("*")
    .eq("is_active", true)
    .order("scene_order", { ascending: true });

  if (scriptId) {
    query = query.eq("script_id", scriptId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("lumina_script_scenes")
    .insert({
      script_id: body.script_id,
      scene_order: body.scene_order,
      scene_title: body.scene_title || "",
      scene_content: body.scene_content || "",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}