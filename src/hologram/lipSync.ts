// Media-clock driven facial animation. No React or renderer dependencies.
export const VISEMES = ["sil", "AA", "E", "I", "O", "U", "MBP", "FV", "L", "TD", "SZ", "KG", "CH", "R"] as const;
export type Viseme = typeof VISEMES[number];
export interface VisemeCue { start: number; end: number; viseme: Viseme; weight?: number }
export interface MouthPose { jaw: number; wide: number; round: number; seal: number; bite: number; tongue: number }
export const REST: MouthPose = { jaw: 0, wide: 0, round: 0, seal: 0, bite: 0, tongue: 0 };
export const POSES: Record<Viseme, MouthPose> = {
  sil: REST,
  AA: { ...REST, jaw: 0.9, wide: 0.15 },
  E: { ...REST, jaw: 0.38, wide: 0.65 },
  I: { ...REST, jaw: 0.2, wide: 0.95 },
  O: { ...REST, jaw: 0.62, round: 0.8 },
  U: { ...REST, jaw: 0.22, round: 1 },
  MBP: { ...REST, seal: 1 },
  FV: { ...REST, jaw: 0.12, bite: 1 },
  L: { ...REST, jaw: 0.4, tongue: 1 },
  TD: { ...REST, jaw: 0.26, tongue: 0.8 },
  SZ: { ...REST, jaw: 0.12, wide: 0.4 },
  KG: { ...REST, jaw: 0.48 },
  CH: { ...REST, jaw: 0.24, round: 0.35 },
  R: { ...REST, jaw: 0.32, round: 0.2, tongue: 0.3 },
};
export function validateCues(value: unknown): VisemeCue[] {
  if (!Array.isArray(value) || value.length > 20000) throw new Error("Se esperaba una lista de visemas (máximo 20.000).");
  const cues: VisemeCue[] = value.map((c: unknown) => {
    if (!c || typeof c !== "object") throw new Error("Visema inválido.");
    const cue = c as VisemeCue;
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start || !VISEMES.includes(cue.viseme) || (cue.weight !== undefined && (!Number.isFinite(cue.weight) || cue.weight < 0 || cue.weight > 1))) throw new Error("Tiempos, forma o peso de visema inválidos.");
    return { start: cue.start, end: cue.end, viseme: cue.viseme, ...(cue.weight === undefined ? {} : { weight: cue.weight }) };
  }).sort((a, b) => a.start - b.start);
  for (let i = 1; i < cues.length; i++) {
    const prev = cues[i - 1], next = cues[i];
    if (prev && next && next.start < prev.end) throw new Error("Los visemas no pueden solaparse.");
  }
  return cues;
}
// Short coarticulation fades; actual media time, never accumulated render delta.
export function poseAt(cues: VisemeCue[], time: number): { pose: MouthPose; viseme: Viseme } {
  const pose = { ...REST };
  let current: Viseme = "sil";
  let strongest = 0;
  for (const cue of cues) {
    if (cue.start > time + 0.055) break;
    if (cue.end < time - 0.055 || cue.viseme === "sil") continue;
    const fade = Math.max(0, Math.min(1, (time - cue.start + 0.055) / 0.055, (cue.end + 0.055 - time) / 0.055)) * (cue.weight ?? 1);
    if (fade > strongest) { strongest = fade; current = cue.viseme; }
    for (const key of Object.keys(pose) as (keyof MouthPose)[]) pose[key] += POSES[cue.viseme][key] * fade;
  }
  for (const key of Object.keys(pose) as (keyof MouthPose)[]) pose[key] = Math.min(1, pose[key]);
  return { pose, viseme: current };
}

class LipSync {
  enabled = false;
  mode: "visemes" | "volume" = "visemes";
  provenance = "Sin pista";
  cues: VisemeCue[] = [];
  pose = { ...REST };
  viseme: Viseme = "sil";
  time = 0;
  level = 0;
  offset = 0;
  private clock: (() => { time: number; playing: boolean }) | null = null;
  private subscribers = new Set<() => void>();
  on(fn: () => void) { this.subscribers.add(fn); return () => { this.subscribers.delete(fn); }; }
  configure(enabled: boolean) { this.enabled = enabled; if (!enabled) this.reset(); this.subscribers.forEach(fn => fn()); }
  bindMedia(media: HTMLMediaElement) { this.clock = () => ({ time: media.currentTime, playing: !media.paused && !media.ended }); }
  // LiveKit hosts provide their PLAYOUT clock in seconds, not packet arrival time.
  bindClock(clock: () => { time: number; playing: boolean }) { this.clock = clock; }
  setTimeline(cues: unknown, provenance = "Eventos externos temporizados") { this.cues = validateCues(cues); this.provenance = provenance; }
  reset() { this.pose = { ...REST }; this.viseme = "sil"; this.level = 0; }
  detach() { this.clock = null; this.reset(); }
  step() {
    const clock = this.clock?.();
    this.time = clock?.time ?? 0;
    if (!this.enabled || !clock?.playing) { this.reset(); return; }
    if (this.mode === "volume") { this.pose = { ...REST, jaw: Math.min(1, this.level * 2.4) }; this.viseme = "sil"; return; }
    const frame = poseAt(this.cues, Math.max(0, this.time + this.offset));
    this.pose = frame.pose; this.viseme = frame.viseme;
  }
}
export const lipSync = new LipSync();