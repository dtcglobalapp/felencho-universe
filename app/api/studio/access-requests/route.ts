import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  canAccessFelenchoStudio,
} from "../../../avatar-engine/auth/GenesisAccessPolicy";
import {
  FELENCHO_STUDIO_SESSION_COOKIE,
  getFelenchoStudioSession,
} from "../../../avatar-engine/auth/GenesisSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    FELENCHO_STUDIO_SESSION_COOKIE,
  )?.value;

  const session =
    await getFelenchoStudioSession(token);

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Authentication required.",
      },
      { status: 401 },
    );
  }

  if (
    !canAccessFelenchoStudio(
      session.role,
      session.permissions,
      "operations",
    )
  ) {
    return NextResponse.json(
      { error: "Access denied." },
      { status: 403 },
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "The access service is not configured.",
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
      },
    },
  );

  const { data, error } = await supabase
    .from("studio_access_requests")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    requests: data ?? [],
  });
}
