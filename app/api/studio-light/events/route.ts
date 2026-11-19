/**
 * Felencho Light presence event stream — read-only proxy for browser/TV screens.
 * It forwards the existing local wake bridge (7891); it never starts/stops services,
 * plays audio, calls Felencho Brain, or changes Studio Control.
 *
 * Runtime topology: Next server on La Bestia can reach 127.0.0.1:7891.
 * A TV on another computer cannot; its browser should connect to Next on :3001
 * using a same-origin EventSource to this route.
 */
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM = "http://127.0.0.1:7891/events";
const ALLOWED = new Set(["bob", "lina"]);

export async function GET(request: NextRequest) {
  const persona = request.nextUrl.searchParams.get("persona");
  if (!persona || !ALLOWED.has(persona)) {
    return new Response(JSON.stringify({ error: "Unknown persona" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  try {
    const url = new URL(UPSTREAM);
    url.searchParams.set("persona", persona);
    const upstream = await fetch(url, {
      signal: request.signal,
      cache: "no-store",
      headers: { Accept: "text/event-stream" },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: "Wake bridge unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Wake bridge unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
