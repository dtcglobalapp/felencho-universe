'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteParticipant } from 'livekit-client';
import { hologram, type Persona } from './engine';

/**
 * Audio-only display bridge. The hologram is native Three.js; we never wait
 * for or subscribe to hosted avatar video. Studio audio can remain muted on TV
 * clients while their spectral analysis drives each character's rings.
 *
 * Security: the LiveKit room token is read from URL fragment (never query
 * parameters, server logs, or analytics). It is discarded after mounting.
 * Join is explicitly user-initiated so browsers can unlock AudioContext.
 */
export function LiveKitAudioBridge({ persona }: { persona: Persona }) {
  const [status, setStatus] = useState('Desconectado');
  const [connected, setConnected] = useState(false);
  const [monitor, setMonitor] = useState(false);
  const [config, setConfig] = useState<{ server: string; token: string } | null>(null);
  const roomRef = useRef<Room | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const didReceiveAudio = useRef(false);
  const requestedState = useRef<'idle' | 'listening' | 'thinking'>('idle');
  const speakingRef = useRef(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const server = fragment.get('server');
    const token = fragment.get('token');
    if (server && token && /^wss:\/\//.test(server)) {
      setConfig({ server, token });
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
      setStatus('Falta el enlace de audio con token LiveKit de esta sala.');
    }
    return () => { disposeRef.current?.(); };
  }, []);

  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = monitor ? 1 : 0; }, [monitor]);

  const disconnect = useCallback(() => {
    disposeRef.current?.();
    disposeRef.current = null;
    setConnected(false);
    setStatus('Desconectado');
  }, []);

  const connect = useCallback(async () => {
    if (!config || roomRef.current) return;
    setStatus('Conectando al audio de ' + persona.toUpperCase() + '…');
    let disposed = false;
    const room = new Room({ adaptiveStream: true });
    roomRef.current = room;
    const ctx = new AudioContext();
    contextRef.current = ctx;
    // Must happen on the click before asynchronous room connection.
    void ctx.resume().catch(() => {});
    const gain = ctx.createGain();
    gain.gain.value = monitor ? 1 : 0;
    gain.connect(ctx.destination);
    gainRef.current = gain;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    analyser.connect(gain);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let lastSpeech = 0;
    speakingRef.current = false;
    requestedState.current = 'idle';

    const animate = () => {
      if (disposed) return;
      analyser.getByteFrequencyData(bins);
      // Frequencies based on the actual AudioContext sample rate.
      const band = (fromHz: number, toHz: number) => {
        const hzPerBin = ctx.sampleRate / analyser.fftSize;
        const start = Math.min(bins.length - 1, Math.max(0, Math.floor(fromHz / hzPerBin)));
        const end = Math.min(bins.length, Math.max(start + 1, Math.ceil(toHz / hzPerBin)));
        let total = 0;
        for (let i = start; i < end; i++) total += bins[i];
        return Math.min(1, total / (end - start) / 180);
      };
      const bass = band(80, 300);
      const mids = band(300, 2400);
      const treble = band(2400, 7500);
      const level = Math.min(1, 0.2 * bass + 0.55 * mids + 0.25 * treble);
      hologram.pushAudio({ level, bass, mids, treble });
      if (didReceiveAudio.current && level > 0.055) {
        lastSpeech = performance.now();
        speakingRef.current = true;
        if (hologram.state !== 'speaking') hologram.setState('speaking');
      } else if (speakingRef.current && performance.now() - lastSpeech > 700) {
        speakingRef.current = false;
        hologram.setState(requestedState.current);
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    const attach = (track: RemoteTrack, _publication: unknown, participant: RemoteParticipant) => {
      if (track.kind !== Track.Kind.Audio) return;
      // Display-only rooms: remote voice must belong to a worker/agent, never
      // feed a studio microphone or another display back into the hologram.
      if (participant.identity.startsWith('studio-') || participant.identity.startsWith('display-')) return;
      const element = track.attach() as HTMLAudioElement;
      element.autoplay = false; // WebAudio is the only playback path.
      element.muted = false;
      element.style.display = 'none';
      document.body.appendChild(element);
      mediaRef.current = element;
      const source = ctx.createMediaElementSource(element);
      source.connect(analyser);
      didReceiveAudio.current = true;
      setStatus('Audio recibido de ' + participant.identity + ' · holograma reactivo');
      void element.play().catch(() => setStatus('Audio conectado. Pulsa Conectar otra vez si el navegador bloquea reproducción.'));
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(animate);
    };
    const onDisconnect = () => {
      if (!disposed) {
        hologram.setState('sleep');
        setConnected(false);
        setStatus('La sala de audio terminó.');
      }
    };
    // A data event from the studio can represent only what was actually
    // observed: microphone activity or a pause (estimated thinking).
    // Never claim to know Felencho Brain's internal processing state.
    room.on(RoomEvent.DataReceived, (payload, participant) => {
      if (!participant?.identity.startsWith('studio-')) return;
      let message: { source?: string; character?: string; state?: string };
      try { message = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (message.source !== 'felencho-studio' || message.character !== persona) return;
      if (message.state !== 'idle' && message.state !== 'listening' && message.state !== 'thinking') return;
      requestedState.current = message.state;
      if (!speakingRef.current) hologram.setState(message.state);
    });
    room.on(RoomEvent.TrackSubscribed, attach);
    room.on(RoomEvent.Disconnected, onDisconnect);
    disposeRef.current = () => {
      if (disposed) return;
      disposed = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      hologram.pushAudio({ level: 0, bass: 0, mids: 0, treble: 0 });
      hologram.setState('sleep');
      didReceiveAudio.current = false;
      speakingRef.current = false;
      requestedState.current = 'idle';
      mediaRef.current?.pause();
      mediaRef.current?.remove();
      mediaRef.current = null;
      room.disconnect();
      roomRef.current = null;
      void ctx.close().catch(() => {});
      contextRef.current = null;
      gainRef.current = null;
    };
    try {
      hologram.setPersona(persona);
      hologram.setSimulator(false);
      hologram.setState('idle');
      await room.connect(config.server, config.token);
      if (disposed) return;
      setConnected(true);
      setStatus('Conectado. Esperando audio del agente ' + persona.toUpperCase() + '…');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo conectar';
      disposeRef.current?.();
      setStatus(message);
      setConnected(false);
    }
  }, [config, monitor, persona]);

  return <aside className="fixed bottom-3 left-3 right-3 z-20 mx-auto max-w-xl rounded-xl border border-white/20 bg-black/85 p-3 text-xs text-white backdrop-blur">
    <div className="flex flex-wrap items-center gap-3">
      <strong>{persona.toUpperCase()} · LiveKit audio</strong>
      <button type="button" disabled={!config || connected} onClick={() => void connect()} className="rounded bg-cyan-500 px-3 py-2 font-semibold text-black disabled:opacity-50">Conectar</button>
      <button type="button" disabled={!connected} onClick={disconnect} className="rounded border border-white/30 px-3 py-2 disabled:opacity-50">Desconectar</button>
      <label className="ml-auto flex items-center gap-2">
        <input type="checkbox" checked={monitor} onChange={e => setMonitor(e.target.checked)} />
        Escuchar en este equipo
      </label>
    </div>
    <p className="mt-2 text-zinc-300" role="status">{status}</p>
    <p className="mt-1 text-zinc-500">Los estados se actualizan desde el micrófono del estudio y la pista Cartesia; THINKING es una estimación, SPEAKING se detecta por audio. Esta pantalla no publica micrófono ni inicia agentes. Audio silenciado por defecto.</p>
  </aside>;
}
