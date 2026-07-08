import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const memoryId = searchParams.get("memory_id");

  if (!memoryId) {
    return NextResponse.json(
      { error: "memory_id requerido." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("felencho_memory_links")
    .select(`
      *,
      linked_memory:felencho_memories!linked_memory_id(
        id,
        title,
        category,
        memory_text,
        importance,
        character_key
      )
    `)
    .eq("memory_id", memoryId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    memory_id,
    linked_memory_id,
    relationship,
    notes,
  } = body;

  const { data, error } = await supabaseAdmin
    .from("felencho_memory_links")
    .insert({
      memory_id,
      linked_memory_id,
      relationship,
      notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data,
  });
}