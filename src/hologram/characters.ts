import * as THREE from 'three';
import type { Persona } from './engine';

export interface HologramPalette { a: string; b: string; c: string; d: string }
export interface CharacterConfig {
  name: string;
  palette: HologramPalette;
  /** Project image URL or imported image.src. No originals are bundled automatically. */
  defaultImage?: string;
  initialMode?: 'photo-core' | 'pure-energy';
}
export type CharacterOverrides = Partial<CharacterConfig>;
export type PhotoStorage = 'local' | 'memory';

export const CHARACTERS: Record<Persona, CharacterConfig> = {
  lina: { name: 'LINA', palette: { a: '#7a2cff', b: '#ff2bd6', c: '#22e6ff', d: '#2f6bff' } },
  bob: { name: 'BOB', palette: { a: '#1f4bff', b: '#ffb43a', c: '#dfe8ff', d: '#5fc8ff' } },
};
export function resolveCharacter(persona: Persona, overrides?: CharacterOverrides): CharacterConfig {
  return { ...CHARACTERS[persona], ...overrides, palette: overrides?.palette ?? CHARACTERS[persona].palette };
}
export function colorPalette(palette: HologramPalette) {
  return { a: new THREE.Color(palette.a), b: new THREE.Color(palette.b), c: new THREE.Color(palette.c), d: new THREE.Color(palette.d) };
}