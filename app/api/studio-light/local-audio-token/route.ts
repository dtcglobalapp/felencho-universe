import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The dedicated visual laboratory on La Bestia is loopback-only. Never expose
// local LiveKit room tokens in production, over LAN, or on other Next ports.
export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin");
  const localPorts = new Set(["3118", "3120"]);
  const exactLocalHost = host === "127.0.0.1:3118" || host === "127.0.0.1:3120";
  if (!exactLocalHost || !localPorts.has(request.nextUrl.port) ||
      (origin && origin !== "http://" + host) ||
      request.nextUrl.hostname !== "127.0.0.1") {
    return NextResponse.json({ error: "Solo laboratorio local 3118/3120" }, { status: 403 });
  }
  try {
    const upstream = await fetch("http://127.0.0.1:7890/token?role=B", {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!upstream.ok) throw new Error("Servicio local de tokens no disponible");
    const result = await upstream.json() as { url?: string; token?: string };
    if (result.url !== "ws://127.0.0.1:7880" || !result.token) {
      throw new Error("Sala local inesperada");
    }
    return NextResponse.json(
      { server: result.url, token: result.token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "No se pudo preparar el receptor local" }, { status: 503 });
  }
}
