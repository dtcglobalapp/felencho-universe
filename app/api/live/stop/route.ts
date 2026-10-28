import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { isStudioAuthorized } from "@/lib/studioGuestAuth";

export const dynamic = "force-dynamic";

function b64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function jwt(room: string, key: string, secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: key, nbf: now - 5, exp: now + 120, video: { roomCreate: true, roomList: true, roomAdmin: true, room } }));
  const unsigned = header + "." + payload;
  return unsigned + "." + b64url(createHmac("sha256", secret).update(unsigned).digest());
}

export async function POST(request: Request) {
  if (!isStudioAuthorized(request)) return NextResponse.json({ error: "Studio authorization required." }, { status: 403 });
  const { room } = await request.json().catch(() => ({ room: "" }));
  if (typeof room !== "string" || !/^felencho-duo-[0-9a-f-]{36}$/.test(room)) {
    return NextResponse.json({ error: "Invalid duo room." }, { status: 400 });
  }
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  const server = process.env.LIVEKIT_URL || "wss://felencho-universe-qievmphx.livekit.cloud";
  if (!key || !secret) return NextResponse.json({ error: "LiveKit credentials missing." }, { status: 500 });
  const endpoint = server.replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/$/, "");
  try {
    const response = await fetch(endpoint + "/twirp/livekit.RoomService/DeleteRoom", {
      method: "POST",
      headers: { Authorization: "Bearer " + jwt(room, key, secret), "Content-Type": "application/json" },
      body: JSON.stringify({ room }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[live/stop] DeleteRoom failed", response.status, await response.text());
      return NextResponse.json({ error: "LiveKit did not confirm room shutdown." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, room }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[live/stop] error", error);
    return NextResponse.json({ error: "Could not reach LiveKit." }, { status: 502 });
  }
}
