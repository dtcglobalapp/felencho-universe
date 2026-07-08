import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { fullName, email, reason } = await req.json();

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Nombre y email requeridos." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const { error } = await supabase
      .from("studio_access_requests")
      .insert({
        full_name: String(fullName).trim(),
        email: cleanEmail,
        reason: reason ? String(reason).trim() : null,
        status: "pending",
        requested_role: "viewer",
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error enviando solicitud." },
      { status: 500 }
    );
  }
}