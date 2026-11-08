import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Copy, Trash2, ImagePlus, X, Plus } from 'lucide-react';
import { Button } from './ui/Button';
import { HOLO_STATES, type HoloState, type Persona } from './engine';
import { photoForState, profileStore, type CharacterProfile } from './profiles';

const STATE_LABELS: Record<'main' | HoloState, string> = {
  main: 'Principal', idle: 'IDLE', listening: 'LISTENING', thinking: 'THINKING', speaking: 'SPEAKING', watching: 'WATCHING', sleep: 'SLEEP',
};

async function readPhoto(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Selecciona una fotografía PNG, JPG o WebP.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read'));
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(); img.onerror = () => reject(new Error('img')); img.src = dataUrl; });
  return dataUrl;
}

function download(filename: string, json: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function ProfilePanel({ persona }: { persona: Persona }) {
  const [, update] = useState(0);
  const [message, setMessage] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const photoSlot = useRef<'main' | HoloState>('main');
  useEffect(() => profileStore.on(() => update(v => v + 1)), []);
  useEffect(() => setMessage(''), [persona]);

  const profiles = profileStore.forPersona(persona);
  const selected = profileStore.selectedProfile(persona);

  const persist = () => { void profileStore.persist().catch(() => setMessage('No se pudo guardar la galería en este navegador.')); };

  async function uploadPhoto(file?: File) {
    if (!file || !selected) return;
    setMessage('');
    try {
      const image = await readPhoto(file);
      profileStore.setPhoto(selected.id, photoSlot.current, image);
      persist();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo leer la fotografía.'); }
    finally { if (photoInput.current) photoInput.current.value = ''; }
  }

  async function importProfiles(file?: File) {
    if (!file) return;
    setMessage('');
    try {
      const text = await file.text();
      const imported = profileStore.import(text);
      persist();
      setMessage(`Importados ${imported.length} perfil(es).`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo importar.'); }
    finally { if (importInput.current) importInput.current.value = ''; }
  }

  function pickSlot(slot: 'main' | HoloState) {
    photoSlot.current = slot;
    photoInput.current?.click();
  }

  return <section className="mt-4 border-t border-border pt-4 space-y-3">
    <h3 className="text-sm text-foreground">Perfiles de personajes</h3>
    <p className="text-[10px] text-muted-foreground">Galería de identidades. Felencho Brain sigue siendo el único sistema de inteligencia; aquí solo se guardan fotografías y configuración.</p>

    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Galería de personajes">
      {profiles.map(p => (
        <Button key={p.id} size="sm" variant={selected?.id === p.id ? 'default' : 'outline'}
          onClick={() => { void profileStore.select(p.id).catch(() => setMessage('No se pudo seleccionar el perfil.')); }}>
          {p.name}
        </Button>
      ))}
      <Button size="sm" variant="ghost" aria-label="Nuevo personaje" onClick={() => { profileStore.add(persona, `Nuevo ${persona.toUpperCase()}`); persist(); }}><Plus /></Button>
    </div>

    {selected && <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs text-foreground">{selected.name}</strong>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" title="Duplicar perfil" aria-label="Duplicar perfil" onClick={() => { profileStore.duplicate(selected.id); persist(); }}><Copy /></Button>
          <Button size="icon" variant="ghost" title="Eliminar perfil" aria-label="Eliminar perfil"
            onClick={() => { profileStore.remove(selected.id); persist(); }}><Trash2 /></Button>
        </div>
      </div>

      {([
        ['name', 'Nombre'], ['voiceId', 'Voz (identificador)'], ['specialty', 'Especialidad'], ['personality', 'Personalidad'],
      ] as const).map(([key, label]) => (
        <label key={key} className="block text-xs text-muted-foreground">{label}
          <input className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground" value={selected[key]}
            onChange={e => { profileStore.update(selected.id, { [key]: e.target.value }); persist(); }} />
        </label>
      ))}
      <label className="block text-xs text-muted-foreground">Idiomas (separados por coma)
        <input className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-foreground" value={selected.languages.join(', ')}
          onChange={e => { profileStore.update(selected.id, { languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }); persist(); }} />
      </label>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Fotografías por estado</p>
        <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Subir fotografía de estado" className="hidden" onChange={e => void uploadPhoto(e.target.files?.[0])} />
        {(['main', ...HOLO_STATES] as const).map(slot => {
          const url = selected.photos[slot];
          const effective = photoForState(selected, slot === 'main' ? 'idle' : slot);
          return <div key={slot} className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-border bg-background">
              {url ? <img src={url} alt={`${selected.name} ${STATE_LABELS[slot]}`} className="h-full w-full object-cover" /> : <span className="text-[9px] text-muted-foreground">—</span>}
            </div>
            <span className="flex-1 text-xs text-muted-foreground">{STATE_LABELS[slot]}{!url && slot !== 'main' && effective ? ' · usa principal' : ''}</span>
            <Button size="icon" variant="outline" title={url ? 'Sustituir fotografía' : 'Subir fotografía'} aria-label={`${url ? 'Sustituir' : 'Subir'} fotografía ${STATE_LABELS[slot]}`} onClick={() => pickSlot(slot)}><ImagePlus /></Button>
            {url && <Button size="icon" variant="ghost" title="Eliminar fotografía" aria-label={`Eliminar fotografía ${STATE_LABELS[slot]}`}
              onClick={() => { profileStore.setPhoto(selected.id, slot, null); persist(); }}><X /></Button>}
          </div>;
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => download(`felencho-profile-${selected.name.toLowerCase().replace(/\s+/g, '-')}.json`, profileStore.export(selected.id))}><Download />Exportar perfil</Button>
        <Button size="sm" variant="outline" onClick={() => download('felencho-profiles.json', profileStore.export())}><Download />Exportar galería</Button>
        <Button size="sm" variant="outline" onClick={() => importInput.current?.click()}><Upload />Importar</Button>
        <input ref={importInput} type="file" accept="application/json,.json" aria-label="Importar perfiles" className="hidden" onChange={e => void importProfiles(e.target.files?.[0])} />
      </div>
    </div>}

    {!selected && <p className="text-xs text-muted-foreground">Selecciona un perfil para editarlo. Sin perfil activo se usa la configuración de Photo Core.</p>}
    {message && <p role="alert" className="text-xs text-destructive">{message}</p>}
  </section>;
}
