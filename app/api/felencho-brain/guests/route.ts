import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("felencho_guests")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("felencho_guests")
    .insert({
      full_name: body.full_name,
      display_name: body.display_name || null,
      country: body.country || null,
      profession: body.profession || null,
      bio: body.bio || null,
      public_notes: body.public_notes || null,
      private_notes: body.private_notes || null,
      topics: body.topics || [],
      links: body.links || {},
      recognition_authorized: body.recognition_authorized || false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}