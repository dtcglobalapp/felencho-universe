import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "felencho_studio_session";

function sha256(value: string) {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function createToken() {
  return crypto.randomBytes(48).toString("hex");
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          error:
            "Vercel no tiene configurada NEXT_PUBLIC_SUPABASE_URL.",
        },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Vercel no tiene configurada SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = await request.json();

    const cleanEmail = String(body.email || "")
      .trim()
      .toLowerCase();

    const cleanCode = String(body.code || "").trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json(
        { error: "Email y llave requeridos." },
        { status: 400 }
      );
    }

    /*
     * Primero buscamos por email.
     * Así sabremos si Vercel está consultando la base de datos correcta.
     */
    const { data: invitations, error: invitationQueryError } =
      await supabase
        .from("studio_invitations")
        .select(
          "id,email,role,invite_code_hash,expires_at,max_uses,used_count,is_active"
        )
        .ilike("email", cleanEmail)
        .order("created_at", { ascending: false });

    if (invitationQueryError) {
      return NextResponse.json(
        {
          error: `Supabase rechazó la consulta: ${invitationQueryError.message}`,
        },
        { status: 500 }
      );
    }

    if (!invitations || invitations.length === 0) {
      let projectHost = "desconocido";

      try {
        projectHost = new URL(supabaseUrl).hostname;
      } catch {
        // Conserva el valor por defecto.
      }

      return NextResponse.json(
        {
          error:
            `No existe una invitación para ${cleanEmail} en el proyecto Supabase conectado por Vercel (${projectHost}).`,
        },
        { status: 401 }
      );
    }

    const codeHash = sha256(cleanCode);

    const invite = invitations.find(
      (item) => item.invite_code_hash === codeHash
    );

    if (!invite) {
      return NextResponse.json(
        {
          error:
            "La invitación existe, pero la llave escrita no coincide con el hash guardado.",
        },
        { status: 401 }
      );
    }

    if (!invite.is_active) {
      return NextResponse.json(
        { error: "La invitación existe, pero está inactiva." },
        { status: 401 }
      );
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "La invitación existe, pero ya expiró." },
        { status: 401 }
      );
    }

    if (invite.used_count >= invite.max_uses) {
      return NextResponse.json(
        {
          error:
            "La invitación existe, pero alcanzó su límite de usos.",
        },
        { status: 401 }
      );
    }

    const { error: memberError } = await supabase
      .from("studio_members")
      .upsert(
        {
          email: cleanEmail,
          role: invite.role,
          is_active: true,
        },
        {
          onConflict: "email",
        }
      );

    if (memberError) {
      return NextResponse.json(
        {
          error: `No se pudo crear o actualizar el miembro: ${memberError.message}`,
        },
        { status: 500 }
      );
    }

    const token = createToken();
    const tokenHash = sha256(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: sessionError } = await supabase
      .from("studio_access_sessions")
      .insert({
        session_token_hash: tokenHash,
        invitation_id: invite.id,
        email: cleanEmail,
        role: invite.role,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

    if (sessionError) {
      return NextResponse.json(
        {
          error: `No se pudo crear la sesión: ${sessionError.message}`,
        },
        { status: 500 }
      );
    }

    const nextUsedCount = invite.used_count + 1;

    const { error: invitationUpdateError } = await supabase
      .from("studio_invitations")
      .update({
        used_count: nextUsedCount,
        is_active: nextUsedCount < invite.max_uses,
      })
      .eq("id", invite.id);

    if (invitationUpdateError) {
      return NextResponse.json(
        {
          error: `La sesión se creó, pero no se pudo actualizar la invitación: ${invitationUpdateError.message}`,
        },
        { status: 500 }
      );
    }

    await supabase.from("studio_access_logs").insert({
      email: cleanEmail,
      role: invite.role,
      action: "studio_access_granted",
    });

    const response = NextResponse.json({
      ok: true,
      redirectTo: "/studio/podcast",
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido.";

    return NextResponse.json(
      {
        error: `Error interno validando el acceso: ${message}`,
      },
      { status: 500 }
    );
  }
}