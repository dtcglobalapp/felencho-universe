/**
 * Viseme definitions for authored 3D face rigs.
 * Audio envelope alone does NOT disclose phonemes: the spectral heuristic
 * below is expressive fallback; for accurate lipsync use timed viseme events.
 */
export const VISEMES = ["REST", "A", "E", "I", "O", "U", "M", "F", "L", "S"] as const;
export type Viseme = (typeof VISEMES)[number];
export type TimedViseme = { time: number; viseme: Viseme; weight?: number };
export type MouthState = { viseme: Viseme; weight: number; level: number };
export const neutralMouth: MouthState = { viseme: "REST", weight: 0, level: 0 };

export function currentTimedViseme(timeline: TimedViseme[], time: number): TimedViseme | null {
  let found: TimedViseme | null = null;
  for (const item of timeline) {
    if (item.time > time) break;
    found = item;
  }
  return found;
}

export function spectralMouth(
  spectrum: Uint8Array,
  level: number,
  elapsedSeconds: number,
): MouthState {
  if (level < 0.035) return neutralMouth;
  const n = spectrum.length;
  const mean = (from: number, to: number) => {
    let sum = 0;
    const a = Math.floor(n * from);
    const b = Math.max(a + 1, Math.floor(n * to));
    for (let i = a; i < b; i++) sum += spectrum[i];
    return sum / ((b - a) * 255);
  };
  const bass = mean(0, 0.08);
  const mid = mean(0.08, 0.3);
  const high = mean(0.3, 0.75);
  // Deliberately labeled as approximate; real phoneme timing requires
  // speech alignment or viseme metadata from the TTS engine.
  const viseme: Viseme = high > mid * 1.5 ? "S"
    : bass > mid * 1.35 ? "O"
    : mid > bass * 1.23 ? "E"
    : Math.sin(elapsedSeconds * 13) > 0.45 ? "A" : "U";
  return { viseme, weight: Math.min(1, level * 2.7), level };
}
