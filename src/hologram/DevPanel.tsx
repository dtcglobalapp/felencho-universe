import { useEffect, useState, type ReactNode } from "react";
import { Button } from './ui/Button';
import { PhotoCorePanel } from "./PhotoCorePanel";
import { ProfilePanel } from "./ProfilePanel";
import { HOLO_STATES, hologram, type HoloState, type Persona } from "./engine";

export function DevPanel({ onClose, legacyTests, screenPaths, onFullscreen, names }: { onClose: () => void; legacyTests?: ReactNode; screenPaths?: Record<Persona, string> | undefined; onFullscreen?: () => void; names?: Record<Persona, string> }) {
  const [state, setState] = useState<HoloState>(hologram.state);
  const [persona, setPersona] = useState<Persona>(hologram.persona);
  useEffect(() => hologram.onPersona(setPersona) as () => void, []);
  const [sim, setSim] = useState(hologram.simulator);
  const [manual, setManual] = useState({ level: 0.5, bass: 0.5, mids: 0.5, treble: 0.5 });
  const [useManual, setUseManual] = useState(false);

  useEffect(() => hologram.onState(setState) as () => void, []);
  useEffect(() => {
    if (!useManual) return;
    const id = setInterval(() => hologram.pushAudio(manual), 33);
    return () => clearInterval(id);
  }, [useManual, manual]);

  const pick = (s: HoloState) => {
    hologram.setState(s);
    if (s === "speaking" && !useManual) { hologram.setSimulator(true); setSim(true); }
    if (s === "watching") hologram.watch({ x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.5) * 0.8 });
  };

  const fullscreen = () => {
    if (onFullscreen) { onFullscreen(); return; }
    const u = new URL(window.location.href);
    u.searchParams.set("display", "1");
    window.history.replaceState(null, "", u);
    document.documentElement.requestFullscreen?.().catch(() => {});
    window.dispatchEvent(new Event("felencho:display"));
  };

  return (
    <aside className="dev-panel fixed bottom-3 left-3 right-3 z-10 max-h-[60vh] overflow-y-auto p-4 sm:left-auto sm:right-4 sm:bottom-4 sm:w-80">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Dev control</p>
          <h2 className="font-display text-sm tracking-[0.2em] text-foreground">{names?.[persona] ?? persona.toUpperCase()} · {state.toUpperCase()}</h2>
        </div>
        <Button variant="ghost" onClick={onClose} className="dev-chip" aria-label="Hide panel">Hide</Button>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        {(["lina", "bob"] as const).map((p) => (
          <Button variant="ghost" key={p} onClick={() => hologram.setPersona(p)} className="dev-chip" data-active={p === persona}>
            {names?.[p] ?? p.toUpperCase()}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {HOLO_STATES.map((s) => (
          <Button variant="ghost" key={s} onClick={() => pick(s)} className="dev-chip" data-active={s === state}>
            {s}
          </Button>
        ))}
      </div>
      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <label className="flex items-center justify-between">
          <span>Demo audio simulator</span>
          <input type="checkbox" checked={sim} onChange={(e) => { setSim(e.target.checked); hologram.setSimulator(e.target.checked); if (e.target.checked) setUseManual(false); }} />
        </label>
        <label className="flex items-center justify-between">
          <span>Manual levels</span>
          <input type="checkbox" checked={useManual} onChange={(e) => { setUseManual(e.target.checked); if (e.target.checked) { hologram.setSimulator(false); setSim(false); } }} />
        </label>
        {useManual &&
          (["level", "bass", "mids", "treble"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <span className="w-12 capitalize">{k}</span>
              <input className="flex-1 accent-primary" type="range" min={0} max={1} step={0.01} value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: +e.target.value })} />
            </label>
          ))}
      </div>
      <ProfilePanel persona={persona} />
      <PhotoCorePanel persona={persona} screenPaths={screenPaths} />
      {legacyTests && <details className="mt-4 text-xs text-muted-foreground">
        <summary>Pruebas faciales anteriores</summary>
        {legacyTests}
      </details>}
      <Button variant="ghost" onClick={fullscreen} className="dev-chip mt-4 w-full" data-active>
        Studio fullscreen display
      </Button>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        API: window.FelenchoHologram.setState("speaking") · pushAudio({"{"}level,bass,mids,treble{"}"}) · watch({"{"}x,y{"}"}). Press D to toggle. Clean display: ?display=1
      </p>
    </aside>
  );
}
