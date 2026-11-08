import type { Persona } from './engine';
import type { CharacterConfig, PhotoStorage } from './characters';

export type PhotoMode = 'photo' | 'energy';
export interface PhotoConfig { mode: PhotoMode; image: string | null; scale: number; x: number; y: number; brightness: number; opacity: number }
export const defaultPhotoConfig = (): PhotoConfig => ({ mode: 'photo', image: null, scale: 1, x: 0, y: 0, brightness: 1, opacity: 1 });
export const PHOTO_DATABASE = 'felencho-private-photo-core';
type Saved = { current: PhotoConfig; previous: PhotoConfig | null };
export class PhotoCoreStore {
  records: Record<Persona, Saved> = { lina: { current: defaultPhotoConfig(), previous: null }, bob: { current: defaultPhotoConfig(), previous: null } };
  drafts: Partial<Record<Persona, PhotoConfig>> = {};
  previews: Partial<Record<Persona, boolean>> = {};
  errors: Partial<Record<Persona, string>> = {};
  version = 0;
  loaded = false;
  storage: PhotoStorage = 'local';
  private configured = new Set<Persona>();
  private localOverrides = new Set<Persona>();
  private loading: Promise<void> | null = null;
  configure(p: Persona, config: CharacterConfig, storage: PhotoStorage = 'local') {
    this.storage = storage;
    if (this.configured.has(p) || this.localOverrides.has(p)) return;
    this.configured.add(p);
    this.records[p].current = { ...this.records[p].current,
      ...(config.defaultImage ? { image: config.defaultImage } : {}),
      ...(config.initialMode ? { mode: config.initialMode === 'photo-core' ? 'photo' as const : 'energy' as const } : {}) };
    this.notify();
  }
  private listeners = new Set<() => void>();
  on = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  notify() { this.version++; this.listeners.forEach(l => l()); }
  active(p: Persona) { return this.previews[p] && this.drafts[p] ? this.drafts[p] : this.records[p].current; }
  hasPhoto(p: Persona) { const c = this.active(p); return c?.mode === 'photo' && Boolean(c.image) && !this.errors[p]; }
  edit(p: Persona, patch: Partial<PhotoConfig>) { this.drafts[p] = { ...(this.drafts[p] ?? this.records[p].current), ...patch }; delete this.errors[p]; this.notify(); }
  preview(p: Persona) { if (this.drafts[p]) { this.previews[p] = !this.previews[p]; this.notify(); } }
  discard(p: Persona) { delete this.drafts[p]; delete this.previews[p]; delete this.errors[p]; this.notify(); }
  async apply(p: Persona, persist: (p: Persona, saved: Saved) => Promise<void> = saveRecord) {
    const draft = this.drafts[p]; if (!draft) return;
    const saved = { current: { ...draft }, previous: { ...this.records[p].current } };
    if (this.storage === 'local' || persist !== saveRecord) await persist(p, saved);
    this.localOverrides.add(p); this.records[p] = saved; this.discard(p);
  }
  async restore(p: Persona, persist: (p: Persona, saved: Saved) => Promise<void> = saveRecord) {
    const previous = this.records[p].previous; if (!previous) return;
    const saved = { current: { ...previous }, previous: { ...this.records[p].current } };
    if (this.storage === 'local' || persist !== saveRecord) await persist(p, saved);
    this.localOverrides.add(p); this.records[p] = saved; this.discard(p);
  }
  fail(p: Persona, message: string) { this.errors[p] = message; this.notify(); }
  async load() {
    if (this.loaded) return;
    if (this.loading) return this.loading;
    this.loading = this.readLocal();
    return this.loading;
  }
  private async readLocal() {
    if (this.storage === 'memory') { this.loaded = true; this.notify(); return; }
    try {
      const db = await openDatabase();
      await Promise.all((['lina', 'bob'] as const).map(p => new Promise<void>((resolve, reject) => {
        const request = db.transaction('portraits').objectStore('portraits').get(p);
        request.onsuccess = () => { if (request.result?.current) { this.records[p] = request.result; this.localOverrides.add(p); } resolve(); };
        request.onerror = () => reject(request.error);
      })));
      db.close();
    } catch { /* Project defaults and in-memory changes remain usable if IndexedDB is unavailable. */ }
    this.loaded = true; this.notify();
  }
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DATABASE, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('portraits'); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function saveRecord(p: Persona, saved: Saved) {
  const db = await openDatabase();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('portraits', 'readwrite'); tx.objectStore('portraits').put(saved, p);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export const photoCoreStore = new PhotoCoreStore();
