import { createHmac, randomUUID } from "node:crypto";
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

export async function POST(request: Request) {
  try {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured in Felencho.ai." },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const character = body?.character === "bob" ? "bob" : "lina";
    const roomName = `felencho-${character}-${randomUUID()}`;
    const identity = `studio-${character}-${randomUUID()}`;
    const metadata = JSON.stringify({ character });
    const now = Math.floor(Date.now() / 1000);

    // This token only connects the studio participant. The agent itself is
    // dispatched once by /api/live/dispatch after the browser joins the room.
    // Keeping a single dispatch path prevents duplicate workers/LemonSlice
    // sessions from consuming credits for the same screen.
    const token = signJwt(
      {
        iss: LIVEKIT_API_KEY,
        sub: identity,
        nbf: now - 5,
        exp: now + 60 * 60,
        metadata,
        video: {
          roomJoin: true,
          room: roomName,
          canPublish: true,
          canPublishData: true,
          canSubscribe: true,
        },
      },
      LIVEKIT_API_SECRET,
    );

    return NextResponse.json(
      {
        serverUrl: LIVEKIT_URL,
        roomName,
        participantToken: token,
        character,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[live/session] failed", error);
    return NextResponse.json({ error: "Unable to create LiveKit session." }, { status: 500 });
  }
}
