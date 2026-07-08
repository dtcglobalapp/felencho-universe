import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "felencho_studio_session";

async function sha256(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/studio")) {
    return NextResponse.next();
  }

  if (pathname === "/studio/access") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/studio/access", request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.redirect(new URL("/studio/access", request.url));
  }

  const tokenHash = await sha256(token);

  const response = await fetch(
    `${supabaseUrl}/rest/v1/studio_access_sessions?session_token_hash=eq.${tokenHash}&is_active=eq.true&select=id,expires_at`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: "no-store",
    }
  );

  const sessions = await response.json();

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.redirect(new URL("/studio/access", request.url));
  }

  const session = sessions[0];

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/studio/access", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*"],
};