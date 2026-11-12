// Felencho Character Profiles V1 — framework-free identity gallery.
// No React / three imports: portable into Next.js or any host.
// The gallery manages identities and configuration only; Felencho Brain remains
// the sole intelligence and conversation system.
import { HOLO_STATES, type HoloState, type Persona } from './engine';
import type { HologramPalette, PhotoStorage } from './characters';
import { photoCoreStore, type PhotoCoreStore } from './photoCoreStore';

export interface ProfileVisual { scale: number; x: number; y: number; brightness: number; opacity: number }
export type ProfilePhotos = { main: string | null } & Partial<Record<HoloState, string | null>>;
export interface CharacterProfile {
  id: string;
  /** Which hologram body renders this profile. */
  persona: Persona;
  name: string;
  /** Voice identifier assigned in Felencho Brain / Cartesia; stored, never played here. */
  voiceId: string;
  languages: string[];
  specialty: string;
  personality: string;
  palette?: HologramPalette;
  photos: ProfilePhotos;
  visual: ProfileVisual;
  createdAt: number;
  updatedAt: number;
}

export const PROFILE_DATABASE = 'felencho-character-profiles';
export const PROFILE_FORMAT = 'felencho-character-profiles';
export const PROFILE_VERSION = 1;

const defaultVisual = (): ProfileVisual => ({ scale: 1, x: 0, y: 0, brightness: 1, opacity: 1 });
const emptyPhotos = (): ProfilePhotos => ({ main: null });

