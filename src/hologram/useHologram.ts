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
    void Promise.all([profileStore.load(), photoCoreStore.load()]).then(async () => {
      if (!active) return;
      // A saved gallery may have a complete identity but no selected profile.
      // Prefer its existing photograph rather than silently falling back to pure energy.
      if (!profileStore.selectedProfile(persona)) {
        const candidate = profileStore.forPersona(persona).find(profile =>
          Boolean(profile.photos.main || Object.values(profile.photos).some(Boolean))
        );
        if (candidate) {
          await profileStore.select(candidate.id).catch(() => {});
        }
      }
      if (active) setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; hologram.setSimulator(false); release?.(); };
  }, [persona, config, storage]);
  return ready;
}