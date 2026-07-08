import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

const COOKIE_NAME = "felencho_studio_session";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createToken() {
  return crypto.randomBytes(48).toString("hex");
}

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email y llave requeridos." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const codeHash = sha256(String(code).trim());

    const { data: invite, error: inviteError } = await supabase
      .from("studio_invitations")
      .select("*")
      .eq("invite_code_hash", codeHash)
      .eq("is_active", true)
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Llave inválida." },
        { status: 401 }
      );
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Esta llave ya expiró." },
        { status: 401 }
      );
    }

    if (invite.used_count >= invite.max_uses) {
      return NextResponse.json(
        { error: "Esta llave ya fue usada." },
        { status: 401 }
      );
    }

    if (invite.email && invite.email.toLowerCase() !== cleanEmail) {
      return NextResponse.json(
        { error: "Este email no coincide con la invitación." },
        { status: 401 }
      );
    }

    await supabase.from("studio_members").upsert(
      {
        email: cleanEmail,
        role: invite.role,
        is_active: true,
      },
      { onConflict: "email" }
    );

    await supabase
      .from("studio_invitations")
      .update({
        used_count: invite.used_count + 1,
        is_active: invite.used_count + 1 < invite.max_uses,
      })
      .eq("id", invite.id);

    const token = createToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8);

    await supabase.from("studio_access_sessions").insert({
      session_token_hash: tokenHash,
      invitation_id: invite.id,
      email: cleanEmail,
      role: invite.role,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    await supabase.from("studio_access_logs").insert({
      email: cleanEmail,
      role: invite.role,
      action: "studio_access_granted",
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Error interno validando acceso." },
      { status: 500 }
    );
  }
}