import { useEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Eye, Check, X } from 'lucide-react';
import { Button } from './ui/Button';
import type { Persona } from './engine';
import { photoCoreStore } from './photoCoreStore';

export function PhotoCorePanel({ persona, screenPaths = { lina: '/presence/lina', bob: '/presence/bob' } }: { persona: Persona; screenPaths?: Record<Persona, string> | undefined }) {
  const [, update] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => photoCoreStore.on(() => update(v => v + 1)), []);
  useEffect(() => setMessage(''), [persona]);
  const config = photoCoreStore.drafts[persona] ?? photoCoreStore.records[persona].current;
  async function upload(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setMessage('Selecciona una fotografía PNG, JPG o WebP.'); return; }
    setBusy(true); setMessage('');
    try {
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(); reader.onerror = reject; reader.readAsDataURL(file); });
      await new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(); img.onerror = reject; img.src = image; });
      photoCoreStore.edit(persona, { image, mode: 'photo' });
    } catch { setMessage('No se pudo leer la fotografía.'); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function save(restore = false) {
    setBusy(true); setMessage('');
    try { if (restore) await photoCoreStore.restore(persona); else await photoCoreStore.apply(persona); }
    catch { setMessage('No se pudo guardar. Revisa el espacio o los permisos de este navegador.'); } finally { setBusy(false); }
  }
  return <section className="mt-4 border-t border-border pt-4 space-y-3">
    <h3 className="text-sm text-foreground">{persona.toUpperCase()} · Photo Core</h3>
    <p className="text-[10px] text-muted-foreground">{photoCoreStore.storage === 'memory' ? 'Temporal · se borra al recargar.' : 'Cambios locales · solo en este navegador.'} Panel sin protección de acceso.</p>
    <div role="group" aria-label="Modo visual" className="grid grid-cols-2 gap-2">
      <Button size="sm" variant={config.mode === 'photo' ? 'default' : 'outline'} onClick={() => photoCoreStore.edit(persona, { mode: 'photo' })}>Photo Core</Button>
      <Button size="sm" variant={config.mode === 'energy' ? 'default' : 'outline'} onClick={() => photoCoreStore.edit(persona, { mode: 'energy' })}>Pure Energy</Button>
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Fotografía de ${persona.toUpperCase()}`} className="hidden" onChange={e => upload(e.target.files?.[0])} />
    <Button className="w-full" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}><ImagePlus />{config.image ? 'Sustituir fotografía' : 'Cargar fotografía original'}</Button>
    {!config.image && <p className="text-xs text-muted-foreground">Sin fotografía local de {persona.toUpperCase()}.</p>}
    {([['scale', 'Tamaño', .5, 1.4], ['x', 'Posición horizontal', -.8, .8], ['y', 'Posición vertical', -.8, .8], ['brightness', 'Brillo', .5, 1.5], ['opacity', 'Opacidad', .2, 1]] as const).map(([key, label, min, max]) => <label key={key} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="w-full">{label} · {config[key].toFixed(2)}</span><input aria-label={label} className="w-full accent-primary" type="range" min={min} max={max} step=".01" value={config[key]} onChange={e => photoCoreStore.edit(persona, { [key]: Number(e.target.value) })} /></label>)}
    <div className="flex gap-2">
      <Button title="Vista previa" aria-label="Vista previa" variant={photoCoreStore.previews[persona] ? 'default' : 'outline'} size="icon" disabled={!photoCoreStore.drafts[persona] || busy} onClick={() => photoCoreStore.preview(persona)}><Eye /></Button>
      <Button size="sm" disabled={!photoCoreStore.drafts[persona] || busy} onClick={() => save()}><Check />Aplicar</Button>
      <Button title="Descartar cambios" aria-label="Descartar cambios" variant="outline" size="icon" disabled={!photoCoreStore.drafts[persona] || busy} onClick={() => photoCoreStore.discard(persona)}><X /></Button>
      <Button title="Restaurar configuración anterior" aria-label="Restaurar configuración anterior" variant="outline" size="icon" disabled={!photoCoreStore.records[persona].previous || busy} onClick={() => save(true)}><RotateCcw /></Button>
    </div>
    {(message || photoCoreStore.errors[persona]) && <p role="alert" className="text-xs text-destructive">{message || photoCoreStore.errors[persona]}</p>}
    <div className="flex gap-3 text-xs text-primary"><a href={screenPaths.lina}>Pantalla LINA</a><a href={screenPaths.bob}>Pantalla BOB</a></div>
  </section>;
}
