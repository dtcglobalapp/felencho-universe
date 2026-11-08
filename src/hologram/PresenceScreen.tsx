import { useMemo } from 'react';
import { HologramStage } from './HologramStage';
import type { Persona } from './engine';
import { resolveCharacter, type CharacterOverrides, type PhotoStorage } from './characters';
import { useHologram } from './useHologram';
export interface ScreenProps { config?: CharacterOverrides; storage?: PhotoStorage }
export function PresenceScreen({ persona, config, storage = 'local' }: ScreenProps & { persona: Persona }) {
  const character = useMemo(() => resolveCharacter(persona, config), [persona, config]);
  const ready = useHologram(persona, character, storage);
  return <main className="presence-screen bg-background" aria-label={`${character.name} Studio Display`}>
    {ready && <HologramStage portraitDisplay fixedPersona={persona} palette={character.palette} />}
  </main>;
}
