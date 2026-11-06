"use client";

/**
 * Studio voice -> hologram TV bridge.
 *
 * Only the speaker's browser plays audio. Character display PCs receive
 * low-bandwidth animation envelopes, not a second audio stream.
 * Preliminary expressive visemes: true phoneme alignment is a separate step.
 */
import { supabase } from "@/lib/supabase";

export type HologramCharacter = "bob" | "lina";
export type HologramSignal = {
  studioId: string;
  character: HologramCharacter;
  session: string;
  sequence: number;
  timestamp: number;
  active: boolean;
  level: number;
  bass: number;
  mid: number;
  treble: number;
  viseme: "REST" | "A" | "E" | "I" | "O" | "U" | "M" | "F" | "L" | "S";
  weight: number;
};

export const HOLOGRAM_STUDIO_ID = "new_york_physical";
export const HOLOGRAM_EVENT = "voice-frame";
export const HOLOGRAM_CHANNEL = "felencho-hologram-voice-v1-" + HOLOGRAM_STUDIO_ID;

type Listener = (frame: HologramSignal) => void;

export function subscribeHologramVoice(onFrame: Listener): () => void {
  const channel = supabase.channel(HOLOGRAM_CHANNEL, {
    config: { broadcast: { self: false } },
  });
  channel.on("broadcast", { event: HOLOGRAM_EVENT }, ({ payload }) => {
    if (!payload || payload.studioId !== HOLOGRAM_STUDIO_ID) return;
    if (payload.character !== "bob" && payload.character !== "lina") return;
    if (typeof payload.timestamp !== "number" || !Number.isFinite(payload.timestamp)) return;
    if (typeof payload.sequence !== "number" || !Number.isFinite(payload.sequence)) return;
    if (typeof payload.session !== "string" || payload.session.length > 128) return;
    if (Math.abs(Date.now() - payload.timestamp) > 5000) return;
    const unit = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
    if (!["level", "bass", "mid", "treble", "weight"].every(key => unit(payload[key]))) return;
    if (!["REST", "A", "E", "I", "O", "U", "M", "F", "L", "S"].includes(payload.viseme)) return;
    onFrame(payload as HologramSignal);
  });
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export class StudioHologramVoiceSender {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private sequence = 0;
  private session = "";
  private character: HologramCharacter = "bob";
  private audio: HTMLAudioElement | null = null;
  private bands = new Uint8Array<ArrayBuffer>(1024);
  private wave = new Uint8Array<ArrayBuffer>(2048);

  async connect(audio: HTMLAudioElement, character: HologramCharacter): Promise<boolean> {
    this.disconnect();
    this.audio = audio;
    this.character = character;
    this.session = [Date.now(), Math.random().toString(36).slice(2)].join("-");
    // Do not route the studio voice through a suspended context: that
    // would mute the sound feeding RODECaster. Preserve HTMLAudioElement
    // playback when the browser disallows background Web Audio.
    const ctx = new AudioContext();
    this.context = ctx;
    if (ctx.state !== "running") {
      try { await Promise.race([
        ctx.resume(),
        new Promise<void>((resolve) => setTimeout(resolve, 250)),
      ]); } catch { /* Fall through: studio audio must still play. */ }
    }
    if (ctx.state !== "running") {
      this.disconnect();
      return false;
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.66;
    this.analyser = analyser;
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    this.channel = supabase.channel(HOLOGRAM_CHANNEL, {
      config: { broadcast: { self: false } },
    });
    this.channel.subscribe();
    this.ticker = setInterval(() => this.publish(), 65);
    return true;
  }

  private mean(a: number, b: number): number {
    const low = Math.floor(this.bands.length * a);
    const high = Math.max(low + 1, Math.floor(this.bands.length * b));
    let total = 0;
    for (let i = low; i < high; i++) total += this.bands[i];
    return Math.min(1, total / (255 * (high - low)));
  }

  private publish(silence = false) {
    if (!this.channel) return;
    const analyser = this.analyser;
    const audio = this.audio;
    let level = 0;
    let bass = 0;
    let mid = 0;
    let treble = 0;
    let viseme: HologramSignal["viseme"] = "REST";
    if (!silence && analyser && audio && !audio.paused && !audio.ended) {
      analyser.getByteFrequencyData(this.bands);
      analyser.getByteTimeDomainData(this.wave);
      let power = 0;
      for (const x of this.wave) {
        const y = (x - 128) / 128;
        power += y * y;
      }
      level = Math.min(1, Math.sqrt(power / this.wave.length) * 3.3);
      bass = this.mean(0, 0.08);
      mid = this.mean(0.08, 0.34);
      treble = this.mean(0.34, 0.82);
      if (level > 0.04) {
        // Spectral movement cue; NOT accurate letter/phoneme detection.
        viseme = treble > mid * 1.4 ? "S"
          : bass > mid * 1.33 ? "O"
          : mid > bass * 1.2 ? "E"
          : Math.sin(audio.currentTime * 12) > 0.2 ? "A" : "U";
      }
    }
    const frame: HologramSignal = {
      studioId: HOLOGRAM_STUDIO_ID,
      character: this.character,
      session: this.session,
      sequence: ++this.sequence,
      timestamp: Date.now(),
      active: !silence && !!audio && !audio.paused && !audio.ended,
      level, bass, mid, treble, viseme, weight: Math.min(1, level * 2.4),
    };
    // Nonblocking; a broadcast outage must not stop studio playback.
    void this.channel.send({ type: "broadcast", event: HOLOGRAM_EVENT, payload: frame })
      .catch(() => undefined);
  }

  disconnect() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    if (this.channel) {
      this.publish(true);
      void supabase.removeChannel(this.channel);
    }
    this.channel = null;
    this.analyser = null;
    this.audio = null;
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
  }
}
