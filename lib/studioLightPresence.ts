/**
 * Browser-only adapter: local wake bridge -> Felencho Light renderer.
 * Never connects to microphone, TTS or LiveKit and never creates audio playback.
 */
export type LightCharacter = "bob" | "lina";
export type LightState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING" | "WATCHING" | "SLEEP";
export type LightBands = { level: number; bass: number; mids: number; treble: number };
export type LightPresence = {
  character: LightCharacter;
  state: LightState;
  audio?: LightBands;
  timestamp?: number;
};

export type PresenceRenderer = {
  setState: (state: LightState) => void;
  pushAudio: (audio: LightBands) => void;
};

const validStates = new Set<LightState>([
  "IDLE", "LISTENING", "THINKING", "SPEAKING", "WATCHING", "SLEEP",
]);
const zeroAudio: LightBands = { level: 0, bass: 0, mids: 0, treble: 0 };
const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function normalizeLightPresence(input: unknown): LightPresence | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (value.character !== "bob" && value.character !== "lina") return null;
  if (!validStates.has(value.state as LightState)) return null;
  const result: LightPresence = {
    character: value.character,
    state: value.state as LightState,
  };
  if (value.timestamp !== undefined) {
    if (typeof value.timestamp !== "number" || !Number.isFinite(value.timestamp) || value.timestamp < 0) return null;
    result.timestamp = value.timestamp;
  }
  if (value.audio !== undefined) {
    if (!value.audio || typeof value.audio !== "object" || Array.isArray(value.audio)) return null;
    const a = value.audio as Record<string, unknown>;
    const bands = { ...zeroAudio };
    for (const name of ["level", "bass", "mids", "treble"] as const) {
      const n = a[name];
      if (n !== undefined && (typeof n !== "number" || !Number.isFinite(n))) return null;
      if (typeof n === "number") bands[name] = clamp(n);
    }
    result.audio = bands;
  }
  return result;
}

/** Attach wake events only. Brain/LiveKit audio bands must be provided separately. */
export function connectLocalWakeEvents(
  character: LightCharacter,
  renderer: PresenceRenderer,
  onStatus?: (status: "connected" | "disconnected" | "error") => void,
): () => void {
  const source = new EventSource(
    "/api/studio-light/events?persona=" + encodeURIComponent(character),
  );
  const handle = (event: MessageEvent<string>) => {
    try {
      const value: unknown = JSON.parse(event.data);
      if (!value || typeof value !== "object") return;
      const wake = value as Record<string, unknown>;
      if (wake.target !== character || !validStates.has(wake.action as LightState)) return;
      renderer.setState(wake.action as LightState);
      if (wake.action !== "SPEAKING") renderer.pushAudio({ ...zeroAudio });
    } catch {
      // Ignore malformed event; never crash display.
    }
  };
  source.addEventListener("message", handle);
  source.addEventListener("open", () => onStatus?.("connected"));
  source.addEventListener("error", () => onStatus?.("error"));
  return () => {
    source.removeEventListener("message", handle);
    source.close();
    onStatus?.("disconnected");
  };
}
