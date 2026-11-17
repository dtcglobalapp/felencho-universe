/** Pure bridge between existing Lumina Producer lines and Studio RunSheet / teleprompter.
 *  No network calls, no Supabase writes, no speech/LiveKit side effects.
 *  NOTE: producer scripts are cues, not automatic authorization to speak.
 */
export type Speaker = "felencho" | "bob" | "lina" | "guest" | "unknown";
export type ProducerCue = {
  id: string;
  speaker: Speaker;
  text: string;
  sceneId: string;
  order: number;
  mode: "read" | "context" | "ask" | "direction";
};
export type SourceProducerLine = {
  id?: unknown;
  scene_id?: unknown;
  speaker?: unknown;
  character_name?: unknown;
  line_order?: unknown;
  line_text?: unknown;
  content?: unknown;
  dialogue?: unknown;
};
export function normalizeProducerSpeaker(raw: unknown): Speaker {
  if (typeof raw !== "string") return "unknown";
  const v = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (v === "bob") return "bob";
  if (v === "lina") return "lina";
  if (v === "felencho" || v === "felencho virtual" || v === "host" || v === "presentador") return "felencho";
  if (v === "guest" || v === "invitado" || v === "invitada") return "guest";
  return "unknown";
}
export function mapProducerLines(lines: SourceProducerLine[]): ProducerCue[] {
  return lines.map((line, index) => {
    const speaker = normalizeProducerSpeaker(line.speaker ?? line.character_name);
    const rawText = line.line_text ?? line.content ?? line.dialogue;
    const text = typeof rawText === "string" ? rawText.trim().slice(0, 4000) : "";
    const order = Number.isSafeInteger(line.line_order) && Number(line.line_order) >= 0
      ? Number(line.line_order) : index;
    const mode: ProducerCue["mode"] = speaker === "felencho" ? "read" :
      speaker === "bob" || speaker === "lina" ? "context" :
      speaker === "guest" ? "direction" : "direction";
    return {
      id: typeof line.id === "string" ? line.id : "line-" + index,
      speaker, text,
      sceneId: typeof line.scene_id === "string" ? line.scene_id : "",
      order, mode
    };
  }).filter(x => x.text.length > 0).sort((a,b) => a.order-b.order);
}
export function splitProducerOutputs(cues: ProducerCue[]) {
  return {
    ipad: cues.filter(c => c.speaker === "felencho" || c.speaker === "unknown"),
    bob: cues.filter(c => c.speaker === "bob").map(c=>({...c, mode:"context" as const})),
    lina: cues.filter(c => c.speaker === "lina").map(c=>({...c, mode:"context" as const})),
    guests: cues.filter(c => c.speaker === "guest")
  };
}
