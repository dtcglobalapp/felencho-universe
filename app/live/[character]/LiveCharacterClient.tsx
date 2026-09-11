"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
} from "livekit-client";

type Character = "lina" | "bob";

type SessionResponse = {
  serverUrl?: string;
  participantToken?: string;
  character?: Character;
  error?: string;
};

export default function LiveCharacterClient({ character }: { character: Character }) {
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [message, setMessage] = useState("");

  const displayName = character === "lina" ? "Lina" : "Bob";

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  function attachTrack(
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    _participant: RemoteParticipant,
  ) {
    if (track.kind === Track.Kind.Video && videoRef.current) {
      const element = track.attach() as HTMLVideoElement;
      element.autoplay = true;
      element.playsInline = true;
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.objectFit = "contain";
      element.style.background = "black";
      videoRef.current.innerHTML = "";
      videoRef.current.appendChild(element);
    }

    if (track.kind === Track.Kind.Audio && audioRef.current) {
      const element = track.attach() as HTMLAudioElement;
      element.autoplay = true;
      element.setAttribute("playsinline", "true");
      audioRef.current.appendChild(element);
      element.play().catch(() => undefined);
    }
  }

  async function startSession() {
    if (status === "connecting" || status === "connected") return;

    setStatus("connecting");
    setMessage(`Conectando con ${displayName}...`);

    try {
      const response = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character }),
      });

      const data = (await response.json()) as SessionResponse;
      if (!response.ok || !data.serverUrl || !data.participantToken) {
        throw new Error(data.error || "No se pudo crear la sesión.");
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, attachTrack);
      room.on(RoomEvent.Disconnected, () => {
        setStatus("idle");
        setMessage("Sesión cerrada.");
      });

      await room.connect(data.serverUrl, data.participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus("connected");
      setMessage(`${displayName} está conectado. Puedes hablarle.`);
    } catch (error) {
      console.error(`[live/${character}]`, error);
      roomRef.current?.disconnect();
      roomRef.current = null;
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar la sesión.");
    }
  }

  async function endSession() {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    if (videoRef.current) videoRef.current.innerHTML = "";
    if (audioRef.current) audioRef.current.innerHTML = "";
    setStatus("idle");
    setMessage("Sesión cerrada.");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center p-4 md:p-8">
        <div className="mb-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
            Felencho Universe · Live Studio
          </div>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">{displayName}</h1>
        </div>

        <section className="relative w-full max-w-[720px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl">
          <div ref={videoRef} className="aspect-[2/3] w-full bg-black" />

          {status !== "connected" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
              <button
                onClick={startSession}
                disabled={status === "connecting"}
                className="rounded-full bg-white px-8 py-4 text-lg font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
              >
                {status === "connecting" ? `Conectando con ${displayName}...` : `Entrar con ${displayName}`}
              </button>
            </div>
          )}
        </section>

        <div ref={audioRef} className="hidden" />

        <div className="mt-5 flex min-h-12 items-center gap-4 text-center text-sm text-zinc-300">
          <span className={status === "connected" ? "text-emerald-300" : status === "error" ? "text-red-300" : "text-zinc-400"}>
            {message || `Pulsa para iniciar una sesión privada con ${displayName}.`}
          </span>
        </div>

        {status === "connected" && (
          <button
            onClick={endSession}
            className="mt-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </main>
  );
}
