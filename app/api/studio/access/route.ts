import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  accessAreaForPath,
  canAccessFelenchoStudio,
  normalizeFelenchoStudioPermissions,
  normalizeFelenchoStudioRole,
} from "../../../avatar-engine/auth/GenesisAccessPolicy";
import {
  FELENCHO_STUDIO_SESSION_COOKIE,
} from "../../../avatar-engine/auth/GenesisSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InvitationRecord {
  id: string;
  email: string | null;
  role: string;
  permissions: string[];
  inviteCodeHash: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readInvitation(
  value: unknown,
): InvitationRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    id,
    email,
    role,
    permissions,
    invite_code_hash: inviteCodeHash,
    expires_at: expiresAt,
    max_uses: maxUses,
    used_count: usedCount,
    is_active: isActive,
  } = value;

  if (
    typeof id !== "string" ||
    !(
      email === null ||
      typeof email === "string"
    ) ||
    typeof role !== "string" ||
    typeof inviteCodeHash !== "string" ||
    typeof expiresAt !== "string" ||
    typeof maxUses !== "number" ||
    typeof usedCount !== "number" ||
    typeof isActive !== "boolean"
  ) {
    return null;
  }

  return {
    id,
    email,
    role,
    permissions:
      normalizeFelenchoStudioPermissions(
        permissions,
      ),
    inviteCodeHash,
    expiresAt,
    maxUses,
    usedCount,
    isActive,
  };
}

function readInvitations(
  value: unknown,
): InvitationRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(readInvitation)
    .filter(
      (
        invitation,
      ): invitation is InvitationRecord =>
        invitation !== null,
    );
}

function sha256(value: string) {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function createToken() {
  return crypto.randomBytes(48).toString("hex");
}

function safeNextPath(
  value: unknown,
): string {
  if (
    typeof value === "string" &&
    accessAreaForPath(value)
  ) {
    return value;
  }

  return "/felencho-studio/dashboard";
}

export async function POST(request: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          error:
            "Vercel no tiene configurada NEXT_PUBLIC_SUPABASE_URL.",
        },
        { status: 500 },
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Vercel no tiene configurada SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    const payload: unknown =
      await request.json();

    if (!isRecord(payload)) {
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 },
      );
    }

    const cleanEmail = String(
      payload.email ?? "",
    )
      .trim()
      .toLowerCase();

    const cleanCode = String(
      payload.code ?? "",
    ).trim();

    const nextPath = safeNextPath(
      payload.next,
    );

    const accessArea =
      accessAreaForPath(nextPath);

    if (
      !cleanEmail ||
      !cleanCode ||
      !accessArea
    ) {
      return NextResponse.json(
        { error: "Email y llave requeridos." },
        { status: 400 },
      );
    }

    const invitationColumns =
      "id,email,role,permissions,invite_code_hash,expires_at,max_uses,used_count,is_active";

    const invitationQuery =
      await supabase
      .from("studio_invitations")
      .select(invitationColumns)
      .ilike("email", cleanEmail)
      .order("created_at", {
        ascending: false,
      });

    let invitationData: unknown =
      invitationQuery.data;

    let invitationError =
      invitationQuery.error;

    let supportsPermissions =
      !invitationError;

    if (invitationError) {
      const legacyInvitationQuery =
        await supabase
        .from("studio_invitations")
        .select(
          "id,email,role,invite_code_hash,expires_at,max_uses,used_count,is_active",
        )
        .ilike("email", cleanEmail)
        .order("created_at", {
          ascending: false,
        });

      invitationData =
        legacyInvitationQuery.data;

      invitationError =
        legacyInvitationQuery.error;

      supportsPermissions = false;
    }

    if (invitationError) {
      return NextResponse.json(
        {
          error:
            `Supabase rechazó la consulta: ${invitationError.message}`,
        },
        { status: 500 },
      );
    }

    const invitations =
      readInvitations(
        invitationData,
      );

    if (invitations.length === 0) {
      return NextResponse.json(
        {
          error:
            "No existe una invitación válida para este email.",
        },
        { status: 401 },
      );
    }

    const codeHash = sha256(cleanCode);

    const invite = invitations.find(
      (item) =>
        item.inviteCodeHash === codeHash,
    );

    if (!invite) {
      return NextResponse.json(
        {
          error:
            "La invitación existe, pero la llave escrita no coincide.",
        },
        { status: 401 },
      );
    }

    if (!invite.isActive) {
      return NextResponse.json(
        {
          error:
            "La invitación existe, pero está inactiva.",
        },
        { status: 401 },
      );
    }

    if (
      new Date(invite.expiresAt).getTime() <=
      Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "La invitación existe, pero ya expiró.",
        },
        { status: 401 },
      );
    }

    if (
      invite.usedCount >= invite.maxUses
    ) {
      return NextResponse.json(
        {
          error:
            "La invitación alcanzó su límite de usos.",
        },
        { status: 401 },
      );
    }

    const role =
      normalizeFelenchoStudioRole(
        invite.role,
      );

    if (
      !role ||
      !canAccessFelenchoStudio(
        role,
        invite.permissions,
        accessArea,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Esta invitación no autoriza el acceso solicitado.",
        },
        { status: 403 },
      );
    }

    const memberRecord: Record<
      string,
      unknown
    > = {
      email: cleanEmail,
      role: invite.role,
      is_active: true,
    };

    if (supportsPermissions) {
      memberRecord.permissions =
        invite.permissions;
    }

    const { error: memberError } =
      await supabase
        .from("studio_members")
        .upsert(memberRecord, {
          onConflict: "email",
        });

    if (memberError) {
      return NextResponse.json(
        {
          error:
            `No se pudo crear o actualizar el miembro: ${memberError.message}`,
        },
        { status: 500 },
      );
    }

    const token = createToken();
    const tokenHash = sha256(token);

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + 30,
    );

    const sessionRecord: Record<
      string,
      unknown
    > = {
      session_token_hash: tokenHash,
      invitation_id: invite.id,
      email: cleanEmail,
      role: invite.role,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    };

    if (supportsPermissions) {
      sessionRecord.permissions =
        invite.permissions;
    }

    const { error: sessionError } =
      await supabase
        .from("studio_access_sessions")
        .insert(sessionRecord);

    if (sessionError) {
      return NextResponse.json(
        {
          error:
            `No se pudo crear la sesión: ${sessionError.message}`,
        },
        { status: 500 },
      );
    }

    const nextUsedCount =
      invite.usedCount + 1;

    const {
      error: invitationUpdateError,
    } = await supabase
      .from("studio_invitations")
      .update({
        used_count: nextUsedCount,
        is_active:
          nextUsedCount < invite.maxUses,
      })
      .eq("id", invite.id);

    if (invitationUpdateError) {
      await supabase
        .from("studio_access_sessions")
        .update({
          is_active: false,
        })
        .eq(
          "session_token_hash",
          tokenHash,
        );

      return NextResponse.json(
        {
          error:
            "La invitación no pudo finalizarse y la sesión fue cancelada.",
        },
        { status: 500 },
      );
    }

    await supabase
      .from("studio_access_logs")
      .insert({
        email: cleanEmail,
        role: invite.role,
        action:
          "felencho_studio_access_granted",
      });

    const response = NextResponse.json({
      ok: true,
      redirectTo: nextPath,
    });

    response.headers.set(
      "Cache-Control",
      "private, no-store",
    );

    response.cookies.set({
      name:
        FELENCHO_STUDIO_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido.";

    return NextResponse.json(
      {
        error:
          `Error interno validando el acceso: ${message}`,
      },
      { status: 500 },
    );
  }
}
