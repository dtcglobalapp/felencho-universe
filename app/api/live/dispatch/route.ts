import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LIVEKIT_URL =
  process.env.LIVEKIT_URL || "wss://felencho-universe-qievmphx.livekit.cloud";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const AGENT_NAME = "felencho-universe";

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
  try {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured." },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const room = typeof body?.room === "string" ? body.room : "";
    const character = body?.character === "bob" ? "bob" : "lina";

    if (!room) {
      return NextResponse.json({ error: "Missing room." }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const adminToken = signJwt(
      {
        iss: LIVEKIT_API_KEY,
        nbf: now - 5,
        exp: now + 60 * 5,
        video: {
          roomAdmin: true,
          room,
        },
      },
      LIVEKIT_API_SECRET,
    );

    const response = await fetch(
      `${toHttps(LIVEKIT_URL)}/twirp/livekit.AgentDispatchService/CreateDispatch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_name: AGENT_NAME,
          room,
          metadata: JSON.stringify({ character }),
        }),
      },
    );

    const text = await response.text();
    if (!response.ok) {
      console.error("[live/dispatch] LiveKit error", response.status, text);
      return NextResponse.json(
        { error: `LiveKit dispatch failed (${response.status}).`, details: text },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { ok: true, character, room, dispatch: text ? JSON.parse(text) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[live/dispatch] failed", error);
    return NextResponse.json({ error: "Unable to dispatch LiveKit agent." }, { status: 500 });
  }
}
