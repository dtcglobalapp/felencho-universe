import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const url = process.env.LIVEKIT_URL || "wss://felencho-universe-qievmphx.livekit.cloud";

function b64(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function jwt(payload: Record<string, unknown>, key: string, secret: string) {
  const unsigned = `${b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64(JSON.stringify({ iss: key, ...payload }))}`;
  return `${unsigned}.${b64(createHmac("sha256", secret).update(unsigned).digest())}`;
}
function same(a: string, b: string) {
  const x = createHmac("sha256", "studio-pin-compare").update(a).digest();
  const y = createHmac("sha256", "studio-pin-compare").update(b).digest();
  return timingSafeEqual(x, y);
}
export async function POST(request: Request) {
  const pin = process.env.STUDIO_DISPLAY_PIN;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!pin || pin.length < 8 || !key || !secret) return NextResponse.json({ error: "Falta configurar STUDIO_DISPLAY_PIN (mínimo 8 caracteres) y LiveKit." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.pin !== "string" || !same(body.pin, pin)) return NextResponse.json({ error: "Clave de estudio incorrecta." }, { status: 403 });
  const character = body.character;
  if (character !== "bob" && character !== "lina") return NextResponse.json({ error: "Personaje inválido." }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const admin = jwt({ sub: "studio-display-lookup", nbf: now - 5, exp: now + 60, video: { roomList: true } }, key, secret);
  const base = url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  const response = await fetch(`${base}/twirp/livekit.RoomService/ListRooms`, {
    method: "POST", headers: { Authorization: `Bearer ${admin}`, "Content-Type": "application/json" },
    body: JSON.stringify({}), cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "No se pudo consultar las salas de LiveKit." }, { status: 502 });
  const data = await response.json();
  const rooms = (Array.isArray(data.rooms) ? data.rooms : []) as Array<{ name?: string; creationTime?: number; numParticipants?: number }>;
  const active = rooms.filter((r) => r.name?.startsWith(`felencho-${character}-`) && (r.numParticipants ?? 0) > 0)
    .sort((a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0));
  if (!active[0]?.name) return NextResponse.json({ waiting: true }, { headers: { "Cache-Control": "no-store" } });
  const token = jwt({
    sub: `display-${character}-${randomUUID()}`, nbf: now - 5, exp: now + 120,
    metadata: JSON.stringify({ character, role: "display" }),
    video: { roomJoin: true, room: active[0].name, canPublish: false, canPublishData: false, canSubscribe: true },
  }, key, secret);
  return NextResponse.json({ serverUrl: url, token, room: active[0].name }, { headers: { "Cache-Control": "no-store" } });
}
