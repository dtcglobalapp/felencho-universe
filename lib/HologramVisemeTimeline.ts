/**
 * Voice-provider independent viseme timing.
 *
 * Character timestamps are NOT phoneme timestamps. This maps written
 * graphemes to approximate visemes at provider-supplied audio times.
 * Best accuracy comes from phoneme/viseme timestamps from the active TTS.
 * No audio sent to displays.
 */
export type StudioViseme = "REST" | "A" | "E" | "I" | "O" | "U" | "M" | "F" | "L" | "S";
export type TimedStudioViseme = {
  start: number;
  end: number;
  viseme: StudioViseme;
};
export type CharacterAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

function visualShape(letter: string): StudioViseme {
  const c = letter.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\s|[.,!?¡¿;:]/.test(c) || !c) return "REST";
  if ("pbm".includes(c)) return "M";
  if ("fv".includes(c)) return "F";
  if ("l".includes(c)) return "L";
  if ("szcx".includes(c)) return "S";
  if ("a".includes(c)) return "A";
  if ("e".includes(c)) return "E";
  if ("i".includes(c) || "y".includes(c)) return "I";
  if ("o".includes(c)) return "O";
  if ("u".includes(c)) return "U";
  return "E";
}

export function alignmentToVisemes(input: unknown): TimedStudioViseme[] {
  if (!input || typeof input !== "object") return [];
  const a = input as Partial<CharacterAlignment>;
  const chars = a.characters, starts = a.character_start_times_seconds, ends = a.character_end_times_seconds;
  if (!Array.isArray(chars) || !Array.isArray(starts) || !Array.isArray(ends)) return [];
  if (chars.length !== starts.length || chars.length !== ends.length || chars.length > 10000) return [];
  const result: TimedStudioViseme[] = [];
  for (let i = 0; i < chars.length; i++) {
    const start = starts[i], end = ends[i], letter = chars[i];
    if (typeof letter !== "string" || typeof start !== "number" || typeof end !== "number"
      || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return [];
    const viseme = visualShape(letter);
    const previous = result[result.length - 1];
    if (previous && previous.viseme === viseme && start - previous.end < 0.035) {
      previous.end = end;
    } else {
      result.push({ start, end, viseme });
    }
  }
  return result;
}

/** Timed visemes must be sorted; accepts only validated bounded values. */
export function validateVisemeTimeline(value: unknown): TimedStudioViseme[] {
  if (!Array.isArray(value) || value.length > 10000) return [];
  const checked: TimedStudioViseme[] = [];
  const allowed = ["REST", "A", "E", "I", "O", "U", "M", "F", "L", "S"];
  for (const row of value) {
    if (!row || typeof row !== "object") return [];
    const { start, end, viseme } = row as Record<string, unknown>;
    if (typeof start !== "number" || typeof end !== "number"
      || !Number.isFinite(start) || !Number.isFinite(end)
      || start < 0 || end < start || !allowed.includes(String(viseme))) return [];
    checked.push({ start, end, viseme: viseme as StudioViseme });
  }
  return checked.sort((a, b) => a.start - b.start);
}

export function sampleTimedViseme(timeline: TimedStudioViseme[], seconds: number): StudioViseme | null {
  if (!Number.isFinite(seconds) || !timeline.length) return null;
  let lo = 0, hi = timeline.length - 1, index = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (timeline[mid].start <= seconds) { index = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return index >= 0 && seconds <= timeline[index].end ? timeline[index].viseme : "REST";
}
