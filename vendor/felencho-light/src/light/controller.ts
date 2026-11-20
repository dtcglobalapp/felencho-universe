export const LIGHT_STATES = ['IDLE', 'LISTENING', 'THINKING', 'SPEAKING', 'WATCHING', 'SLEEP'] as const;
export type LightState = typeof LIGHT_STATES[number];
export type AudioFrame = { level: number; bass: number; mids: number; treble: number };
export const STATE_ENERGY: Record<LightState, number> = { IDLE: 0.15, LISTENING: 0.3, THINKING: 0.5, SPEAKING: 0.65, WATCHING: 0.25, SLEEP: 0.025 };
export function unit(value: number) { return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; }
export function createLightController() {
  let state: LightState = 'IDLE';
  let audio: AudioFrame = { level: 0, bass: 0, mids: 0, treble: 0 };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(fn => fn());
  return {
    setState(next: LightState) { if (!LIGHT_STATES.includes(next)) throw new Error('Estado de luz no válido'); state = next; notify(); },
    pushAudio(next: Partial<AudioFrame>) { audio = { level: unit(next.level ?? 0), bass: unit(next.bass ?? 0), mids: unit(next.mids ?? 0), treble: unit(next.treble ?? 0) }; notify(); },
    getSnapshot: () => ({ state, audio: { ...audio } }),
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}
export type LightController = ReturnType<typeof createLightController>;
declare global { interface Window { FelenchoLight?: LightController } }