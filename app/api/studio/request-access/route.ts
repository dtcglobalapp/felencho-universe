import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function POST(request: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "El servicio de acceso no está configurado.",
        },
        { status: 500 },
      );
    }

    const payload: unknown =
      await request.json();

    if (!isRecord(payload)) {
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 },
      );
    }

    const fullName = String(
      payload.fullName ?? "",
    ).trim();

    const email = String(
      payload.email ?? "",
    )
      .trim()
      .toLowerCase();

    const reason = String(
      payload.reason ?? "",
    ).trim();

    if (!fullName || !email) {
      return NextResponse.json(
        {
          error:
            "Nombre y email requeridos.",
        },
        { status: 400 },
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const requestRecord = {
      full_name: fullName,
      email,
      reason: reason || null,
      status: "pending",
      requested_role: "guest",
    };

    let { error } = await supabase
      .from("studio_access_requests")
      .insert(requestRecord);

    // The remote database retains the legacy role constraint until the
    // local Phase 1 migration receives separate deployment approval.
    if (error?.code === "23514") {
      ({ error } = await supabase
        .from("studio_access_requests")
        .insert({
          ...requestRecord,
          requested_role: "viewer",
        }));
    }

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Error enviando solicitud.",
      },
      { status: 500 },
    );
  }
}
