import { createHash, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const validCharacter = (c: unknown): c is "bob" | "lina" => c === "bob" || c === "lina";
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase no configurado");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function isStudioAdmin(request: NextRequest) {
  const token = request.cookies.get("felencho_studio_session")?.value;
  if (!token) return false;
  const { data, error } = await db().from("studio_access_sessions")
    .select("email,expires_at,is_active").eq("session_token_hash", hash(token)).eq("is_active", true).maybeSingle();
  if (error || !data || new Date(data.expires_at).getTime() <= Date.now()) return false;
  const { data: member } = await db().from("studio_members").select("role,is_active").eq("email", data.email).eq("is_active", true).maybeSingle();
  return !!member && ["owner", "admin", "producer", "director"].includes(String(member.role).toLowerCase());
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const supabase = db();
    if (action === "begin") {
      if (!validCharacter(body.character) || typeof body.deviceToken !== "string" || body.deviceToken.length < 32) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
      }
      const tokenHash = hash(body.deviceToken);
      const { data: existing } = await supabase.from("studio_display_devices").select("id")
        .eq("device_token_hash", tokenHash).eq("character", body.character).eq("is_active", true).maybeSingle();
      if (existing) return NextResponse.json({ authorized: true });
      await supabase.from("studio_display_pairings").delete().eq("device_token_hash", tokenHash);
      const code = String(randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const { error } = await supabase.from("studio_display_pairings").insert({
        character: body.character, device_token_hash: tokenHash, pairing_code_hash: hash(code), expires_at: expiresAt,
      });
      if (error) throw error;
      return NextResponse.json({ authorized: false, code, expiresAt });
    }
    if (action === "status") {
      if (!validCharacter(body.character) || typeof body.deviceToken !== "string" || body.deviceToken.length < 32) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
      }
      const { data } = await supabase.from("studio_display_devices").select("id").eq("character", body.character)
        .eq("device_token_hash", hash(body.deviceToken)).eq("is_active", true).maybeSingle();
      return NextResponse.json({ authorized: !!data });
    }
    if (action === "approve") {
      if (!(await isStudioAdmin(request))) return NextResponse.json({ error: "Acceso de productor requerido" }, { status: 403 });
      if (!validCharacter(body.character) || !/^\\d{6}$/.test(String(body.code || ""))) {
        return NextResponse.json({ error: "Código inválido" }, { status: 400 });
      }
      const { data: pairing } = await supabase.from("studio_display_pairings").select("*")
        .eq("pairing_code_hash", hash(String(body.code))).eq("character", body.character).is("approved_at", null).maybeSingle();
      if (!pairing || new Date(pairing.expires_at).getTime() <= Date.now()) {
        return NextResponse.json({ error: "Código vencido o incorrecto" }, { status: 400 });
      }
      const { error } = await supabase.from("studio_display_devices").upsert({
        character: body.character, device_token_hash: pairing.device_token_hash, is_active: true,
        label: body.character === "bob" ? "Pantalla Bob" : "Pantalla Lina",
      }, { onConflict: "device_token_hash" });
      if (error) throw error;
      await supabase.from("studio_display_pairings").update({ approved_at: new Date().toISOString() }).eq("id", pairing.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error de vinculación" }, { status: 500 });
  }
}
