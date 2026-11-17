import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { mapProducerLines, splitProducerOutputs } from "../../../../lib/studioProducerCueBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
function json(data: object, status = 200) { return NextResponse.json(data, { status, headers: noStore }); }
function authorized(request: Request): boolean {
  const expected = process.env.FELENCHO_TELEPROMPTER_TOKEN;
  const supplied = request.headers.get("x-felencho-teleprompter-token") || "";
  if (!expected || expected.length < 24 || !supplied || supplied.length !== expected.length) return false;
  try { return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)); } catch { return false; }
}
// Read-only, deliberately opt-in bridge. No token or Supabase service key is sent to clients.
export async function GET(request: Request) {
  if (!authorized(request)) return json({ error: "Teleprompter no configurado o sin autorización." }, 401);
  const params = new URL(request.url).searchParams;
  const scriptId = params.get("script_id")?.trim() || "";
  if (!/^[a-z0-9-]{8,80}$/i.test(scriptId)) return json({ error: "Se requiere un ID de guion válido." }, 400);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ error: "Fuente de guiones Felencho no configurada." }, 503);
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: script, error: scriptError } = await db.from("lumina_scripts").select("id,title").eq("id", scriptId).maybeSingle();
    if (scriptError) throw scriptError;
    if (!script) return json({ error: "Guion no encontrado." }, 404);
    const { data: scenes, error: scenesError } = await db.from("lumina_script_scenes")
      .select("id,scene_order,scene_title").eq("script_id", scriptId).eq("is_active", true).order("scene_order");
    if (scenesError) throw scenesError;
    const ids = (scenes || []).map(s => s.id);
    if (!ids.length) return json({ title: script.title, script_id: scriptId, text: "", cues: [], updated: false });
    const { data: lines, error: linesError } = await db.from("lumina_scene_lines")
      .select("id,scene_id,speaker,line_order,dialogue").in("scene_id", ids).eq("is_active", true).order("line_order");
    if (linesError) throw linesError;
    const sceneIndex = new Map((scenes || []).map(s => [s.id, s]));
    const normalized = mapProducerLines(lines || []);
    const cues = splitProducerOutputs(normalized).ipad
      .filter(x => x.speaker === "felencho") // Unknown lines are NOT broadcast to the iPad.
      .sort((a,b) => (Number(sceneIndex.get(a.sceneId)?.scene_order ?? 0) - Number(sceneIndex.get(b.sceneId)?.scene_order ?? 0)) || a.order - b.order);
    return json({
      title: script.title,
      script_id: scriptId,
      text: cues.map(c => c.text).join("\n\n"),
      cues: cues.map(c => ({ id:c.id, sceneId:c.sceneId, text:c.text })),
      updated: true
    });
  } catch {
    // Never expose database errors, tokens, or SQL metadata to tablet clients.
    return json({ error: "No se pudo leer el guion de Felencho." }, 502);
  }
}
