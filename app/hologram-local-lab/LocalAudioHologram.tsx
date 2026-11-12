'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrack } from 'livekit-client';
import { hologram } from '../../src/hologram/engine';
import { characters } from '../../src/hologram-config';

type Persona = 'lina' | 'bob';
const Lina = dynamic(() => import('../../src/hologram/LinaScreen').then(m => m.LinaScreen), { ssr: false });
const Bob = dynamic(() => import('../../src/hologram/BobScreen').then(m => m.BobScreen), { ssr: false });
type Session = { room: Room; ctx: AudioContext; source?: MediaStreamAudioSourceNode; frame?: number; dispose: () => void };
const silent = { level: 0, bass: 0, mids: 0, treble: 0 };

/** Explicitly local audio-only experiment. The control strip is NOT for the TVs. */
export default function LocalAudioHologram({ persona }: { persona: Persona }) {
  const [status, setStatus] = useState('Listo para conectar con LiveKit local');
  const [connected, setConnected] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const personaRef = useRef(persona);
  personaRef.current = persona;
  const disconnect = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setConnected(false);
    setSpeaking(false);
    setStatus('Desconectado');
  }, []);
  useEffect(() => () => { sessionRef.current?.dispose(); sessionRef.current = null; }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current) return;
    setStatus('Conectando...');
    // Browser audio must be unlocked synchronously from this user click.
    const ctx = new AudioContext();
    void ctx.resume();
    const room = new Room({adaptiveStream: true});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.55;
    const muted = ctx.createGain();
    muted.gain.value = 0; // TV previews never play sound or cause echo.
    analyser.connect(muted);
    muted.connect(ctx.destination);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let finished = false, lastSpeech = 0, hadAudio = false, speakingNow = false;
    let subscribedTrack: string | null = null;
    const session: Session = {
      room, ctx,
      dispose: () => {
        if (finished) return;
        finished = true;
        if (session.frame !== undefined) cancelAnimationFrame(session.frame);
        session.source?.disconnect();
        hologram.pushAudio(silent);
        hologram.setState('idle');
        room.disconnect();
        void ctx.close().catch(() => {});
      },
    };
    sessionRef.current = session;
    const expected = persona === 'bob' ? 'bob-' : 'serena-';
    const tick = () => {
      if (finished) return;
      analyser.getByteFrequencyData(bins);
      const band = (low: number, high: number) => {
        const step = ctx.sampleRate / analyser.fftSize;
        const start = Math.max(0, Math.min(bins.length - 1, Math.floor(low / step)));
        const end = Math.max(start + 1, Math.min(bins.length, Math.ceil(high / step)));
        let sum = 0;
        for (let i = start; i < end; i++) sum += bins[i];
        return Math.min(1, sum / (end - start) / 180);
      };
      const bass = band(80, 300), mids = band(300, 2400), treble = band(2400, 7500);
      const level = Math.min(1, 0.2*bass + 0.55*mids + 0.25*treble);
      hologram.pushAudio({level,bass,mids,treble});
      if (hadAudio && level > 0.045) {
        lastSpeech = performance.now();
        if (!speakingNow) { speakingNow = true; hologram.setState('speaking'); setSpeaking(true); }
      } else if (speakingNow && performance.now() - lastSpeech > 550) {
        speakingNow = false;
        hologram.setState('idle');
        setSpeaking(false);
      }
      session.frame = requestAnimationFrame(tick);
    };
    const receive = (track: RemoteTrack, publication: {trackName?: string}, participant: RemoteParticipant) => {
      if (track.kind !== Track.Kind.Audio || !participant.identity.startsWith('a-')) return;
      if (!publication.trackName?.startsWith(expected)) return;
      session.source?.disconnect();
      session.source = ctx.createMediaStreamSource(new MediaStream([track.mediaStreamTrack]));
      session.source.connect(analyser);
      subscribedTrack = track.sid ?? null;
      hadAudio = true;
      setStatus('Recibiendo '+persona.toUpperCase()+' por LiveKit · '+publication.trackName);
      if (session.frame === undefined) session.frame = requestAnimationFrame(tick);
    };
    room.on(RoomEvent.TrackSubscribed, receive);
    room.on(RoomEvent.TrackUnsubscribed, track => {
      if (track.sid !== subscribedTrack) return;
      session.source?.disconnect(); session.source = undefined;
      subscribedTrack = null; hadAudio = false; speakingNow = false;
      hologram.pushAudio(silent); hologram.setState('idle'); setSpeaking(false);
      setStatus('Pista terminada. Esperando otra frase de '+persona.toUpperCase());
    });
    room.on(RoomEvent.Disconnected, () => {
      if (finished) return;
      session.dispose();
      sessionRef.current = null;
      setConnected(false); setSpeaking(false);
      setStatus('Sala desconectada. Pulsa Conectar para reintentar.');
    });
    try {
      const response = await fetch('/api/hologram-local-token?persona='+persona, {cache:'no-store'});
      const credentials = await response.json() as {server?: string; token?: string; error?: string};
      if (!response.ok || !credentials.token || credentials.server !== 'ws://127.0.0.1:7880') {
        throw new Error(credentials.error ?? 'Token LiveKit local no disponible');
      }
      hologram.setSimulator(false);
      hologram.setState('idle');
      await room.connect(credentials.server, credentials.token);
      if (finished) return;
      setConnected(true);
      setStatus('Conectado. Pulsa Transmitir frase nueva '+persona.toUpperCase()+' en la pestaña A del laboratorio 7890.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo conectar';
      session.dispose(); sessionRef.current = null;
      setConnected(false); setSpeaking(false);
      setStatus('Error: '+msg);
    }
  }, [persona]);

  return <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
    {persona === 'bob' ? <Bob config={characters.bob} storage="local" /> : <Lina config={characters.lina} storage="local" />}
    <aside className="fixed bottom-3 left-3 right-3 z-30 mx-auto max-w-xl rounded-lg border border-cyan-500/50 bg-black/90 p-3 text-xs text-white">
      <strong>{persona.toUpperCase()} · LABORATORIO LOCAL · {speaking ? 'SPEAKING' : 'IDLE'}</strong>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={connected} onClick={() => void connect()} className="rounded bg-cyan-500 px-3 py-2 text-black disabled:opacity-40">Conectar</button>
        <button type="button" disabled={!connected} onClick={disconnect} className="rounded border px-3 py-2 disabled:opacity-40">Desconectar</button>
      </div>
      <p className="mt-2" role="status">{status}</p>
      <p className="mt-1 text-zinc-400">Sin micrófono, sin audio en esta pantalla. Control de pruebas solamente; no es la ruta final para TV.</p>
    </aside>
  </main>;
}
