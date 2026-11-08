import type { CharacterOverrides } from './hologram/characters';
export const characters: Record<'lina' | 'bob', CharacterOverrides> = {
  lina: { name: 'LINA', initialMode: 'photo-core' },
  bob: { name: 'BOB', initialMode: 'photo-core' },
};
