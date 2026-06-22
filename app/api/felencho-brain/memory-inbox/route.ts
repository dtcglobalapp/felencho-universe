import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("felencho_memory_inbox")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("felencho_memory_inbox")
    .insert({
      suggested_by: body.suggested_by || "system",
      character_key: body.character_key || "shared",
      category: body.category || "biography",
      title: body.title,
      memory_text: body.memory_text,
      reason: body.reason || null,
      source_conversation_id: body.source_conversation_id || null,
      importance: body.importance || 5,
      visibility: body.visibility || "private",
      tags: body.tags || [],
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}