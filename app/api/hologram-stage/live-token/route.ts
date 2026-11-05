import { createHash, createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const COOKIE = "felencho_studio_session";
const ROOM = "felencho-hologram-private-v1";

function b64(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}
function token(payload: Record<string, unknown>, secret: string): string {
  const unsigned = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64(JSON.stringify(payload));
  return unsigned + "." + b64(createHmac("sha256", secret).update(unsigned).digest());
}

// Unlike previous demo flags, auth is verified against a server-side studio session.
// Both the producing studio tab and the receiving TV require studio access.
async function authorized(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get(COOKIE)?.value;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!session || !base || !key) return false;
  const digest = createHash("sha256").update(session).digest("hex");
  try {
    const url = base + "/rest/v1/studio_access_sessions?session_token_hash=eq." +
      encodeURIComponent(digest) + "&is_active=eq.true&select=expires_at&limit=1";
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: "Bearer " + key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const sessions: Array<{expires_at?: string}> = await response.json();
    return Array.isArray(sessions) && sessions.some(
      s => s.expires_at && Date.parse(s.expires_at) > Date.now(),
    );
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  const { LIVEKIT_API_KEY: key, LIVEKIT_API_SECRET: secret, LIVEKIT_URL: url } = process.env;
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Studio access required" }, { status: 401 });
  }
  if (!key || !secret || !url) {
    return NextResponse.json({ error: "Live audio is not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const character = body?.character;
  const role = body?.role;
  if ((character !== "bob" && character !== "lina") ||
      (role !== "screen" && role !== "director")) {
    return NextResponse.json({ error: "Invalid character or role" }, { status: 400 });
  }
  // Privileged director tokens are ONLY issued to authenticated studio sessions.
  // Studio-access is the boundary; stronger owner role checks are needed before
  // offering public remote control or broader studio accounts.
  const now = Math.floor(Date.now()/1000);
  const identity = (role === "director" ? "hologram-director-" : "hologram-screen-") +
    character + "-" + randomUUID();
  const permissions = {
    roomJoin: true, room: ROOM,
    canSubscribe: true, canPublish: role === "director",
    canPublishData: false,
    canPublishSources: role === "director" ? ["microphone"] : [],
  };
  const jwt = token({
    iss: key, sub: identity, name: identity,
    nbf: now-5, exp: now+60*30,
    metadata: JSON.stringify({ character, role, purpose: "hologram-audio-only" }),
    video: permissions,
  }, secret);
  return NextResponse.json({ serverUrl: url, roomName: ROOM, participantToken: jwt }, {
    headers: { "Cache-Control": "no-store" },
  });
}
