"use client";

import { useEffect, useRef, useState } from "react";
import { LocalAudioTrack, Room } from "livekit-client";

type Character = "bob" | "lina";
type Connection = { serverUrl?: string; participantToken?: string; error?: string };

/**
 * Studio producer proof: publish a locally selected studio voice recording
 * as one isolated LiveKit audio track. No microphone, no avatar worker.
 * Production TTS can later feed the same MediaStreamDestination interface.
 */
export default function HologramAudioSender() {
  const [character, setCharacter] = useState<Character>("bob");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Desconectado");
  const [busy, setBusy] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const trackRef = useRef<LocalAudioTrack | null>(null);
  const urlRef = useRef<string | null>(null);
  const endingRef = useRef(false);

  async function stop() {
    if (endingRef.current) return;
    endingRef.current = true;
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    const track = trackRef.current;
    const room = roomRef.current;
    trackRef.current = null;
    if (track && room) {
      try { await room.localParticipant.unpublishTrack(track.mediaStreamTrack); } catch {}
    }
    track?.stop();
    room?.disconnect();
    roomRef.current = null;
    if (contextRef.current) { void contextRef.current.close(); contextRef.current = null; }
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    setStatus("Detenido: transmisión interrumpida");
    setBusy(false);
    endingRef.current = false;
  }
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      trackRef.current?.stop();
      roomRef.current?.disconnect();
      if (contextRef.current) void contextRef.current.close();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  async function start() {
    if (!file || busy) return;
    setBusy(true);
    try {
      // Start the sound graph in the button's activation gesture.
      const ctx = new AudioContext();
      contextRef.current = ctx;
      await ctx.resume();
      const response = await fetch("/api/hologram-stage/live-token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character, role: "director" }), credentials: "same-origin",
      });
      const auth: Connection = await response.json();
      if (!response.ok || !auth.serverUrl || !auth.participantToken)
        throw new Error(auth.error || "No hay autorización para dirigir el audio");
      const room = new Room();
      await room.connect(auth.serverUrl, auth.participantToken);
      roomRef.current = room;
      const audio = new Audio();
      audioRef.current = audio;
      audio.src = URL.createObjectURL(file);
      urlRef.current = audio.src;
      audio.preload = "auto";
      const source = ctx.createMediaElementSource(audio);
      const stream = ctx.createMediaStreamDestination();
      source.connect(stream);
      // Do not play this audio through the director's default speakers.
      // Studio's RØDECaster will handle the independent broadcast monitor path.
      const track = new LocalAudioTrack(stream.stream.getAudioTracks()[0]);
      trackRef.current = track;
      await room.localParticipant.publishTrack(track, { name: "hologram-voice-" + character });
      await ctx.resume();
      audio.onended = () => void stop();
      await audio.play();
      setStatus("Enviando voz de " + character.toUpperCase() + " a la pantalla");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo iniciar el audio");
      await stop();
      setStatus(error instanceof Error ? error.message : "No se pudo iniciar el audio");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#050b1c] p-6 text-white">
      <section className="mx-auto max-w-xl space-y-5 rounded-2xl border border-cyan-700 bg-[#101b32] p-6">
        <h1 className="text-2xl font-bold">Felencho Mundial · Enlace de voz</h1>
        <p className="text-sm text-slate-300">Prueba privada: envía un audio desde Studio Control a la TV independiente de Bob o Lina.
          No activa micrófonos ni proveedores de voz. Las páginas necesitan una sesión de estudio autorizada.</p>
        <label className="block">Personaje
          <select value={character} disabled={busy || !!roomRef.current} onChange={e=>setCharacter(e.target.value as Character)}
            className="mt-2 block w-full rounded bg-slate-800 p-3">
            <option value="bob">Bob</option><option value="lina">Lina</option>
          </select>
        </label>
        <label className="block">Grabación de voz (prueba)
          <input type="file" accept="audio/*" disabled={busy || !!roomRef.current} onChange={e=>setFile(e.target.files?.[0] || null)}
            className="mt-2 block w-full text-sm" />
        </label>
        <div className="flex flex-wrap gap-3">
          <button disabled={!file || busy} onClick={()=>void start()}
            className="rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-black disabled:opacity-40">Enviar voz a la TV</button>
          <button onClick={()=>void stop()} className="rounded-lg bg-red-700 px-5 py-3">Interrumpir ahora</button>
        </div>
        <div role="status" className="text-cyan-200">{status}</div>
        <p className="text-xs text-amber-200">Esta página es un puente experimental de audio, no una conexión todavía activa con Felencho Brain ni una salida verificada a la RØDECaster.</p>
      </section>
    </main>
  );
}
