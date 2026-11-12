// Felencho Hologram Engine — framework-agnostic state + external API.
// No React / three imports: portable into Next.js or any host.
import { lipSync, type VisemeCue } from "./lipSync";

export type HoloState = "idle" | "listening" | "thinking" | "speaking" | "watching" | "sleep";
export const HOLO_STATES: HoloState[] = ["idle", "listening", "thinking", "speaking", "watching", "sleep"];

export interface AudioFrame {
  level?: number; // 0..1 overall amplitude
  bass?: number;
  mids?: number;
  treble?: number;
}

export interface WatchEvent {
  x: number; // -1..1 horizontal attention target
  y: number; // -1..1 vertical
  intensity?: number; // 0..1
}

type Listener = (s: HoloState) => void;
export type Persona = "lina" | "bob";

export class HologramEngine {
  state: HoloState = "idle";
  // raw targets (set externally)
  target = { level: 0, bass: 0, mids: 0, treble: 0 };
  // smoothed values read by renderer
  audio = { level: 0, bass: 0, mids: 0, treble: 0 };
  // per-state blend weights, smoothed 0..1
  weights: Record<HoloState, number> = { idle: 1, listening: 0, thinking: 0, speaking: 0, watching: 0, sleep: 0 };
  attention = { x: 0, y: 0, intensity: 0 };
  attentionTarget = { x: 0, y: 0, intensity: 0 };
  simulator = false;
  private simT = 0;
  private lastAudioAt = 0;
  private listeners = new Set<Listener>();
  persona: Persona = "lina";
  private personaListeners = new Set<(p: Persona) => void>();

  setPersona(p: Persona) {
    if (p !== "lina" && p !== "bob") return;
    this.persona = p;
    this.personaListeners.forEach((l) => l(p));
  }
  onPersona(l: (p: Persona) => void) {
    this.personaListeners.add(l);
    return () => this.personaListeners.delete(l);
  }
  /** 0..1 how defined the face is: strong when speaking/thinking, abstract when idle/sleep. */
  get faceWeight() {
    const w = this.weights;
    const v = w.idle * 0.38 + w.listening * 0.6 + w.thinking * 0.88 + w.speaking * 1 + w.watching * 0.7;
    return Math.max(0, Math.min(1, v)) * (1 - w.sleep * 0.92);
  }

