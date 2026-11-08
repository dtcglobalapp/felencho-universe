'use client';
import { useEffect, useMemo, useState } from 'react';
import { HologramStage } from './HologramStage';
import { DevPanel } from './DevPanel';
import { Button } from './ui/Button';
import { hologram, type Persona } from './engine';
import { photoCoreStore } from './photoCoreStore';
import { useHologram } from './useHologram';
import { resolveCharacter, type CharacterOverrides, type PhotoStorage } from './characters';

export interface ExperienceProps {
  initialPersona?: Persona;
  characters?: Partial<Record<Persona, CharacterOverrides>>;
  storage?: PhotoStorage;
  screenPaths?: Record<Persona, string>;
}
/** Portable control screen. The studio screens remain overlay-free. */
export function HologramExperience({ initialPersona = 'lina', characters, storage = 'local', screenPaths }: ExperienceProps) {
  const configs = useMemo(() => ({ lina: resolveCharacter('lina', characters?.lina), bob: resolveCharacter('bob', characters?.bob) }), [characters]);
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [panel, setPanel] = useState(false);
  const [display, setDisplay] = useState(false);
  const ready = useHologram(initialPersona, configs[initialPersona], storage);
  useEffect(() => {
    photoCoreStore.configure('lina', configs.lina, storage);
    photoCoreStore.configure('bob', configs.bob, storage);
    const off = hologram.onPersona(setPersona);
    setPersona(hologram.persona);
    const sync = () => setDisplay(new URLSearchParams(window.location.search).get('display') === '1');
    sync();
    setPanel(new URLSearchParams(window.location.search).get('dev') === '1');
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches('input,textarea,select')) return;
      if (event.key.toLowerCase() === 'd') setPanel(v => !v);
      if (event.key === 'Escape') {
        const url = new URL(window.location.href); url.searchParams.delete('display');
        window.history.replaceState(null, '', url); sync();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('felencho:display', sync);
    return () => { off(); window.removeEventListener('keydown', onKey); window.removeEventListener('felencho:display', sync); };
  }, [configs, storage]);
  return <main className="h-[100dvh] w-full overflow-hidden bg-background">
    {ready && <HologramStage portraitDisplay fixedPersona={persona} palette={configs[persona].palette} />}
    {!display && !panel && <Button variant="ghost" className="dev-fab fixed bottom-4 right-4 z-10" aria-label="Open dev panel" onClick={() => setPanel(true)}>◈</Button>}
    {!display && panel && <DevPanel onClose={() => setPanel(false)} screenPaths={screenPaths} names={{ lina: configs.lina.name, bob: configs.bob.name }} />}
  </main>;
}