export function createProfile(persona: Persona, name: string, now = Date.now()): CharacterProfile {
  return {
    id: `profile-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    persona, name, voiceId: '', languages: [], specialty: '', personality: '',
    photos: emptyPhotos(), visual: defaultVisual(), createdAt: now, updatedAt: now,
  };
}

/** Photo shown for a hologram state: the state's own photo, or the main one. */
export function photoForState(profile: CharacterProfile, state: HoloState): string | null {
  return profile.photos[state] ?? profile.photos.main;
}

/** Every unique photo a profile can show, for preloading before transitions. */
export function profilePhotoUrls(profile: CharacterProfile): string[] {
  const urls = new Set<string>();
  for (const key of ['main', ...HOLO_STATES] as const) {
    const url = profile.photos[key];
    if (url) urls.add(url);
  }
  return [...urls];
}

interface ExportEnvelope { format: typeof PROFILE_FORMAT; version: number; profiles: CharacterProfile[] }

type Persist = (profiles: CharacterProfile[], selected: Record<Persona, string | null>) => Promise<void>;

export class CharacterProfileStore {
  profiles: CharacterProfile[] = [];
  selected: Record<Persona, string | null> = { lina: null, bob: null };
  loaded = false;
  storage: PhotoStorage = 'local';
  version = 0;
  private listeners = new Set<() => void>();
  private loading: Promise<void> | null = null;

  on = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  notify() { this.version++; this.listeners.forEach(l => l()); }

  byId(id: string | null | undefined) { return this.profiles.find(p => p.id === id) ?? null; }
  forPersona(persona: Persona) { return this.profiles.filter(p => p.persona === persona); }
  selectedProfile(persona: Persona) { return this.byId(this.selected[persona]); }

  add(persona: Persona, name: string): CharacterProfile {
    const profile = createProfile(persona, name);
    this.profiles = [...this.profiles, profile];
    this.notify();
    return profile;
  }

  duplicate(id: string): CharacterProfile | null {
    const source = this.byId(id);
    if (!source) return null;
    const now = Date.now();
    const copy: CharacterProfile = {
      ...source,
      id: `profile-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${source.name} copia`,
      photos: { ...source.photos }, visual: { ...source.visual },
      createdAt: now, updatedAt: now,
    };
    this.profiles = [...this.profiles, copy];
    this.notify();
    return copy;
  }

  update(id: string, patch: Partial<Omit<CharacterProfile, 'id' | 'createdAt'>>) {
    const profile = this.byId(id);
    if (!profile) return;
    Object.assign(profile, patch, { updatedAt: Date.now() });
    this.syncSelectedCore(profile.persona);
    this.notify();
  }

  setPhoto(id: string, slot: 'main' | HoloState, image: string | null) {
    const profile = this.byId(id);
    if (!profile) return;
    profile.photos = { ...profile.photos, [slot]: image };
    profile.updatedAt = Date.now();
    this.syncSelectedCore(profile.persona);
    this.notify();
  }

  /** Keep the photo core in sync when the selected profile changes. */
  private syncSelectedCore(persona: Persona, core: PhotoCoreStore = photoCoreStore) {
    const profile = this.selectedProfile(persona);
    if (!profile) return;
    core.edit(persona, { ...profile.visual, image: profile.photos.main, mode: profile.photos.main ? 'photo' : 'energy' });
    void core.apply(persona).catch(() => { /* Draft stays editable if persistence fails. */ });
  }

  remove(id: string) {
    const profile = this.byId(id);
    if (!profile) return;
    this.profiles = this.profiles.filter(p => p.id !== id);
    if (this.selected[profile.persona] === id) this.selected[profile.persona] = null;
    this.notify();
  }

  /** Select a profile for its persona slot and push its visual + main photo into the photo core. */
  async select(id: string, core: PhotoCoreStore = photoCoreStore, persist: Persist = saveProfiles) {
    const profile = this.byId(id);
    if (!profile) return;
    this.selected[profile.persona] = id;
    core.edit(profile.persona, { ...profile.visual, image: profile.photos.main, mode: profile.photos.main ? 'photo' : 'energy' });
    await core.apply(profile.persona);
    await this.persist(persist);
    this.notify();
  }

  async deselect(persona: Persona, persist: Persist = saveProfiles) {
    this.selected[persona] = null;
    await this.persist(persist);
    this.notify();
  }

  /** JSON export of one profile or the whole gallery, photos embedded as data URLs. */
  export(id?: string): string {
    const profiles = id ? this.profiles.filter(p => p.id === id) : this.profiles;
    const envelope: ExportEnvelope = { format: PROFILE_FORMAT, version: PROFILE_VERSION, profiles };
    return JSON.stringify(envelope, null, 2);
  }

  /** Import profiles from an export envelope. Returns the imported profiles. */
  import(json: string): CharacterProfile[] {
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { throw new Error('El archivo no es JSON válido.'); }
    const envelope = parsed as Partial<ExportEnvelope>;
    if (envelope?.format !== PROFILE_FORMAT || !Array.isArray(envelope.profiles)) {
      throw new Error('El archivo no es una exportación de perfiles Felencho.');
    }
    const imported: CharacterProfile[] = [];
    for (const raw of envelope.profiles) {
      const profile = raw as CharacterProfile;
      if (!profile || (profile.persona !== 'lina' && profile.persona !== 'bob') || typeof profile.name !== 'string') {
        throw new Error('La exportación contiene un perfil incompleto.');
      }
      const copy: CharacterProfile = {
        ...createProfile(profile.persona, profile.name),
        ...profile,
        id: `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        photos: { ...profile.photos, main: profile.photos?.main ?? null },
        visual: { ...defaultVisual(), ...profile.visual },
      };
      imported.push(copy);
    }
    this.profiles = [...this.profiles, ...imported];
    this.notify();
    return imported;
  }

  async load() {
    if (this.loaded) return;
    if (this.loading) return this.loading;
    this.loading = this.readLocal();
    return this.loading;
  }

  async persist(persist: Persist = saveProfiles) {
    if (this.storage === 'local' || persist !== saveProfiles) await persist(this.profiles, this.selected);
  }

  private async readLocal() {
    if (this.storage === 'memory') { this.ensureSeeds(); this.loaded = true; this.notify(); return; }
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction('profiles').objectStore('profiles').get('gallery');
        request.onsuccess = () => {
          const result = request.result as { profiles?: CharacterProfile[]; selected?: Record<Persona, string | null> } | undefined;
          if (result?.profiles) this.profiles = result.profiles;
          if (result?.selected) this.selected = result.selected;
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
      db.close();
    } catch { /* Seeds remain usable if IndexedDB is unavailable. */ }
    this.ensureSeeds();
    this.loaded = true;
    this.notify();
  }

  /** LINA and BOB always exist in the gallery, even before any import. */
  private ensureSeeds() {
    for (const persona of ['lina', 'bob'] as const) {
      if (!this.profiles.some(p => p.persona === persona)) {
        this.profiles = [...this.profiles, createProfile(persona, persona.toUpperCase(), 0)];
      }
    }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PROFILE_DATABASE, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('profiles'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveProfiles(profiles: CharacterProfile[], selected: Record<Persona, string | null>) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite');
      tx.objectStore('profiles').put({ profiles, selected }, 'gallery');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export const profileStore = new CharacterProfileStore();
