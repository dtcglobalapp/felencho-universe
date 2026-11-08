import { useEffect, useState } from 'react';
import { hologram, installGlobalAPI, type Persona } from './engine';
import { photoCoreStore } from './photoCoreStore';
import { profileStore } from './profiles';
import { lipSync } from './lipSync';
import type { CharacterConfig, PhotoStorage } from './characters';

export function useHologram(persona: Persona, config: CharacterConfig, storage: PhotoStorage) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const release = installGlobalAPI();
    hologram.setPersona(persona);
    lipSync.configure(false);
    photoCoreStore.configure(persona, config, storage);
    void profileStore.load();
    void photoCoreStore.load().then(() => { if (active) setReady(true); });
    return () => { active = false; hologram.setSimulator(false); release?.(); };
  }, [persona, config, storage]);
  return ready;
}