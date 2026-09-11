import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LIVEKIT_URL =
  process.env.LIVEKIT_URL || "wss://felencho-universe-qievmphx.livekit.cloud";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

function b64url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest();
  return `${unsigned}.${b64url(signature)}`;
}

function toHttps(url: string) {
  if (url.startsWith("wss://")) return `https://${url.slice(6)}`;
  if (url.startsWith("ws://")) return `http://${url.slice(5)}`;
  return url;
}

export async function POST(request: Request) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: "LiveKit credentials missing." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const room = typeof body?.room === "string" ? body.room : "";
  const dispatchId = typeof body?.dispatchId === "string" ? body.dispatchId : "";

  if (!room) {
    return NextResponse.json({ error: "Missing room." }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const adminToken = signJwt(
    {
      iss: LIVEKIT_API_KEY,
      nbf: now - 5,
      exp: now + 60 * 5,
      video: { roomAdmin: true, room },
    },
    LIVEKIT_API_SECRET,
  );

  const response = await fetch(
    `${toHttps(LIVEKIT_URL)}/twirp/livekit.AgentDispatchService/ListDispatch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room, dispatch_id: dispatchId || undefined }),
    },
  );

  const text = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { error: `LiveKit status failed (${response.status}).`, details: text },
      { status: 502 },
    );
  }

  const payload = text ? JSON.parse(text) : {};
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
