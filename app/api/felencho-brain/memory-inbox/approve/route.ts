import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const id = body.id;

  if (!id) {
    return NextResponse.json({ error: "Missing inbox memory id." }, { status: 400 });
  }

  const { data: inboxItem, error: fetchError } = await supabaseAdmin
    .from("felencho_memory_inbox")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !inboxItem) {
    return NextResponse.json(
      { error: fetchError?.message || "Inbox memory not found." },
      { status: 404 }
    );
  }

  const { data: memory, error: insertError } = await supabaseAdmin
    .from("felencho_memories")
    .insert({
      character_key: inboxItem.character_key || "shared",
      category: inboxItem.category || "biography",
      title: inboxItem.title,
      memory_text: inboxItem.memory_text,
      importance: inboxItem.importance || 5,
      visibility: inboxItem.visibility || "private",
      source: "approved_inbox",
      tags: inboxItem.tags || [],
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("felencho_memory_inbox")
    .update({
      status: "approved",
      reviewed_by: body.reviewed_by || "felencho_humano",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: memory });
}