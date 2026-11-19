import { createLightController, LIGHT_STATES, unit, type LightState } from '../controller';
export const DEMO_SECONDS = 12;
export const MOTION = { floatHeight: 0.09, floatRate: 1.65, breath: 0.016, orbitRate: 0.65, hairWave: 0.035 };
export function demoAt(seconds: number) {
  const t = Math.max(0, Math.min(DEMO_SECONDS - 0.00001, seconds));
  const state = LIGHT_STATES[Math.floor(t / 2)] ?? 'IDLE';
  return { state, audio: { level: unit(0.45 + Math.sin(t * 5) * 0.4), bass: unit(0.5 + Math.sin(t * 3.5) * 0.48), mids: unit(0.4 + Math.sin(t * 6 + 1) * 0.35), treble: unit(0.3 + Math.sin(t * 11) * 0.28) } };
}
export function poseAt(time: number, state: LightState) {
  const listening = state === 'LISTENING';
  return { floatY: Math.sin(time * MOTION.floatRate) * MOTION.floatHeight,
    headYaw: state === 'WATCHING' ? Math.sin(time * 0.8) * 0.055 : listening ? 0 : Math.sin(time * 0.6) * 0.018,
    shoulderScale: 1 + Math.sin(time * 2) * MOTION.breath,
    orbitA: time * MOTION.orbitRate * (listening ? 0.3 : 1),
    orbitB: -time * MOTION.orbitRate * 0.83 * (listening ? 0.3 : 1),
    blink: state === 'SLEEP' ? 1 : Math.pow(Math.max(0, Math.cos(time * Math.PI / 2.7)), 90),
  };
}
export function createV2Controller() {
  const base = createLightController();
  let moving = true, speed = 1, time = 0, demoElapsed: number | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(fn => fn());
  let orbitA = 0, orbitB = 0;
  return { ...base,
    rig: {
      setMotion(on: boolean) { moving = Boolean(on); notify(); },
      setSpeed(value: number) { speed = Number.isFinite(value) ? Math.max(0.25, Math.min(2, value)) : 1; notify(); },
      startDemo() { demoElapsed = 0; moving = true; speed = 1; base.setState('IDLE'); notify(); },
      stopDemo() { demoElapsed = null; base.setState('IDLE'); base.pushAudio({}); notify(); },
      getSnapshot() { return { moving, speed, time, demoElapsed, orbitA, orbitB, pose: poseAt(time, base.getSnapshot().state) }; },
      subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
      step(delta: number) {
        const dt = Math.max(0, Number.isFinite(delta) ? delta : 0);
        if (demoElapsed !== null && moving) {
          demoElapsed += dt;
          if (demoElapsed >= DEMO_SECONDS) { demoElapsed = null; base.setState('IDLE'); base.pushAudio({}); notify(); }
          else { const demo = demoAt(demoElapsed); base.setState(demo.state); base.pushAudio(demo.audio); }
        }
        if (moving) {
          time += dt * speed;
          const factor = base.getSnapshot().state === 'LISTENING' ? 0.3 : 1;
          orbitA += dt * speed * MOTION.orbitRate * factor;
          orbitB -= dt * speed * MOTION.orbitRate * 0.83 * factor;
        }
      },
    },
  };
}
export type V2Controller = ReturnType<typeof createV2Controller>;
declare global { interface Window { FelenchoLightV2?: V2Controller; __linaV2?: { sim: (seconds: number) => void; snapshot: () => ReturnType<V2Controller['rig']['getSnapshot']> } } }