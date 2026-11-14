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
  const [diagnostic, setDiagnostic] = useState('Esperando pistas');
  const [audioLevel, setAudioLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [audioFrames, setAudioFrames] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const personaRef = useRef(persona);
  personaRef.current = persona;
  const [wakeStatus, setWakeStatus] = useState('Puente de escucha local: desconectado');
  const sleepingRef = useRef(false);
  // Local lab only: listen for events from the isolated RODECaster/Whisper process.
  // Existing LiveKit SPEAKING events always take priority.
  useEffect(() => {
    if (window.location.hostname !== '127.0.0.1' && window.location.hostname !== 'localhost') return;
    const events = new EventSource('http://127.0.0.1:7891/events?persona=' + persona);
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    events.onopen = () => setWakeStatus('Puente de escucha conectado');
    events.onerror = () => setWakeStatus('Puente de escucha desconectado (inicia puerto 7891)');
    events.onmessage = (event: MessageEvent<string>) => {
      let message: {target?: string; action?: string};
      try { message = JSON.parse(event.data) as typeof message; } catch { return; }
      if (message.target !== persona) return;
      if (message.action === 'SLEEP') {
        if (idleTimer) clearTimeout(idleTimer);
        sleepingRef.current = true;
        hologram.setState('sleep');
        setWakeStatus(persona.toUpperCase() + ' en reposo · di su nombre para despertar');
        return;
      }
      if (message.action !== 'LISTENING') return;
      if (hologram.state === 'speaking' && !sleepingRef.current) return;
      if (idleTimer) clearTimeout(idleTimer);
      sleepingRef.current = false;
      hologram.setState('listening');
      setWakeStatus('Te escucho: ' + persona.toUpperCase() + ' (deteccion local, sin respuesta IA)');
      idleTimer = setTimeout(() => {
        if (hologram.state === 'listening') hologram.setState('idle');
        setWakeStatus('Puente de escucha conectado · esperando nombre');
      }, 3500);
    };
    return () => {
      events.close();
      if (idleTimer) clearTimeout(idleTimer);
      if (hologram.state === 'listening') hologram.setState('idle');
    };
  }, [persona]);
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
    setDiagnostic('Esperando pistas'); setAudioLevel(0); setPeakLevel(0); setAudioFrames(0);
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
    const waveform = new Float32Array(analyser.fftSize);
    let peak = 0, detectedFrames = 0;
    let finished = false, lastSpeech = 0, hadAudio = false, speakingNow = false, lastMeter = 0;
    let subscribedTrack: string | null = null;
    let mediaTrack: MediaStreamTrack | null = null;
    let lastAudioDiagnostic = 'Aún no se ha analizado audio';
    let lastAcceptedName = '';
    const session: Session = {
      room, ctx,
      dispose: () => {
        if (finished) return;
        finished = true;
        if (session.frame !== undefined) cancelAnimationFrame(session.frame);
        session.source?.disconnect();
        mediaTrack = null;
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
      analyser.getFloatTimeDomainData(waveform);
      let energy = 0;
      for (let i = 0; i < waveform.length; i++) energy += waveform[i] * waveform[i];
      const rms = Math.sqrt(energy / waveform.length);
      const band = (low: number, high: number) => {
        const step = ctx.sampleRate / analyser.fftSize;
        const start = Math.max(0, Math.min(bins.length - 1, Math.floor(low / step)));
        const end = Math.max(start + 1, Math.min(bins.length, Math.ceil(high / step)));
        let sum = 0;
        for (let i = start; i < end; i++) sum += bins[i];
        return Math.min(1, sum / (end - start) / 180);
      };
      const bass = band(80, 300), mids = band(300, 2400), treble = band(2400, 7500);
      const level = Math.min(1, 0.2*bass + 0.55*mids + 0.25*treble + rms * 1.5);
      if (rms > 0.002) detectedFrames++;
      peak = Math.max(peak, level);
      hologram.pushAudio({level,bass,mids,treble});
      if (performance.now() - lastMeter > 200) {
        setAudioLevel(Math.round(level * 100)); setPeakLevel(Math.round(peak * 100));
        setAudioFrames(detectedFrames);
        if (mediaTrack) {
          lastAudioDiagnostic = 'audio: '+mediaTrack.readyState+' / '+(mediaTrack.enabled?'habilitado':'deshabilitado')+' / '+(mediaTrack.muted?'silenciado':'sin silenciar')+' · AudioContext: '+ctx.state+' · RMS: '+rms.toFixed(5);
          if (detectedFrames === 0) setDiagnostic('Analizando '+lastAcceptedName+' · '+lastAudioDiagnostic);
        }
        lastMeter = performance.now();
      }
      if (hadAudio && level > 0.018) {
        lastSpeech = performance.now();
        if (!speakingNow) { speakingNow = true; hologram.setState('speaking'); setSpeaking(true); }
      } else if (!hadAudio && speakingNow && performance.now() - lastSpeech > 850) {
        speakingNow = false;
        hologram.setState('idle');
        setSpeaking(false);
      }
      session.frame = requestAnimationFrame(tick);
    };
    const receive = (track: RemoteTrack, publication: {trackName?: string; name?: string}, participant: RemoteParticipant) => {
      if (finished || track.kind !== Track.Kind.Audio) return;
      const name = publication.trackName ?? publication.name ?? '';
      const who = participant.identity;
      // Only show measurements for this character's dedicated A audio track.
      // Other characters' tracks are intentionally ignored without overwriting diagnostics.
      if (!who.startsWith('a-') || !name.startsWith(expected) || sleepingRef.current) return;
      session.source?.disconnect();
      mediaTrack = track.mediaStreamTrack;
      session.source = ctx.createMediaStreamSource(new MediaStream([mediaTrack]));
      session.source.connect(analyser);
      subscribedTrack = track.sid ?? null;
      lastAcceptedName = name;
      lastAudioDiagnostic = 'Esperando primeras muestras · AudioContext: '+ctx.state;
      hadAudio = true;
      peak = 0; detectedFrames = 0;
      setPeakLevel(0); setAudioFrames(0);
      // The WAV is published immediately before playback and is unpublished on completion.
      // Mark SPEAKING on its own named voice track, even if frequency bins take
      // a moment to become available or the browser suspends its AudioContext.
      speakingNow = true; lastSpeech = performance.now();
      hologram.setState('speaking'); setSpeaking(true);
      setStatus('Recibiendo '+persona.toUpperCase()+' por LiveKit · '+name);
      setDiagnostic('Pista compatible recibida · '+name+' · AudioContext: '+ctx.state);
      void ctx.resume().catch(() => setDiagnostic('AudioContext bloqueado; vuelve a pulsar Conectar'));
      if (session.frame === undefined) session.frame = requestAnimationFrame(tick);
    };
    room.on(RoomEvent.TrackSubscribed, receive);
    room.on(RoomEvent.TrackUnsubscribed, track => {
      if (track.sid !== subscribedTrack) return;
      session.source?.disconnect(); session.source = undefined;
      mediaTrack = null;
      subscribedTrack = null; hadAudio = false; speakingNow = false;
      hologram.pushAudio(silent); hologram.setState('idle'); setSpeaking(false);
      setStatus('Pista terminada. Esperando otra frase de '+persona.toUpperCase());
      setDiagnostic('Terminó '+lastAcceptedName+' · pico '+Math.round(peak*100)+'% · frames con sonido '+detectedFrames+' · '+lastAudioDiagnostic); setAudioLevel(0);
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
      setDiagnostic('Conectado a la sala; esperando pista '+expected+'...');
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
      <p className="mt-1 text-cyan-300">Diagnóstico: {diagnostic}</p>
      <p className="mt-1 text-amber-300">{wakeStatus}</p>
      <p className="mt-1 text-cyan-300">Audio real: {audioLevel}% · Pico: {peakLevel}% · Frames con sonido: {audioFrames}</p>
      <div aria-label="Nivel de audio real" className="mt-1 h-2 overflow-hidden rounded bg-zinc-700"><div className="h-full bg-cyan-400 transition-[width] duration-150" style={{width: audioLevel + '%'}} /></div>
      <p className="mt-1 text-zinc-400">Sin micrófono, sin audio en esta pantalla. Control de pruebas solamente; no es la ruta final para TV.</p>
    </aside>
  </main>;
}
