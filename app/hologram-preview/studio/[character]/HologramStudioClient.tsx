'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

type Character = 'bob' | 'lina';
type SessionResponse = { serverUrl?: string; participantToken?: string; displayToken?: string; roomName?: string; error?: string };
type DispatchResponse = { ok?: boolean; error?: string; details?: string };

export default function HologramStudioClient({ character }: { character: Character }) {
  const roomRef = useRef<Room | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState('STUDIO OFF · No se consume audio ni se ha creado una sesión.');
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [displayUrl, setDisplayUrl] = useState('');
  const audioElements = useRef<HTMLAudioElement[]>([]);
  const stop = useCallback(() => {
    stopRef.current();
    setActive(false);
    setMicrophone(false);
    setBusy(false);
    setStatus('STUDIO OFF · Sesión desconectada.');
    setDisplayUrl('');
  }, []);

  useEffect(() => () => { stopRef.current(); }, []);

  const start = async () => {
    if (busy || roomRef.current) return;
    setBusy(true);
    setStatus('Creando sala independiente para ' + character.toUpperCase() + '…');
    let room: Room | null = null;
    try {
      const result = await fetch('/api/live/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character }) });
      const session = await result.json() as SessionResponse;
      if (!result.ok || !session.serverUrl || !session.participantToken || !session.displayToken || !session.roomName) {
        throw new Error(session.error ?? 'No se pudo obtener la sala LiveKit.');
      }
      room = new Room({ adaptiveStream: true });
      roomRef.current = room;
      let stopped = false;
      stopRef.current = () => {
        if (stopped) return;
        stopped = true;
        for (const element of audioElements.current) { element.pause(); element.remove(); }
        audioElements.current = [];
        const current = roomRef.current;
        roomRef.current = null;
        void current?.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        void current?.disconnect();
      };
      room.on(RoomEvent.TrackSubscribed, track => {
        if (track.kind !== Track.Kind.Audio) return;
        const element = track.attach() as HTMLAudioElement;
        element.autoplay = true;
        element.style.display = 'none';
        document.body.appendChild(element);
        audioElements.current.push(element);
        void element.play().catch(() => setStatus('Audio conectado; revisa permiso de reproducción del navegador.'));
        setStatus('Audio de ' + character.toUpperCase() + ' recibido. Felencho Brain y Cartesia deben responder.');
      });
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) {
          stopRef.current();
          setActive(false);
          setMicrophone(false);
          setStatus('La sala LiveKit se desconectó.');
        }
      });
      await room.connect(session.serverUrl, session.participantToken);
      const target = '/hologram-preview/live/' + character;
      const fragment = new URLSearchParams({ server: session.serverUrl, token: session.displayToken });
      const url = new URL(target, window.location.origin);
      url.hash = fragment.toString();
      setDisplayUrl(url.toString());
      // Microphone is published only after a separate user action.
      setActive(true);
      setStatus('Sala creada. Activa micrófono, luego inicia el agente y abre el enlace de holograma.');
    } catch (error) {
      stopRef.current();
      setStatus(error instanceof Error ? error.message : 'Error de conexión LiveKit.');
      setActive(false);
    } finally { setBusy(false); }
  };

  const enableMic = async () => {
    const room = roomRef.current;
    if (!room || microphone) return;
    setBusy(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(true, undefined, { dtx: false });
      setMicrophone(true);
      setStatus('Micrófono activo; puedes iniciar el agente.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo abrir el micrófono.'); }
    finally { setBusy(false); }
  };

  const dispatch = async () => {
    const room = roomRef.current;
    if (!room || !microphone) return;
    setBusy(true);
    setStatus('Iniciando solo el agente de ' + character.toUpperCase() + '…');
    try {
      // The server's dispatch action is explicit to avoid duplicate paid agent jobs.
      const response = await fetch('/api/live/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: room.name, character, participantIdentity: room.localParticipant.identity }),
      });
      const payload = await response.json() as DispatchResponse;
      if (!response.ok) throw new Error(payload.details || payload.error || 'Error al iniciar el agente.');
      setStatus('Agente iniciado. Abre el holograma y conversa con ' + character.toUpperCase() + '.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Error al iniciar el agente.'); }
    finally { setBusy(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
    <section className="w-full max-w-2xl space-y-5 rounded-3xl border border-white/15 bg-black p-6">
      <h1 className="text-2xl font-bold">Felencho Studio · {character.toUpperCase()}</h1>
      <p className="text-sm text-zinc-400">Prueba de audio real con Felencho Brain, Cartesia Sonic 3 y LiveKit. El holograma va en otra pantalla; esta página controla el micrófono desde La Bestia.</p>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => void start()} disabled={busy || active} className="rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-black disabled:opacity-40">1. Crear sala</button>
        <button onClick={() => void enableMic()} disabled={busy || !active || microphone} className="rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-black disabled:opacity-40">2. Activar micrófono</button>
        <button onClick={() => void dispatch()} disabled={busy || !microphone} className="rounded-lg bg-amber-300 px-4 py-3 font-semibold text-black disabled:opacity-40">3. Iniciar agente</button>
        <button onClick={stop} disabled={!active && !busy} className="rounded-lg border border-red-400 px-4 py-3 font-semibold text-red-300 disabled:opacity-40">Apagar y desconectar</button>
      </div>
      {displayUrl && <div className="space-y-2 rounded-lg border border-cyan-500/30 p-3">
        <p className="font-semibold">Enlace temporal para la TV vertical</p>
        <p className="text-xs text-zinc-400">Es un enlace con autorización temporal: no lo compartas públicamente. Usa la misma red o la dirección accesible del servidor.</p>
        <div className="flex flex-wrap gap-3">
          <button className="rounded bg-cyan-500 px-4 py-2 text-black" onClick={() => void navigator.clipboard.writeText(displayUrl)}>Copiar enlace</button>
          <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-cyan-400 px-4 py-2">Abrir holograma</a>
        </div>
      </div>}
      <p className="text-sm text-zinc-300" role="status">{status}</p>
      <p className="text-xs text-amber-300">Esta prueba crea una sesión facturable solo al pulsar «Iniciar agente». Apaga al terminar. Aún requiere instalar el worker actualizado de la rama; el worker antiguo seguiría buscando LemonSlice.</p>
    </section>
  </main>;
}