  setState(s: HoloState) {
    if (!HOLO_STATES.includes(s)) return;
    this.state = s;
    this.listeners.forEach((l) => l(s));
  }
  onState(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  /** Push normalized audio analysis (0..1). Call at any rate (e.g. 30–60Hz from LiveKit/Cartesia). */
  pushAudio(f: AudioFrame) {
    const c = (v: number | undefined, d: number) => (v === undefined ? d : Math.max(0, Math.min(1, v)));
    this.target.level = c(f.level, this.target.level);
    this.target.bass = c(f.bass, this.target.bass);
    this.target.mids = c(f.mids, this.target.mids);
    this.target.treble = c(f.treble, this.target.treble);
    this.lastAudioAt = performance.now();
  }
  /** External camera event (face tracking etc). */
  watch(e: WatchEvent) {
    this.attentionTarget = { x: e.x, y: e.y, intensity: e.intensity ?? 1 };
  }
  setSimulator(on: boolean) {
    this.simulator = on;
  }

  /** Advance smoothing. Called once per frame by the renderer. */
  step(dt: number) {
    if (this.simulator) this.simulate(dt);
    else if (performance.now() - this.lastAudioAt > 400) {
      // decay if feed stalls
      for (const k of ["level", "bass", "mids", "treble"] as const) this.target[k] *= Math.exp(-6 * dt);
    }
    const attack = 1 - Math.exp(-18 * dt);
    const release = 1 - Math.exp(-6 * dt);
    for (const k of ["level", "bass", "mids", "treble"] as const) {
      const t = this.target[k];
      const a = this.audio[k];
      this.audio[k] = a + (t - a) * (t > a ? attack : release);
    }
    const wk = 1 - Math.exp(-2.2 * dt);
    for (const s of HOLO_STATES) {
      const goal = s === this.state ? 1 : 0;
      this.weights[s] += (goal - this.weights[s]) * (s === "sleep" ? wk * 0.6 : wk);
    }
    const ak = 1 - Math.exp(-3 * dt);
    const at = this.state === "watching" ? this.attentionTarget : { x: 0, y: 0, intensity: 0 };
    this.attention.x += (at.x - this.attention.x) * ak;
    this.attention.y += (at.y - this.attention.y) * ak;
    this.attention.intensity += (at.intensity - this.attention.intensity) * ak;
  }

  private simulate(dt: number) {
    this.simT += dt;
    const t = this.simT;
    // speech-like envelope: syllables (~5Hz) gated by phrases
    const phrase = Math.max(0, Math.sin(t * 0.7) * 0.6 + 0.55);
    const syll = Math.pow(Math.abs(Math.sin(t * 15.7 + Math.sin(t * 3.1) * 2)), 1.5);
    const jitter = 0.75 + 0.25 * Math.sin(t * 41.3) * Math.sin(t * 7.9);
    const level = Math.min(1, phrase * syll * jitter * 1.1);
    this.pushAudio({
      level,
      bass: Math.min(1, level * (0.6 + 0.4 * Math.sin(t * 2.3) ** 2)),
      mids: Math.min(1, level * (0.7 + 0.3 * Math.sin(t * 5.1))),
      treble: Math.min(1, level * (0.4 + 0.6 * Math.abs(Math.sin(t * 11.7)))),
    });
  }
}

export const hologram = new HologramEngine();

export interface FelenchoHologramAPI {
  setState: (s: HoloState) => void;
  pushAudio: (f: AudioFrame) => void;
  watch: (e: WatchEvent) => void;
  setSimulator: (on: boolean) => void;
  getState: () => HoloState;
  setPersona: (p: Persona) => void;
  lipSync: {
    enable: (enabled: boolean) => void;
    setTimeline: (cues: VisemeCue[], provenance?: string) => void;
    bindMedia: (media: HTMLMediaElement) => void;
    bindClock: (clock: () => { time: number; playing: boolean }) => void;
    setOffset: (seconds: number) => void;
    getFrame: () => { time: number; viseme: string; pose: typeof lipSync.pose; mode: string; provenance: string };
  };
}

/** Expose window.FelenchoHologram for Felencho Brain / LiveKit / Cartesia bridges. */
export function installGlobalAPI() {
  if (typeof window === "undefined") return;
  apiUsers++;
  if (apiUsers > 1) return releaseGlobalAPI;
  const api: FelenchoHologramAPI = {
    setState: (s) => hologram.setState(s),
    pushAudio: (f) => hologram.pushAudio(f),
    watch: (e) => hologram.watch(e),
    setSimulator: (on) => hologram.setSimulator(on),
    getState: () => hologram.state,
    setPersona: (p) => hologram.setPersona(p),
    lipSync: {
      enable: enabled => lipSync.configure(enabled),
      setTimeline: (cues, provenance) => lipSync.setTimeline(cues, provenance),
      bindMedia: media => lipSync.bindMedia(media),
      bindClock: clock => lipSync.bindClock(clock),
      setOffset: seconds => { if (Number.isFinite(seconds)) lipSync.offset = Math.max(-.5, Math.min(.5, seconds)); },
      getFrame: () => ({ time: lipSync.time, viseme: lipSync.viseme, pose: { ...lipSync.pose }, mode: lipSync.mode, provenance: lipSync.provenance }),
    },
  };
  const host = new URLSearchParams(window.location.search).get("host");
  if (host === "bob" || host === "lina") hologram.setPersona(host);
  (window as unknown as { FelenchoHologram: FelenchoHologramAPI }).FelenchoHologram = api;
  // postMessage bridge (iframe embedding in Next.js host)
  messageHandler = (ev: MessageEvent) => {
    const d = ev.data;
    if (!d || d.source !== "felencho") return;
    if (d.type === "state") hologram.setState(d.state);
    if (d.type === "audio") hologram.pushAudio(d);
    if (d.type === "watch") hologram.watch(d);
    if (d.type === "persona") hologram.setPersona(d.persona);
  };
  window.addEventListener("message", messageHandler);
  return releaseGlobalAPI;
}

let apiUsers = 0;
let messageHandler: ((event: MessageEvent) => void) | undefined;
function releaseGlobalAPI() {
  apiUsers = Math.max(0, apiUsers - 1);
  if (apiUsers === 0 && messageHandler) {
    window.removeEventListener('message', messageHandler);
    messageHandler = undefined;
    delete (window as unknown as { FelenchoHologram?: FelenchoHologramAPI }).FelenchoHologram;
  }
}
