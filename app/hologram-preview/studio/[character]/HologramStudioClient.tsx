'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

type Character = 'bob' | 'lina';
type SessionResponse = { serverUrl?: string; participantToken?: string; displayToken?: string; roomName?: string; error?: string };
type DispatchResponse = { ok?: boolean; error?: string; details?: string };

export default function HologramStudioClient({ character }: { character: Character }) {
  const roomRef = useRef<Room | null>(null);
  const dispatchStartedRef = useRef(false);
  const [dispatched, setDispatched] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState('STUDIO OFF · No se consume audio ni se ha creado una sesión.');
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const authorizedRef = useRef(false);
  const sessionGenerationRef = useRef(0);
  const [displayUrl, setDisplayUrl] = useState('');
  const audioElements = useRef<HTMLAudioElement[]>([]);
  const micAnalyzerCleanupRef = useRef<(() => void) | null>(null);
  const lastStudioStateRef = useRef('');
  const stop = useCallback(() => {
    sessionGenerationRef.current++;
    authorizedRef.current = false;
    setAuthorized(false);
    stopRef.current();
    micAnalyzerCleanupRef.current?.();
    micAnalyzerCleanupRef.current = null;
    setActive(false);
    setMicrophone(false);
    setBusy(false);
    setStatus('STUDIO OFF · Sesión desconectada.');
    setDisplayUrl('');
    dispatchStartedRef.current = false;
    setDispatched(false);
  }, []);

  useEffect(() => () => { stopRef.current(); }, []);

  const start = async () => {
    if (busy || roomRef.current) return;
    dispatchStartedRef.current = false;
    setDispatched(false);
    setBusy(true);
    const generation = ++sessionGenerationRef.current;
    setStatus('Creando sala independiente para ' + character.toUpperCase() + '…');
    let room: Room | null = null;
    try {
      const result = await fetch('/api/live/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character }) });
      const session = await result.json() as SessionResponse;
      if (generation !== sessionGenerationRef.current) return;
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
        micAnalyzerCleanupRef.current?.();
        micAnalyzerCleanupRef.current = null;
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
      room.on(RoomEvent.Reconnecting, () => {
        if (roomRef.current === room) setStatus('Reconectando al estudio… LiveKit intenta recuperar la misma sala y el mismo hilo de conversación.');
      });
      room.on(RoomEvent.Reconnected, () => {
        if (roomRef.current === room) {
          setStatus('Conexión recuperada. Misma sala y mismo agente; no se inició otra sesión.');
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) {
          authorizedRef.current = false;
          setAuthorized(false);
          stopRef.current();
          setActive(false);
          setMicrophone(false);
          setStatus('La sala LiveKit se desconectó.');
        }
      });
      await room.connect(session.serverUrl, session.participantToken);
      if (generation !== sessionGenerationRef.current) { await room.disconnect(); return; }
      const target = '/hologram-preview/live/' + character;
      const fragment = new URLSearchParams({ server: session.serverUrl, token: session.displayToken });
      const url = new URL(target, window.location.origin);
      url.hash = fragment.toString();
      setDisplayUrl(url.toString());
      // Microphone is published only after a separate user action.
      setActive(true);
      setStatus('Sala creada. Solicitando permiso del micrófono…');
      const micOk = await enableMic(room);
      if (!micOk || roomRef.current !== room) {
        setStatus('Sala creada, pero falta autorizar el micrófono. Abre Opciones técnicas para reintentarlo.');
        return;
      }
      const dispatchedOk = await dispatch(room, true);
      if (generation !== sessionGenerationRef.current || roomRef.current !== room) return;
      if (dispatchedOk) {
        await room.localParticipant.setMicrophoneEnabled(false);
        authorizedRef.current = false;
        setAuthorized(false);
        setStatus(character.toUpperCase() + ' permanece presente, sin escuchar tu micrófono. Pulsa DAR LA PALABRA cuando quieras intervenir.');
      }
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return;
      stopRef.current();
      setStatus(error instanceof Error ? error.message : 'Error de conexión LiveKit.');
      setActive(false);
    } finally { if (generation === sessionGenerationRef.current) setBusy(false); }
  };

  const enableMic = async (selectedRoom?: Room): Promise<boolean> => {
    const room = selectedRoom ?? roomRef.current;
    if (!room || microphone) return false;
    setBusy(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(true, undefined, { dtx: false });
      const track = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
      if (track) {
        // Read only the already published studio microphone, never request another one.
        const ctx = new AudioContext();
        await ctx.resume();
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser); // no connection to speakers, avoids acoustic feedback
        const waveform = new Uint8Array(analyser.fftSize);
        let raf = 0;
        let lastVoiceAt = 0;
        let wasSpeaking = false;
        let currentState = '';
        let lastBroadcastAt = 0;
        const broadcast = (state: 'idle' | 'listening' | 'thinking') => {
          // Repeat the current state periodically so a TV that joins later
          // receives it without requiring another microphone transition.
          const now = performance.now();
          if (currentState === state && now - lastBroadcastAt < 2500) return;
          lastBroadcastAt = now;
          currentState = state;
          lastStudioStateRef.current = state;
          void room.localParticipant.publishData(
            new TextEncoder().encode(JSON.stringify({ source: 'felencho-studio', character, state, at: Date.now() })),
            { reliable: true },
          ).catch(() => {});
        };
        const monitorMic = () => {
          if (roomRef.current !== room) return;
          if (!authorizedRef.current) {
            broadcast('idle');
            raf = requestAnimationFrame(monitorMic);
            return;
          }
          analyser.getByteTimeDomainData(waveform);
          let sum = 0;
          for (const sample of waveform) {
            const n = (sample - 128) / 128;
            sum += n * n;
          }
          const rms = Math.sqrt(sum / waveform.length);
          const now = performance.now();
          const speechDetected = rms > 0.028;
          if (speechDetected) { lastVoiceAt = now; wasSpeaking = true; broadcast('listening'); }
          else if (wasSpeaking && now - lastVoiceAt > 550) { wasSpeaking = false; broadcast('thinking'); }
          else if (!wasSpeaking && now - lastVoiceAt > 12000 && currentState === 'thinking') { broadcast('idle'); }
          else if (currentState === 'idle' || currentState === 'listening' || currentState === 'thinking') { broadcast(currentState); }
          raf = requestAnimationFrame(monitorMic);
        };
        broadcast('idle');
        raf = requestAnimationFrame(monitorMic);
        micAnalyzerCleanupRef.current = () => {
          cancelAnimationFrame(raf);
          source.disconnect();
          analyser.disconnect();
          void ctx.close().catch(() => {});
        };
      }
      setMicrophone(true);
      setStatus('Micrófono activo; detector de escucha y pensamiento preparado.');
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo abrir el micrófono.');
      return false;
    } finally { setBusy(false); }
  };

  const dispatch = async (selectedRoom?: Room, micConfirmed = false): Promise<boolean> => {
    const room = selectedRoom ?? roomRef.current;
    if (!room || (!micConfirmed && !microphone) || dispatchStartedRef.current) return false;
    dispatchStartedRef.current = true;
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
      setDispatched(true);
      setStatus('Agente iniciado. Abre el holograma y conversa con ' + character.toUpperCase() + '.');
      return true;
    } catch (error) {
      // Do not automatically retry a possibly accepted dispatch: it can create paid duplicate jobs.
      setStatus((error instanceof Error ? error.message : 'Error al iniciar el agente.') + ' No se hará un segundo despacho automático; apaga y reinicia cuando lo decidas.');
      return false;
    } finally { setBusy(false); }
  };

  const togglePermission = async () => {
    const room = roomRef.current;
    if (!room || !microphone || !dispatched || busy) return;
    setBusy(true);
    const next = !authorizedRef.current;
    try {
      // Muting the studio microphone is the hard privacy/intervention gate:
      // when OFF, the voice worker does not receive Felencho's audio.
      await room.localParticipant.setMicrophoneEnabled(next);
      authorizedRef.current = next;
      setAuthorized(next);
      if (!next) {
        lastStudioStateRef.current = 'idle';
        void room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ source: 'felencho-studio', character, state: 'idle', at: Date.now() })),
          { reliable: true },
        ).catch(() => {});
      }
      setStatus(next
        ? 'PALABRA AUTORIZADA: ' + character.toUpperCase() + ' puede escuchar y responder. Pulsa VOLVER A ESPERA para silenciar el micrófono.'
        : character.toUpperCase() + ' permanece en el estudio, con tu micrófono silenciado.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cambiar la autorización.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
    <section className="w-full max-w-2xl space-y-5 rounded-3xl border border-white/15 bg-black p-6">
      <h1 className="text-2xl font-bold">Felencho Studio · {character.toUpperCase()}</h1>
      <p className="text-sm text-zinc-400">Prueba de audio real con Felencho Brain, Cartesia Sonic 3 y LiveKit. Un solo botón prepara la conversación; la pantalla holográfica se abre aparte, sin publicar micrófono.</p>
      <div className="rounded-xl border border-cyan-400/30 bg-zinc-950 p-3 text-sm">
        <p className="font-semibold text-cyan-300">Pantalla del estudio y Sentidos</p>
        <p className="mt-1 text-zinc-400">Para recibir los Sentidos ESCUCHANDO, PENSANDO y HABLANDO, pulsa ENCENDER y después abre el enlace temporal «Abrir holograma». Los Sentidos cambian con los eventos del micrófono y la pista de voz real.</p>
        <p className="mt-2 text-zinc-400">Las fotografías de Lovable o localhost no viajan automáticamente a Vercel porque estaban guardadas en el navegador. Debes importar los perfiles en la configuración de esta dirección online o publicar sus fotos originales como recursos del proyecto.</p>
        <a href="/hologram-preview?dev=1" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-cyan-300 underline underline-offset-2">Configurar perfiles y fotografías de Bob y Lina</a>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => void start()} disabled={busy || active} className="rounded-lg bg-cyan-400 px-5 py-4 text-lg font-bold text-black disabled:opacity-40">
          {busy ? 'Conectando…' : 'ENCENDER ' + character.toUpperCase()}
        </button>
        <button onClick={() => void togglePermission()} disabled={busy || !active || !microphone || !dispatched} className="rounded-lg bg-amber-300 px-5 py-4 text-lg font-bold text-black disabled:opacity-40">{authorized ? 'VOLVER A ESPERA' : 'DAR LA PALABRA A ' + character.toUpperCase()}</button>
        <button onClick={stop} disabled={!active && !busy} className="rounded-lg border border-red-400 px-5 py-4 font-semibold text-red-300 disabled:opacity-40">FINALIZAR SESIÓN</button>
      </div>
      <p className="text-xs text-zinc-400">Al encender, la sesión se inicia con el micrófono silenciado al finalizar la conexión. DAR LA PALABRA abre el micrófono; VOLVER A ESPERA lo silencia sin desconectar la sala. FINALIZAR SESIÓN cierra el estudio. LiveKit y el agente pueden seguir generando consumo mientras permanezcan conectados.</p>
      <details className="rounded-lg border border-white/10 p-3 text-sm text-zinc-400">
        <summary className="cursor-pointer">Opciones técnicas y recuperación manual</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void enableMic()} disabled={busy || !active || microphone} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Reintentar micrófono</button>
          <button onClick={() => void dispatch()} disabled={busy || !microphone || dispatchStartedRef.current || dispatched} className="rounded border border-white/20 px-3 py-2 disabled:opacity-40">Iniciar agente manualmente</button>
        </div>
      </details>
      {displayUrl && <div className="space-y-2 rounded-lg border border-cyan-500/30 p-3">
        <p className="font-semibold">Enlace temporal para la TV vertical</p>
        <p className="text-xs text-zinc-400">Es un enlace con autorización temporal: no lo compartas públicamente. Usa la misma red o la dirección accesible del servidor. LiveKit intentará recuperar automáticamente cortes breves en esta misma sala.</p>
        <div className="flex flex-wrap gap-3">
          <button className="rounded bg-cyan-500 px-4 py-2 text-black" onClick={() => void navigator.clipboard.writeText(displayUrl)}>Copiar enlace</button>
          <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-cyan-400 px-4 py-2">Abrir holograma</a>
        </div>
      </div>}
      <p className="text-sm text-zinc-300" role="status">{status}</p>
      <p className="text-xs text-amber-300">La sala y el agente pueden generar consumo de LiveKit; apaga al terminar. Los estados LISTENING y THINKING se estiman desde la voz del estudio; no miden todavía el tiempo interno de Felencho Brain.</p>
    </section>
  </main>;
}
