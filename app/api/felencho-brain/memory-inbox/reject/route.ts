import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const id = body.id;

  if (!id) {
    return NextResponse.json({ error: "Missing inbox memory id." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("felencho_memory_inbox")
    .update({
      status: "rejected",
      reviewed_by: body.reviewed_by || "felencho_humano",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}